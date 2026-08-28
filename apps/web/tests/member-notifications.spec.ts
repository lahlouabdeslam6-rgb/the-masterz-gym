import { expect, test } from "@playwright/test";

const member = {
  id: "00000000-0000-0000-0000-000000000310",
  full_name: "Membre Notification",
  phone: "+212600000310",
  email: "notification@masterz.test",
  date_of_birth: null,
  gender: "male",
  role: "member",
  status: "active",
  member_number: "TMG-NOTIFICATION",
  created_at: "2026-08-21T10:00:00Z",
  updated_at: "2026-08-21T10:00:00Z",
};

test("garde les anciennes notifications lues et affiche seulement les nouvelles", async ({
  page,
}) => {
  let readAt: string | null = null;
  let newNotificationVisible = false;
  let allowNewNotificationRead = false;
  let newReadAt: string | null = null;
  let markAllCalls = 0;
  let unreadFetchCalls = 0;
  let lastUnreadCount = 0;
  const notificationId = "00000000-0000-0000-0000-000000000311";
  const newNotificationId = "00000000-0000-0000-0000-000000000312";

  function notification() {
    return {
      id: notificationId,
      kind: "recovery_pack_exhausted",
      title: "Vos seances Recovery sont terminees",
      body: "Vous avez utilise la derniere seance de votre pack Recovery 4 seances. Contactez la reception pour le renouveler.",
      read_at: readAt,
      created_at: "2026-08-21T10:00:00Z",
    };
  }

  function newNotification() {
    return {
      id: newNotificationId,
      kind: "complaint_updated",
      title: "Votre reclamation a recu une reponse",
      body: "La reception a repondu a votre reclamation.",
      read_at: newReadAt,
      created_at: "2026-08-21T11:00:00Z",
    };
  }

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/api/v1/users/me") body = member;
    if (url.pathname === "/api/v1/notifications") {
      const unreadOnly = url.searchParams.get("unread_only") === "true";
      const notifications = [
        notification(),
        ...(newNotificationVisible ? [newNotification()] : []),
      ];
      body = unreadOnly
        ? notifications.filter((item) => !item.read_at)
        : notifications;
      if (unreadOnly) {
        unreadFetchCalls += 1;
        lastUnreadCount = (body as unknown[]).length;
      }
    }
    if (
      url.pathname === "/api/v1/notifications/read-all" &&
      route.request().method() === "PATCH"
    ) {
      markAllCalls += 1;
      readAt = "2026-08-21T10:05:00Z";
      if (newNotificationVisible && allowNewNotificationRead) {
        newReadAt = "2026-08-21T11:05:00Z";
      }
      body = { marked_read: newNotificationVisible ? 2 : 1 };
    }
    if (url.pathname === `/api/v1/recovery/members/${member.id}`) {
      body = {
        member_id: member.id,
        member_name: member.full_name,
        member_number: member.member_number,
        subscriptions: [],
        visits: [],
      };
    }
    if (url.pathname === `/api/v1/coaching/members/${member.id}/tracking`) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          detail: { code: "tracking_not_found", message: "Introuvable." },
        }),
      });
      return;
    }
    if (url.pathname === "/api/v1/coaching/my-assignment") {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          detail: { code: "assignment_not_found", message: "Introuvable." },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await page.goto("/");
  await page.evaluate((user) => {
    window.localStorage.setItem("access_token", "member-access-token");
    window.localStorage.setItem("refresh_token", "member-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, member);

  await page.goto("/espace/membre");
  await expect(page.getByTestId("navigation-badge-notifications")).toHaveText(
    "1",
  );
  await expect(page.getByTestId("navigation-badge-recovery")).toHaveText("1");
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(page.getByTestId("navigation-badge-notifications")).toHaveCount(
    0,
  );
  await expect(page.getByTestId("navigation-badge-recovery")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Mes notifications" }),
  ).toBeVisible();
  await expect(
    page.getByText("Vos seances Recovery sont terminees", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0 non lue(s)", { exact: true })).toBeVisible();
  expect(markAllCalls).toBeGreaterThanOrEqual(1);

  await page
    .getByText("Vos seances Recovery sont terminees", { exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mon pack recovery" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Marquer comme lue" }),
  ).toHaveCount(0);
  await expect(page.getByTestId("navigation-badge-notifications")).toHaveCount(
    0,
  );
  await expect(page.getByTestId("navigation-badge-recovery")).toHaveCount(0);

  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(page.getByTestId("navigation-badge-notifications")).toHaveCount(
    0,
  );
  await expect(page.getByText("0 non lue(s)", { exact: true })).toBeVisible();

  newNotificationVisible = true;
  const unreadFetchCallsBeforeNewNotification = unreadFetchCalls;
  await page.getByRole("button", { name: "Coaching", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Coaching", exact: true }),
  ).toBeVisible();
  const markAllCallsBeforeNewNotification = markAllCalls;
  await expect
    .poll(() => unreadFetchCalls)
    .toBeGreaterThan(unreadFetchCallsBeforeNewNotification);
  expect(lastUnreadCount).toBe(1);
  await expect(page.getByTestId("navigation-badge-notifications")).toHaveText(
    "1",
  );
  await expect(page.getByTestId("navigation-badge-complaints")).toHaveText("1");

  allowNewNotificationRead = true;
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(page.getByText("0 non lue(s)", { exact: true })).toBeVisible();
  await expect(page.getByTestId("navigation-badge-notifications")).toHaveCount(
    0,
  );
  expect(markAllCalls).toBeGreaterThan(markAllCallsBeforeNewNotification);
});

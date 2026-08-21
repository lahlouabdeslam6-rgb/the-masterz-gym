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

test("affiche et marque comme lue la fin du pack recovery", async ({
  page,
}) => {
  let readAt: string | null = null;
  let markReadCalls = 0;
  const notificationId = "00000000-0000-0000-0000-000000000311";

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

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/api/v1/users/me") body = member;
    if (url.pathname === "/api/v1/notifications") body = [notification()];
    if (
      url.pathname === `/api/v1/notifications/${notificationId}/read` &&
      route.request().method() === "PATCH"
    ) {
      markReadCalls += 1;
      readAt = "2026-08-21T10:05:00Z";
      body = notification();
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
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mes notifications" }),
  ).toBeVisible();
  await expect(
    page.getByText("Vos seances Recovery sont terminees", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1 non lue(s)", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Marquer comme lue" }).click();
  await expect(page.getByText("0 non lue(s)", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Marquer comme lue" }),
  ).toHaveCount(0);
  expect(markReadCalls).toBe(1);
});

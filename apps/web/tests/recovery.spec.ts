import { expect, test } from "@playwright/test";

const receptionist = {
  id: "00000000-0000-0000-0000-000000000210",
  full_name: "Reception Recovery",
  phone: "+212600000210",
  email: "recovery@masterz.test",
  date_of_birth: null,
  gender: "female",
  role: "receptionist",
  status: "active",
  member_number: null,
  created_at: "2026-08-21T10:00:00Z",
  updated_at: "2026-08-21T10:00:00Z",
};

const member = {
  id: "00000000-0000-0000-0000-000000000220",
  name: "Membre Recovery Test",
  number: "TMG-RECOVERY-TEST",
  phone: "+212600000220",
};

test("enregistre un passage recovery et retire une seule seance", async ({
  page,
}) => {
  let remaining = 4;
  let postedBody: Record<string, unknown> | null = null;
  const visits: Array<Record<string, unknown>> = [];

  function subscription() {
    return {
      id: "00000000-0000-0000-0000-000000000230",
      plan_name: "Pack Recovery 10 seances",
      starts_on: "2026-08-01",
      ends_on: "2026-10-01",
      status: "active",
      effective_status: "active",
      total_sessions: 10,
      remaining_sessions: remaining,
      is_usable: remaining > 0,
    };
  }

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "authorization, content-type",
          "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
        },
      });
      return;
    }
    let body: unknown = [];
    if (url.pathname === "/api/v1/users/me") body = receptionist;
    if (url.pathname === "/api/v1/recovery/clients") {
      body = [
        {
          member_id: member.id,
          member_name: member.name,
          member_number: member.number,
          phone: member.phone,
          subscription: subscription(),
        },
      ];
    }
    if (url.pathname === `/api/v1/recovery/members/${member.id}`) {
      body = {
        member_id: member.id,
        member_name: member.name,
        member_number: member.number,
        subscriptions: [subscription()],
        visits,
      };
    }
    if (
      url.pathname === "/api/v1/recovery/visits" &&
      route.request().method() === "POST"
    ) {
      postedBody = route.request().postDataJSON();
      remaining -= 1;
      const visit = {
        id: "00000000-0000-0000-0000-000000000240",
        member_id: member.id,
        subscription_id: subscription().id,
        recorded_by_id: receptionist.id,
        recorded_by_name: receptionist.full_name,
        occurred_at: (postedBody as { occurred_at: string }).occurred_at,
        services: (postedBody as { services: string[] }).services,
        remaining_sessions_after: remaining,
        notes: null,
        created_at: "2026-08-21T10:00:00Z",
      };
      visits.unshift(visit);
      body = visit;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body),
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
    window.localStorage.setItem("access_token", "recovery-access-token");
    window.localStorage.setItem("refresh_token", "recovery-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, receptionist);

  await page.goto("/espace/reception/recovery");
  await expect(
    page.getByRole("heading", { name: "Recovery", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(member.name, { exact: true })).toBeVisible();
  await expect(page.getByText("4 / 10").first()).toBeVisible();

  await page.getByRole("button", { name: "Sauna" }).click();
  await page.getByRole("button", { name: "Bain froid" }).click();
  await page.getByRole("button", { name: "Compression" }).click();
  await expect(page.getByLabel("Date et heure du passage")).not.toHaveValue("");
  await page.getByRole("button", { name: "Confirmer le passage" }).click();

  await expect(
    page.getByText("Passage enregistré. 3 séance(s) restante(s)."),
  ).toBeVisible();
  await expect(page.getByText("3 / 10").first()).toBeVisible();
  const submitted = postedBody as unknown as {
    member_id: string;
    services: string[];
    occurred_at: string;
  };
  expect(submitted).toMatchObject({
    member_id: member.id,
    services: ["sauna", "cold_bath", "compression"],
  });
  expect(submitted.occurred_at).toContain("T");
});

test("explique pourquoi un passage est bloque pour un pack annule", async ({
  page,
}) => {
  const cancelledSubscription = {
    id: "00000000-0000-0000-0000-000000000250",
    plan_name: "Pack Recovery annule",
    starts_on: "2026-08-01",
    ends_on: "2026-09-01",
    status: "cancelled",
    effective_status: "cancelled",
    total_sessions: 4,
    remaining_sessions: 4,
    is_usable: false,
  };

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/api/v1/users/me") body = receptionist;
    if (url.pathname === "/api/v1/recovery/clients") {
      body = [
        {
          member_id: member.id,
          member_name: member.name,
          member_number: member.number,
          phone: member.phone,
          subscription: cancelledSubscription,
        },
      ];
    }
    if (url.pathname === `/api/v1/recovery/members/${member.id}`) {
      body = {
        member_id: member.id,
        member_name: member.name,
        member_number: member.number,
        subscriptions: [cancelledSubscription],
        visits: [],
      };
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
    window.localStorage.setItem("access_token", "recovery-access-token");
    window.localStorage.setItem("refresh_token", "recovery-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, receptionist);

  await page.goto("/espace/reception/recovery");
  await expect(page.getByText("Annule", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Ce pack est annule.*nouveau paiement Recovery/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmer le passage" }),
  ).toHaveCount(0);
});

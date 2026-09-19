import { expect, test, type Page } from "@playwright/test";

import { apiRequestUrl } from "./support/api-request";

const now = "2026-09-09T10:00:00Z";
const salle1 = "11111111-1111-4111-8111-111111111111";
const salle2 = "22222222-2222-4222-8222-222222222222";
const clubs = [salle1, salle2].map((id, index) => ({
  id,
  name: "Masterz",
  label: `Salle ${index + 1}`,
  slug: `salle-${index + 1}`,
  is_active: true,
  address: null,
}));

async function setup(
  page: Page,
  role: "member" | "coach" | "receptionist",
  options: { empty?: boolean; error?: boolean; club?: string } = {},
) {
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    full_name: "Samira Masterz",
    phone: "+212600000001",
    email: "preview@masterz.test",
    date_of_birth: null,
    gender: "female",
    role,
    status: "active",
    member_number: "TMG-DEMO",
    profile_photo_url: null,
    profile_photo_verified_at: now,
    created_at: now,
    updated_at: now,
  };
  await page.clock.setFixedTime(new Date(now));
  await page.addInitScript((account) => {
    localStorage.setItem("access_token", "overview-test-token");
    localStorage.setItem("refresh_token", "overview-test-refresh");
    localStorage.setItem("auth_user", JSON.stringify(account));
  }, user);
  const requests: URL[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const url = apiRequestUrl(route.request().url());
    requests.push(url);
    const path = url.pathname;
    let body: unknown = [];
    if (path === "/api/v1/users/me") body = user;
    else if (path === "/api/v1/clubs/my-access")
      body = {
        clubs:
          role === "receptionist"
            ? clubs.filter((club) => club.id === (options.club ?? salle1))
            : clubs,
        has_all_clubs_access: false,
      };
    else if (!options.empty) {
      if (path.endsWith("/subscriptions"))
        body = [
          {
            id: "sub-1",
            club_id: salle1,
            plan_name: "Musculation",
            service_type: "gym",
            status: "active",
            effective_status: "active",
            starts_on: "2026-09-01",
            ends_on: "2026-09-30",
            total_sessions: null,
            remaining_sessions: null,
          },
          {
            id: "sub-2",
            club_id: salle2,
            plan_name: "Pass 4 Fit",
            service_type: "gym",
            status: "active",
            effective_status: "active",
            starts_on: "2026-09-01",
            ends_on: "2026-09-30",
            total_sessions: null,
            remaining_sessions: null,
          },
        ];
      if (path.includes("/attendance/members/"))
        body = [
          {
            id: "visit-1",
            decision: "allowed",
            checked_in_at: "2026-09-08T10:00:00Z",
            club_id: salle1,
          },
          {
            id: "visit-2",
            decision: "allowed_with_warning",
            checked_in_at: "2026-09-09T08:00:00Z",
            club_id: salle2,
          },
          {
            id: "visit-denied",
            decision: "denied",
            checked_in_at: "2026-09-09T09:00:00Z",
          },
          {
            id: "visit-old",
            decision: "allowed",
            checked_in_at: "2026-08-01T10:00:00Z",
          },
        ];
      if (path === "/api/v1/store/catalog")
        body = [
          {
            id: "product-1",
            name: "Whey Test",
            description: "Produit de démonstration",
            image_url: null,
            media_urls: [],
            price: "100",
            currency: "MAD",
            available_quantity: 4,
            is_available: true,
            created_at: now,
          },
        ];
      if (path === "/api/v1/cafe/menu")
        body = [
          {
            id: "meal-1",
            name: "Bowl Healthy",
            category: "Repas",
            description: "Menu de démonstration",
            image_url: null,
            media_urls: [],
            price: "45",
            currency: "MAD",
            is_active: true,
          },
        ];
      if (path === "/api/v1/membership-applications")
        body = [
          "pending",
          "more_information_required",
          "approved",
          "converted_to_member",
          "rejected",
        ].map((status, index) => ({
          id: `request-${index}`,
          club_id: options.club ?? salle1,
          status,
          full_name: `Client ${index}`,
          created_at: "2026-09-08T10:00:00Z",
        }));
      if (path === "/api/v1/membership-plans")
        body = [
          {
            id: "plan-1",
            club_id: options.club ?? salle1,
            service_type: "gym",
            is_active: true,
          },
        ];
      if (path === "/api/v1/coaching/my-members")
        body = [
          {
            id: "assignment-1",
            member_id: "client-1",
            coach_id: user.id,
            member_name: "Adam",
            member_number: "TMG-ADAM",
          },
        ];
      if (path === "/api/v1/coaching/bookings")
        body = [
          {
            id: "booking-1",
            coach_id: user.id,
            member_name: "Adam",
            club_id: salle1,
            status: "confirmed",
            starts_at: "2026-09-10T12:00:00Z",
            ends_at: "2026-09-10T13:00:00Z",
          },
          {
            id: "booking-2",
            coach_id: user.id,
            member_name: "Sara",
            club_id: salle1,
            status: "requested",
            starts_at: "2026-09-11T12:00:00Z",
            ends_at: "2026-09-11T13:00:00Z",
          },
          {
            id: "booking-old",
            coach_id: user.id,
            status: "confirmed",
            starts_at: "2026-08-10T12:00:00Z",
          },
          {
            id: "booking-cancelled",
            coach_id: user.id,
            status: "cancelled",
            starts_at: "2026-09-11T12:00:00Z",
          },
          {
            id: "booking-other",
            coach_id: "other-coach",
            status: "confirmed",
            starts_at: "2026-09-11T12:00:00Z",
          },
        ];
      if (path === "/api/v1/collective-classes/sessions")
        body = [
          {
            id: "class-1",
            coach_id: user.id,
            club_id: salle2,
            class_name: "Circuit training",
            status: "scheduled",
            starts_at: "2026-09-12T15:00:00Z",
            ends_at: "2026-09-12T16:00:00Z",
            confirmed_count: 12,
            waitlist_count: 2,
          },
        ];
    }
    const failed =
      options.error &&
      (path === "/api/v1/coaching/bookings" ||
        path === "/api/v1/membership-applications" ||
        path.endsWith("/subscriptions"));
    await route.fulfill({
      status: failed ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(failed ? { detail: "Unavailable" } : body),
    });
  });
  await page.goto(
    `/espace/${role === "member" ? "membre" : role === "receptionist" ? "reception" : "coach"}`,
  );
  return requests;
}

for (const width of [1440, 390]) {
  test(`member sees Store and Café and real visit chart at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await setup(page, "member");
    await expect(
      page.getByRole("button", { name: "Passages cette semaine", exact: true }),
    ).toContainText("2");
    await expect(
      page.getByRole("button", { name: "Abonnements actifs", exact: true }),
    ).toContainText("2");
    await expect(
      page.getByRole("region", { name: "Mon rythme de visite" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Store & Café", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/overview-member-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Store & Café", exact: true })
      .click();
    await expect(page.getByText("Whey Test", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Healthy Café", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Bowl Healthy", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /réserver|reserver/i }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  });
}

for (const club of [salle1, salle2]) {
  test(`reception overview stays scoped to ${club}`, async ({ page }) => {
    const requests = await setup(page, "receptionist", { club });
    await expect(
      page.getByRole("region", { name: "Suivi des inscriptions" }),
    ).toContainText("5 dossier(s)");
    await expect(
      page.getByRole("link", { name: /Encaisser un paiement/ }),
    ).toHaveAttribute("href", "/espace/reception/paiements");
    for (const endpoint of [
      "/api/v1/membership-applications",
      "/api/v1/membership-plans",
    ]) {
      const scopedRequests = requests.filter(
        (url) => url.pathname === endpoint && url.searchParams.has("club_id"),
      );
      expect(scopedRequests.length).toBeGreaterThan(0);
      expect(
        scopedRequests.every((url) => url.searchParams.get("club_id") === club),
      ).toBeTruthy();
    }
    await page.screenshot({
      path: `test-results/overview-reception-${club.slice(0, 1)}.png`,
      fullPage: true,
    });
  });
}

test("coach overview counts only own upcoming sessions", async ({ page }) => {
  await setup(page, "coach");
  await expect(
    page.getByRole("button", { name: "Séances confirmées", exact: true }),
  ).toContainText("1");
  await expect(
    page.getByRole("button", { name: "Demandes à confirmer", exact: true }),
  ).toContainText("1");
  await expect(
    page.getByRole("button", { name: "Cours collectifs", exact: true }),
  ).toContainText("1");
  await expect(
    page.getByRole("region", { name: "Ma semaine en séances" }),
  ).toBeVisible();
  await expect(
    page.getByText("Circuit training", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/overview-coach.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/overview-coach-mobile.png",
    fullPage: true,
  });
});

for (const role of ["member", "coach", "receptionist"] as const) {
  test(`${role} handles an empty overview`, async ({ page }) => {
    await setup(page, role, { empty: true });
    await expect(
      page.getByRole("region", { name: "Comment utiliser mon espace" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("list", { name: "Valeurs par jour" })
        .getByRole("listitem"),
    ).toHaveCount(7);
    await expect(
      page.getByText(
        role === "member"
          ? "Aucun passage enregistré sur cette période."
          : role === "coach"
            ? /Aucune séance planifiée/
            : "Aucune nouvelle demande sur cette période.",
      ),
    ).toBeVisible();
  });
}

for (const role of ["member", "coach", "receptionist"] as const) {
  test(`${role} does not display misleading zero statistics on failure`, async ({
    page,
  }) => {
    await setup(page, role, { error: true });
    await expect(page.getByText(/indisponible/).first()).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Valeurs par jour" }),
    ).toHaveCount(0);
  });
}

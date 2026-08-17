import { expect, test } from "@playwright/test";

const plans = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    name: "Salle 1 mois",
    duration_months: 1,
    price: "300.00",
    currency: "MAD",
    service_type: "gym",
    is_active: true,
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    name: "Coaching Performance",
    duration_months: 3,
    price: "900.00",
    currency: "MAD",
    service_type: "coaching",
    is_active: true,
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    name: "Pack Recovery",
    duration_months: 1,
    price: "600.00",
    currency: "MAD",
    service_type: "recovery",
    is_active: true,
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  },
];

test("affiche chaque offre dans sa page publique", async ({ page }) => {
  await page.route("**/api/v1/membership-plans**", async (route) => {
    const serviceType = new URL(route.request().url()).searchParams.get(
      "service_type",
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(
        plans.filter((plan) => plan.service_type === serviceType),
      ),
    });
  });

  await page.goto("/abonnements");
  await expect(page.getByText("Salle 1 mois", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Coaching Performance", { exact: true }),
  ).toHaveCount(0);

  await page.goto("/coaching");
  await expect(
    page.getByText("Coaching Performance", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Salle 1 mois", { exact: true })).toHaveCount(0);

  await page.goto("/recovery");
  await expect(page.getByText("Pack Recovery", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Coaching Performance", { exact: true }),
  ).toHaveCount(0);
});

test("separe les taches de la reception en pages", async ({ page }) => {
  const receptionist = {
    id: "00000000-0000-0000-0000-000000000110",
    full_name: "Reception Masterz",
    phone: "+212600000110",
    email: "reception@masterz.test",
    date_of_birth: null,
    gender: "female",
    role: "receptionist",
    status: "active",
    member_number: null,
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  };

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/api/v1/users/me") body = receptionist;
    if (url.pathname === "/api/v1/membership-plans") body = plans;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await page.goto("/");
  await page.evaluate((user) => {
    window.localStorage.setItem("access_token", "reception-access-token");
    window.localStorage.setItem("refresh_token", "reception-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, receptionist);

  await page.goto("/espace/reception");
  await expect(
    page.getByRole("heading", { name: "Bonjour, Reception." }),
  ).toBeVisible();

  const navigation = page.getByRole("navigation", {
    name: "Navigation reception",
  });
  await expect(
    navigation.getByRole("link", { name: "Demandes" }),
  ).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Membres" })).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Paiements" }),
  ).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Entrees" })).toBeVisible();

  await navigation.getByRole("link", { name: "Paiements" }).click();
  await expect(page).toHaveURL(/\/espace\/reception\/paiements$/);
  await expect(
    page.getByRole("heading", { name: "Paiements", exact: true }),
  ).toBeVisible();

  await navigation.getByRole("link", { name: "Entrees" }).click();
  await expect(page).toHaveURL(/\/espace\/reception\/acces$/);
  await expect(
    page.getByRole("heading", { name: "Entrees", exact: true }),
  ).toBeVisible();
});

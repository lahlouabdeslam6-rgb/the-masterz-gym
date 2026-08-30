import { expect, test } from "@playwright/test";

const admin = {
  id: "00000000-0000-0000-0000-000000000201",
  full_name: "Admin Promotions",
  phone: "+212600000201",
  email: "admin.promotions@masterz.test",
  date_of_birth: null,
  gender: null,
  role: "admin",
  status: "active",
  member_number: null,
  created_at: "2026-08-25T09:00:00Z",
  updated_at: "2026-08-25T09:00:00Z",
};

const plan = {
  id: "00000000-0000-0000-0000-000000000202",
  name: "12 mois",
  duration_months: 12,
  price: "2000.00",
  currency: "MAD",
  service_type: "gym",
  session_count: null,
  is_active: true,
  created_at: "2026-08-25T09:00:00Z",
  updated_at: "2026-08-25T09:00:00Z",
};

const promotion = {
  id: "00000000-0000-0000-0000-000000000203",
  title: "Offre Duo Masterz",
  slug: "offre-duo-masterz",
  short_description: "Deux personnes, une annee, un prix special.",
  description:
    "Profitez de l'abonnement annuel Masterz a deux avec un prix special.",
  base_plan_id: plan.id,
  base_plan_name: plan.name,
  price: "3000.00",
  currency: "MAD",
  participant_count: 2,
  starts_at: "2026-08-20T00:00:00Z",
  ends_at: "2026-09-30T23:59:00Z",
  terms: "Les deux adhesions sont finalisees ensemble a la Reception.",
  is_active: true,
  is_featured: true,
  created_by_id: admin.id,
  updated_by_id: admin.id,
  created_at: "2026-08-25T09:00:00Z",
  updated_at: "2026-08-25T09:00:00Z",
};

test("permet a l'Admin de creer et mettre en avant une promotion", async ({
  page,
}) => {
  let promotions: (typeof promotion)[] = [];
  let submitted: Record<string, unknown> | null = null;

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
    let status = 200;
    if (url.pathname === "/api/v1/users/me") body = admin;
    if (url.pathname === "/api/v1/membership-plans") body = [plan];
    if (url.pathname === "/api/v1/admin/promotions") {
      if (route.request().method() === "POST") {
        submitted = route.request().postDataJSON();
        promotions = [promotion];
        body = promotion;
        status = 201;
      } else {
        body = promotions;
      }
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await page.goto("/");
  await page.evaluate((user) => {
    window.localStorage.setItem("access_token", "admin-access-token");
    window.localStorage.setItem("refresh_token", "admin-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, admin);
  await page.goto("/espace/admin/promotions");

  await expect(
    page.getByRole("heading", { name: "Promotions", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Titre de l'offre").fill("Offre Duo Masterz");
  await page
    .getByLabel("Texte court du banner")
    .fill("Deux personnes, une annee, un prix special.");
  await page.getByLabel("Prix special").fill("3000");
  await page.getByLabel("Nombre de personnes").fill("2");
  await page
    .getByLabel("Description complete")
    .fill("Profitez de l'abonnement annuel Masterz a deux.");
  await page.getByLabel(/Afficher dans le banner/).check();
  await page.getByRole("button", { name: "Creer l'offre" }).click();

  await expect(page.getByText("Offre creee.")).toBeVisible();
  await expect(
    page.getByText("Offre Duo Masterz", { exact: true }),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    title: "Offre Duo Masterz",
    base_plan_id: plan.id,
    price: "3000",
    participant_count: 2,
    is_active: true,
    is_featured: true,
  });
});

test("affiche l'offre au visiteur et la joint a sa demande", async ({
  page,
}) => {
  let applicationBody: Record<string, unknown> | null = null;

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET, POST, OPTIONS",
        },
      });
      return;
    }
    let body: unknown = [];
    let status = 200;
    if (url.pathname === "/api/v1/promotions/featured") body = promotion;
    if (url.pathname === `/api/v1/promotions/${promotion.slug}`)
      body = promotion;
    if (url.pathname === "/api/v1/promotions") body = [promotion];
    if (url.pathname === "/api/v1/membership-plans") body = [plan];
    if (url.pathname === "/api/v1/membership-applications") {
      applicationBody = route.request().postDataJSON();
      body = { id: "00000000-0000-0000-0000-000000000204" };
      status = 201;
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await page.goto("/");
  await page.getByRole("link", { name: /Offre Duo Masterz/ }).click();
  await expect(page).toHaveURL(new RegExp(`/offres/${promotion.slug}$`));
  await expect(
    page.getByRole("heading", { name: "Offre Duo Masterz" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Choisir cette offre/ }).click();
  await expect(page).toHaveURL(/\/inscription\?.*promotion=/);
  await expect(page.getByText("Offre selectionnee")).toBeVisible();

  await page.getByLabel("Nom complet *").fill("Client Duo");
  await page.getByLabel("Téléphone *").fill("+212600000205");
  await page.getByRole("button", { name: /Soumettre la demande/ }).click();

  await expect(page.getByText("Demande reçue")).toBeVisible();
  expect(applicationBody).toMatchObject({
    full_name: "Client Duo",
    selected_plan_id: plan.id,
    promotion_id: promotion.id,
  });
});

test("permet au visiteur de masquer le bandeau promotionnel", async ({
  page,
}) => {
  await page.route("**/api/v1/promotions/featured", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(promotion),
    });
  });

  await page.goto("/");
  await expect(page.getByTestId("top-promotion-banner")).toBeVisible();

  await page
    .getByRole("button", { name: "Fermer l'offre promotionnelle" })
    .click();

  await expect(page.getByTestId("top-promotion-banner")).toHaveCount(0);
  await page.getByRole("link", { name: "Store", exact: true }).first().click();
  await expect(page).toHaveURL(/\/store$/);
  await expect(page.getByTestId("top-promotion-banner")).toBeVisible();
});

import { expect, test } from "@playwright/test";

const admin = {
  id: "00000000-0000-0000-0000-000000000801",
  full_name: "Admin Cafe",
  phone: "+212600000801",
  email: "admin.cafe@masterz.test",
  date_of_birth: null,
  gender: null,
  role: "admin",
  status: "active",
  member_number: null,
  profile_photo_url: null,
  profile_photo_verified_at: null,
  created_at: "2026-08-30T09:00:00Z",
  updated_at: "2026-08-30T09:00:00Z",
};

const menuItem = {
  id: "00000000-0000-0000-0000-000000000802",
  name: "Bowl Test",
  category: "Repas",
  description: "Composition choisie par l'equipe.",
  image_url: "/media/cafe-menu/bowl.png",
  media_urls: [
    "/media/cafe-menu/bowl.png",
    "/media/cafe-menu/bowl.mp4",
  ],
  price: "49.00",
  currency: "MAD",
  display_order: 1,
  is_active: true,
  created_by_id: admin.id,
  updated_by_id: admin.id,
  created_at: "2026-08-30T09:00:00Z",
  updated_at: "2026-08-30T09:00:00Z",
};

test("affiche la carte Healthy Cafe publique sans reservation", async ({
  page,
}) => {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const body = url.pathname === "/api/v1/cafe/menu" ? [menuItem] : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await page.goto("/healthy-cafe");

  await expect(
    page.getByRole("heading", { name: "La carte du club." }),
  ).toBeVisible();
  await expect(page.getByText("Bowl Test", { exact: true })).toBeVisible();
  await expect(page.getByText("49")).toBeVisible();
  await page.getByRole("button", { name: "Voir", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Voir Bowl Test" })).toBeVisible();
  await expect(
    page.getByText("Composition choisie par l'equipe."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /reserver/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /reserver/i })).toHaveCount(0);
});

test("permet a l'Admin d'ajouter un repas avec prix et photo", async ({
  page,
}) => {
  let items: (typeof menuItem)[] = [];
  let submitted: Record<string, unknown> | null = null;
  let deleted = false;
  let uploadedMediaCount = 0;

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
    if (url.pathname === "/api/v1/cafe/menu-media") {
      uploadedMediaCount += 1;
      body = {
        media_url:
          uploadedMediaCount === 1
            ? "/media/cafe-menu/bowl.png"
            : "/media/cafe-menu/bowl.mp4",
      };
    }
    if (
      url.pathname === `/api/v1/cafe/menu-items/${menuItem.id}` &&
      route.request().method() === "DELETE"
    ) {
      items = [];
      deleted = true;
      status = 204;
      body = null;
    }
    if (url.pathname === "/api/v1/cafe/menu-items") {
      if (route.request().method() === "POST") {
        submitted = route.request().postDataJSON();
        items = [menuItem];
        body = menuItem;
        status = 201;
      } else {
        body = items;
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
  await page.goto("/espace/admin/cafe");

  await expect(
    page.getByRole("heading", { name: "Healthy Cafe", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Nom du repas *").fill("Bowl Test");
  await page.getByLabel("Categorie *").fill("Repas");
  await page.getByLabel("Prix *").fill("49");
  await page.getByLabel("Ajouter photos ou videos").setInputFiles([
    {
      name: "bowl.png",
      mimeType: "image/png",
      buffer: Buffer.from("89504e470d0a1a0a", "hex"),
    },
    {
      name: "bowl.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("000000186674797069736f6d", "hex"),
    },
  ]);
  await page.getByRole("button", { name: "Ajouter le repas" }).click();

  await expect(
    page.getByText("Le repas a ete ajoute a la carte publique."),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    name: "Bowl Test",
    category: "Repas",
    price: "49",
    currency: "MAD",
    image_url: "/media/cafe-menu/bowl.png",
    media_urls: [
      "/media/cafe-menu/bowl.png",
      "/media/cafe-menu/bowl.mp4",
    ],
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Supprimer", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("Le repas a ete supprime de la carte."),
  ).toBeVisible();
  expect(deleted).toBe(true);
});

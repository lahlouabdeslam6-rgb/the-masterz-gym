import { expect, test } from "@playwright/test";

const member = {
  id: "00000000-0000-0000-0000-000000000510",
  full_name: "Client Store Test",
  phone: "+212600000510",
  email: "client-store@masterz.test",
  date_of_birth: null,
  gender: "male",
  role: "member",
  status: "active",
  member_number: "TMG-STORE-TEST",
  created_at: "2026-08-21T10:00:00Z",
  updated_at: "2026-08-21T10:00:00Z",
};

const receptionist = {
  ...member,
  id: "00000000-0000-0000-0000-000000000511",
  full_name: "Reception Store Test",
  phone: "+212600000511",
  email: "reception-store@masterz.test",
  role: "receptionist",
  member_number: null,
};

const admin = {
  ...member,
  id: "00000000-0000-0000-0000-000000000509",
  full_name: "Admin Store Test",
  phone: "+212600000509",
  email: "admin-store@masterz.test",
  role: "admin",
  member_number: null,
};

const productId = "00000000-0000-0000-0000-000000000512";

function product(stock = 5) {
  return {
    id: productId,
    name: "Whey Protein Masterz",
    description: "Proteine disponible au Masterz Store.",
    image_url: null,
    price: "350.00",
    currency: "MAD",
    stock_quantity: stock,
    is_active: true,
    created_at: "2026-08-21T10:00:00Z",
    updated_at: "2026-08-21T10:00:00Z",
  };
}

test("le membre reserve un produit depuis son espace", async ({ page }) => {
  let reservationBody: Record<string, unknown> | null = null;
  const reservations: Array<Record<string, unknown>> = [];

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    let status = 200;
    if (url.pathname === "/api/v1/users/me") body = member;
    if (url.pathname === "/api/v1/store/products") body = [product()];
    if (url.pathname === "/api/v1/store/reservations") {
      if (route.request().method() === "POST") {
        reservationBody = route.request().postDataJSON();
        body = {
          id: "00000000-0000-0000-0000-000000000513",
          product_id: productId,
          product_name: product().name,
          product_image_url: null,
          member_id: member.id,
          member_name: member.full_name,
          member_number: member.member_number,
          member_phone: member.phone,
          quantity: (reservationBody as { quantity: number }).quantity,
          unit_price: "350.00",
          total_amount: "700.00",
          currency: "MAD",
          status: "pending",
          processed_by_id: null,
          processed_by_name: null,
          processed_at: null,
          notes: null,
          created_at: "2026-08-21T10:05:00Z",
          updated_at: "2026-08-21T10:05:00Z",
        };
        reservations.unshift(body as Record<string, unknown>);
        status = 201;
      } else {
        body = reservations;
      }
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
      status = 404;
      body = {
        detail: { code: "tracking_not_found", message: "Introuvable." },
      };
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await storeSession(page, member);
  await page.goto("/espace/membre");
  await expect(
    page.getByRole("heading", { name: "Masterz Store" }),
  ).toBeVisible();
  await expect(page.getByText("Whey Protein Masterz").first()).toBeVisible();
  await page.getByLabel("Quantite Whey Protein Masterz").fill("2");
  await page.getByRole("button", { name: "Reserver" }).click();
  await expect(
    page.getByText("Reservation envoyee a la Reception."),
  ).toBeVisible();
  await expect(page.getByText("En attente", { exact: true })).toBeVisible();
  expect(reservationBody).toEqual({ product_id: productId, quantity: 2 });
});

test("ladmin cree un produit avec son prix et son stock", async ({ page }) => {
  let createdBody: Record<string, unknown> | null = null;
  const uploadedMediaUrl = "/media/store-products/test-produit.mp4";
  const products: Array<Record<string, unknown>> = [];

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    let status = 200;
    if (url.pathname === "/api/v1/users/me") body = admin;
    if (url.pathname === "/api/v1/store/product-media") {
      body = { media_url: uploadedMediaUrl };
      status = 201;
    }
    if (url.pathname === "/api/v1/store/products") {
      if (route.request().method() === "POST") {
        createdBody = route.request().postDataJSON();
        body = {
          ...product(12),
          name: (createdBody as { name: string }).name,
          price: (createdBody as { price: string }).price,
        };
        products.push(body as Record<string, unknown>);
        status = 201;
      } else {
        body = products;
      }
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await storeSession(page, admin);
  await page.goto("/espace/admin/store");
  await expect(
    page.getByRole("heading", { name: "Masterz Store", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Nom du produit").fill("Ceinture musculation");
  await page.getByLabel("Prix").first().fill("220");
  await page.getByLabel("Stock initial").fill("12");
  await page.getByLabel("Choisir photo ou video").setInputFiles({
    name: "ceinture.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("video-test"),
  });
  await expect(page.getByText(/Fichier charge/)).toBeVisible();
  await expect(page.locator("video").first()).toBeVisible();
  await page.getByRole("button", { name: "Ajouter le produit" }).click();
  await expect(page.getByText("Produit ajoute au Store.")).toBeVisible();
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue(
    "Ceinture musculation",
  );
  expect(createdBody).toMatchObject({
    name: "Ceinture musculation",
    price: "220",
    stock_quantity: 12,
    currency: "MAD",
    image_url: uploadedMediaUrl,
  });
});

test("la reception valide une reservation et le stock se met a jour", async ({
  page,
}) => {
  let stock = 5;
  let reservationStatus = "pending";
  let patchBody: Record<string, unknown> | null = null;
  const reservationId = "00000000-0000-0000-0000-000000000520";

  function reservation() {
    return {
      id: reservationId,
      product_id: productId,
      product_name: product().name,
      product_image_url: null,
      member_id: member.id,
      member_name: member.full_name,
      member_number: member.member_number,
      member_phone: member.phone,
      quantity: 2,
      unit_price: "350.00",
      total_amount: "700.00",
      currency: "MAD",
      status: reservationStatus,
      processed_by_id: reservationStatus === "pending" ? null : receptionist.id,
      processed_by_name:
        reservationStatus === "pending" ? null : receptionist.full_name,
      processed_at:
        reservationStatus === "pending" ? null : "2026-08-21T10:10:00Z",
      notes: null,
      created_at: "2026-08-21T10:05:00Z",
      updated_at: "2026-08-21T10:05:00Z",
    };
  }

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/api/v1/users/me") body = receptionist;
    if (url.pathname === "/api/v1/store/products") body = [product(stock)];
    if (url.pathname === "/api/v1/store/reservations") {
      body = [reservation()];
    }
    if (url.pathname === "/api/v1/store/sales") body = [];
    if (
      url.pathname === `/api/v1/store/reservations/${reservationId}/status` &&
      route.request().method() === "PATCH"
    ) {
      patchBody = route.request().postDataJSON();
      reservationStatus = (patchBody as { status: string }).status;
      stock -= 2;
      body = reservation();
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await storeSession(page, receptionist);
  await page.goto("/espace/reception/store");
  await expect(
    page.getByRole("heading", { name: "Masterz Store", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(member.full_name, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Valider disponible" }).click();
  await expect(page.getByText("Reservation: Disponible.")).toBeVisible();
  await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
  expect(patchBody).toMatchObject({ status: "ready" });
});

async function storeSession(
  page: import("@playwright/test").Page,
  user: Record<string, unknown>,
) {
  await page.goto("/");
  await page.evaluate((sessionUser) => {
    window.localStorage.setItem("access_token", "store-access-token");
    window.localStorage.setItem("refresh_token", "store-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(sessionUser));
  }, user);
}

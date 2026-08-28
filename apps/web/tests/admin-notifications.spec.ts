import { expect, test } from "@playwright/test";

const admin = {
  id: "00000000-0000-0000-0000-000000000410",
  full_name: "Administrateur Notifications",
  phone: "+212600000410",
  email: "admin-notifications@masterz.test",
  date_of_birth: null,
  gender: null,
  role: "admin",
  status: "active",
  member_number: null,
  profile_photo_url: null,
  profile_photo_verified_at: null,
  created_at: "2026-08-28T10:00:00Z",
  updated_at: "2026-08-28T10:00:00Z",
};

test("le jaras Admin kaym7i ra9em l9dim w kay7el page li m3niya", async ({
  page,
}) => {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/api/v1/users/me") body = admin;
    if (url.pathname === "/api/v1/membership-applications") {
      body = [
        {
          id: "00000000-0000-0000-0000-000000000411",
          status: "pending",
        },
      ];
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
    window.localStorage.setItem("access_token", "admin-access-token");
    window.localStorage.setItem("refresh_token", "admin-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, admin);

  await page.goto("/espace/admin");
  await expect(page.getByTestId("admin-notification-badge")).toHaveText("1");

  await page
    .getByRole("button", { name: "Notifications administration" })
    .click();
  await expect(page.getByTestId("admin-notification-badge")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Demandes d'inscription/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Demandes d'inscription/ }).click();
  await expect(page).toHaveURL(/\/espace\/admin\/demandes$/);
  await expect(page.getByTestId("admin-notification-badge")).toHaveCount(0);
});

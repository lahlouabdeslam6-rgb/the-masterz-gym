import { expect, test } from "@playwright/test";

import { apiRequestUrl } from "./support/api-request";

const SALLE_1_ID = "11111111-1111-4111-8111-111111111111";

const admin = {
  id: "00000000-0000-0000-0000-000000000001",
  full_name: "Admin Masterz",
  phone: "+212600000001",
  email: "admin@masterz.test",
  date_of_birth: null,
  gender: null,
  role: "admin",
  status: "active",
  member_number: null,
  profile_photo_url: null,
  profile_photo_verified_at: null,
  created_at: "2026-08-15T12:00:00Z",
  updated_at: "2026-08-15T12:00:00Z",
};

test("permet a l'admin de supprimer une formule inutilisee", async ({
  page,
}) => {
  const plan = {
    id: "00000000-0000-0000-0000-000000000010",
    club_id: SALLE_1_ID,
    name: "Formule temporaire",
    duration_months: 1,
    price: "300.00",
    currency: "MAD",
    service_type: "gym",
    session_count: null,
    is_active: true,
    created_at: "2026-08-15T12:00:00Z",
    updated_at: "2026-08-15T12:00:00Z",
  };
  let plans = [plan];
  let deletedPlanId: string | null = null;

  await page.route("**/api/v1/**", async (route) => {
    const url = apiRequestUrl(route.request().url());
    if (url.pathname === "/api/v1/users/me") {
      await route.fulfill({ json: admin });
      return;
    }
    if (url.pathname === "/api/v1/membership-plans") {
      await route.fulfill({ json: plans });
      return;
    }
    if (
      url.pathname === `/api/v1/membership-plans/${plan.id}` &&
      route.request().method() === "DELETE"
    ) {
      deletedPlanId = plan.id;
      plans = [];
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.goto("/");
  await page.evaluate((user) => {
    window.localStorage.setItem("access_token", "admin-access-token");
    window.localStorage.setItem("refresh_token", "admin-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, admin);
  await page.goto("/espace/admin/formules");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Supprimer ${plan.name}` }).click();

  await expect(page.getByText("Formule supprimee.")).toBeVisible();
  expect(deletedPlanId).toBe(plan.id);
  await expect(page.getByText(plan.name, { exact: true })).toHaveCount(0);
});

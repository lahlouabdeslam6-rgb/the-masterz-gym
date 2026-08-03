import { expect, test } from "@playwright/test";

test("affiche la page d'attente", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /The Masterz Gym/i }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/The Masterz Gym/);
});

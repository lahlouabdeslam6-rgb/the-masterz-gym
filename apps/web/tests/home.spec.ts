import { expect, test } from "@playwright/test";

test("affiche la page d’accueil premium", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Élève ton niveau/i }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/The Masterz Gym/);
  await expect(
    page.getByRole("heading", {
      name: /Trouvez la formule qui suit votre rythme/i,
    }),
  ).toBeVisible();
});

test("regroupe les univers dans le menu abonnements", async ({ page }) => {
  await page.goto("/");

  const menu = page.getByRole("button", { name: "Abonnements", exact: true });
  await expect(menu).toBeVisible();
  await menu.click();

  await expect(
    page.getByRole("link", { name: /Salle musculation/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Coaching/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Recovery/i }).first(),
  ).toBeVisible();
});

test("integre l'analyse corporelle au parcours coaching", async ({ page }) => {
  await page.goto("/analyse-corporelle");

  await expect(page).toHaveURL(/\/coaching#analyse-corporelle$/);
  await expect(
    page.getByRole("heading", {
      name: /Analyse corporelle et suivi des résultats/i,
    }),
  ).toBeVisible();
});

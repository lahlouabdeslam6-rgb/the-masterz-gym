import { expect, test } from "@playwright/test";

test("affiche la page d’accueil premium", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Deux clubs.*Une seule ambition/i }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/The Masterz Gym/);
  await expect(
    page.getByRole("heading", {
      name: /Choisissez l experience qui vous ressemble/i,
    }),
  ).toBeVisible();
});

test.describe("navigation telephone", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("ouvre et ferme la navigation sur telephone", async ({ page }) => {
    await page.goto("/");

    const menuToggle = page.locator(
      'summary[aria-controls="mobile-navigation"]',
    );
    const mobileMenu = page.locator("details").filter({ has: menuToggle });
    await expect(menuToggle).toBeVisible();
    await menuToggle.tap();

    const mobileNavigation = page.getByRole("navigation", {
      name: "Navigation mobile",
    });
    await expect(mobileNavigation).toBeVisible();
    await expect(mobileMenu).toHaveAttribute("open", "");
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

    await menuToggle.tap();
    await expect(mobileNavigation).toBeHidden();
    await expect(mobileMenu).not.toHaveAttribute("open", "");
  });
});

test("separe les abonnements par salle et regroupe le Store avec le Cafe", async ({
  page,
}) => {
  await page.goto("/");

  const menu = page.getByRole("button", { name: "Abonnements", exact: true });
  await expect(menu).toBeVisible();

  await menu.hover();
  await expect(
    page.getByRole("link", { name: /Salle musculation/i }),
  ).toBeVisible();
  await page.mouse.move(5, 500);
  await expect(
    page.getByRole("link", { name: /Salle musculation/i }),
  ).toBeHidden();

  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.mouse.move(5, 500);
  await expect(menu).toHaveAttribute("aria-expanded", "true");

  await expect(
    page.getByRole("link", { name: /Salle musculation/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Coaching/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Recovery/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Pass 4 Fit & Arts martiaux/i }),
  ).toHaveAttribute("href", "/abonnements?club=salle-2");

  await page.locator("main").click({ position: { x: 10, y: 10 } });
  await expect(
    page.getByRole("link", { name: /Salle musculation/i }),
  ).toBeHidden();

  const commerceMenu = page.getByRole("button", {
    name: "Store & Café",
    exact: true,
  });
  await commerceMenu.click();
  const commercePanel = page.locator("#commerce-navigation");
  await expect(
    commercePanel.getByRole("link", { name: /Masterz Store/i }),
  ).toBeVisible();
  await expect(
    commercePanel.getByRole("link", { name: /Healthy Café/i }),
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

test("affiche la carte et les contacts officiels", async ({ page }) => {
  await page.goto("/contact");

  await expect(page.getByTitle("Carte The Masterz Gym")).toBeAttached();
  await expect(
    page.getByRole("link", {
      name: "Ouvrir The Masterz Gym dans Google Maps",
    }),
  ).toHaveAttribute("href", /google\.com\/maps\/place\/MasTerZ/);
  await expect(
    page.getByRole("link", { name: "Ouvrir Instagram" }),
  ).toHaveAttribute("href", /instagram\.com\/the_masterz_gym/);
  await expect(
    page.getByRole("link", { name: "Ouvrir Facebook" }),
  ).toHaveAttribute("href", /facebook\.com\/themasterzgym/);
  await expect(
    page.getByRole("link", { name: "Ouvrir Email" }),
  ).toHaveAttribute("href", "mailto:masterzgym2023@gmail.com");
});

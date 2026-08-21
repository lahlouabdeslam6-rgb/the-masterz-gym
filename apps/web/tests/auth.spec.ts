import { expect, test } from "@playwright/test";

test("la connexion guide le membre vers sa premiere activation", async ({
  page,
}) => {
  await page.goto("/connexion");

  const activationLink = page.getByRole("link", {
    name: /Premiere connexion.*Activer mon compte/i,
  });
  await expect(activationLink).toBeVisible();
  await expect(activationLink).toHaveAttribute("href", "/activation-membre");
});

test("lactivation envoie le numero membre avec lidentite", async ({ page }) => {
  let activationBody: Record<string, unknown> | null = null;

  await page.route(
    "**/api/v1/auth/member-activation/request",
    async (route) => {
      activationBody = route.request().postDataJSON();
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          message: "Code envoye.",
          challenge_id: "00000000-0000-0000-0000-000000000701",
          expires_in: 600,
        }),
      });
    },
  );

  await page.goto("/activation-membre");
  await expect(page.getByRole("link", { name: "Retour" })).toHaveAttribute(
    "href",
    "/connexion",
  );
  await page.getByLabel("Numéro de téléphone").fill("+212687317890");
  await page.getByLabel("Nom complet").fill("LAHLOU");
  await page.getByLabel("Numéro membre").fill("TMG-2026-E2D9869E");
  await page.getByRole("button", { name: /Vérifier mon identité/i }).click();

  await expect(page.getByLabel("Code de vérification")).toBeVisible();
  expect(activationBody).toEqual({
    phone: "+212687317890",
    full_name: "LAHLOU",
    member_number: "TMG-2026-E2D9869E",
  });
});

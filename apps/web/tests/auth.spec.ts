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

test("lactivation exige la photo avant de terminer le compte", async ({
  page,
}) => {
  let activationBody: Record<string, unknown> | null = null;
  let confirmationBody: Record<string, unknown> | null = null;
  let photoUploadCalls = 0;

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
  await page.route(
    "**/api/v1/auth/member-activation/confirm",
    async (route) => {
      confirmationBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          message: "Identite verifiee. Ajoutez maintenant votre photo.",
        }),
      });
    },
  );
  await page.route("**/api/v1/auth/member-activation/photo", async (route) => {
    photoUploadCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        message: "Compte active. Vous pouvez maintenant vous connecter.",
      }),
    });
  });

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

  await page.getByLabel("Code de vérification").fill("123456");
  await page.getByLabel("Créer un mot de passe").fill("LahlouLocal123!");
  await page.getByRole("button", { name: "Continuer vers la photo" }).click();
  await expect(
    page.getByRole("heading", { name: "Ajoutez votre photo membre." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aller à la connexion" }),
  ).toHaveCount(0);
  expect(confirmationBody).toEqual({
    challenge_id: "00000000-0000-0000-0000-000000000701",
    otp: "123456",
    new_password: "LahlouLocal123!",
  });

  await page.getByLabel("Importer une photo visage").setInputFiles({
    name: "visage.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("photo-visage-test"),
  });
  await page.getByRole("button", { name: "Valider cette photo" }).click();
  await expect(
    page.getByRole("heading", { name: "Votre compte est activé." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aller à la connexion" }),
  ).toBeVisible();
  expect(photoUploadCalls).toBe(1);
});

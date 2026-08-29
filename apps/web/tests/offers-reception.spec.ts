import { expect, test } from "@playwright/test";

const plans = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    name: "Salle 1 mois",
    duration_months: 1,
    price: "300.00",
    currency: "MAD",
    service_type: "gym",
    is_active: true,
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    name: "Coaching Performance",
    duration_months: 3,
    price: "900.00",
    currency: "MAD",
    service_type: "coaching",
    is_active: true,
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    name: "Pack Recovery",
    duration_months: 1,
    price: "600.00",
    currency: "MAD",
    service_type: "recovery",
    session_count: 10,
    is_active: true,
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000104",
    name: "Ancienne offre Recovery",
    duration_months: 1,
    price: "450.00",
    currency: "MAD",
    service_type: "recovery",
    session_count: null,
    is_active: true,
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  },
];

const memberPromotion = {
  id: "00000000-0000-0000-0000-000000000105",
  title: "Offre Duo Membre",
  slug: "offre-duo-membre",
  short_description: "Deux personnes, une annee, un prix special.",
  description: "Une offre speciale creee par l'administration.",
  base_plan_id: plans[0].id,
  base_plan_name: plans[0].name,
  price: "3000.00",
  currency: "MAD",
  participant_count: 2,
  starts_at: "2026-08-01T00:00:00Z",
  ends_at: "2026-12-31T23:59:59Z",
  terms: null,
  is_active: true,
  is_featured: true,
  created_by_id: "00000000-0000-0000-0000-000000000110",
  updated_by_id: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

test("affiche chaque offre dans sa page publique", async ({ page }) => {
  await page.route("**/api/v1/membership-plans**", async (route) => {
    const serviceType = new URL(route.request().url()).searchParams.get(
      "service_type",
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(
        serviceType
          ? plans.filter((plan) => plan.service_type === serviceType)
          : plans,
      ),
    });
  });

  await page.goto("/abonnements");
  await expect(page.getByText("Salle 1 mois", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Coaching Performance", { exact: true }),
  ).toHaveCount(0);

  await page.goto("/coaching");
  await expect(
    page.getByText("Coaching Performance", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Demander" }).first(),
  ).toHaveAttribute("href", `/inscription?plan=${plans[1].id}`);
  await expect(page.getByText("Salle 1 mois", { exact: true })).toHaveCount(0);

  await page.goto("/recovery");
  await expect(page.getByText("Pack Recovery", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Ancienne offre Recovery", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Nombre a confirmer/)).toBeVisible();
  await expect(
    page.getByText("Coaching Performance", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(`a[href="/inscription?plan=${plans[2].id}"]`),
  ).toContainText("Demander");

  await page.goto(`/inscription?plan=${plans[2].id}`);
  const planSelect = page.getByLabel("Formule *");
  await expect(planSelect).toHaveValue(plans[2].id);
  await expect(planSelect).toContainText("Salle 1 mois");
  await expect(planSelect).toContainText("Coaching Performance");
  await expect(planSelect).toContainText("Pack Recovery");
  await expect(planSelect).toContainText("10 seances");
});

test("separe les taches de la reception en pages", async ({ page }) => {
  const receptionist = {
    id: "00000000-0000-0000-0000-000000000110",
    full_name: "Reception Masterz",
    phone: "+212600000110",
    email: "reception@masterz.test",
    date_of_birth: null,
    gender: "female",
    role: "receptionist",
    status: "active",
    member_number: null,
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  };

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/api/v1/users/me") body = receptionist;
    if (url.pathname === "/api/v1/membership-plans") body = plans;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await page.goto("/");
  await page.evaluate((user) => {
    window.localStorage.setItem("access_token", "reception-access-token");
    window.localStorage.setItem("refresh_token", "reception-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, receptionist);

  await page.goto("/espace/reception");
  await expect(
    page.getByRole("heading", { name: "Bonjour, Reception." }),
  ).toBeVisible();

  const navigation = page.getByRole("navigation", {
    name: "Navigation reception",
  });
  await expect(
    navigation.getByRole("link", { name: "Demandes" }),
  ).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Membres" })).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Paiements" }),
  ).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Entrees" })).toBeVisible();

  await navigation.getByRole("link", { name: "Paiements" }).click();
  await expect(page).toHaveURL(/\/espace\/reception\/paiements$/);
  await expect(
    page.getByRole("heading", { name: "Paiements", exact: true }),
  ).toBeVisible();

  await navigation.getByRole("link", { name: "Entrees" }).click();
  await expect(page).toHaveURL(/\/espace\/reception\/acces$/);
  await expect(
    page.getByRole("heading", { name: "Entrees", exact: true }),
  ).toBeVisible();
});

test("informe le membre de ses abonnements avant une nouvelle inscription", async ({
  page,
}) => {
  const member = {
    id: "00000000-0000-0000-0000-000000000120",
    full_name: "Membre Abonnements",
    phone: "+212600000120",
    email: "membre.abonnements@masterz.test",
    date_of_birth: null,
    gender: "male",
    role: "member",
    status: "active",
    member_number: "TMG-ABONNEMENTS",
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  };
  const subscriptions = [
    {
      id: "00000000-0000-0000-0000-000000000121",
      member_id: member.id,
      plan_id: plans[0].id,
      status: "active",
      effective_status: "active",
      starts_on: "2026-08-01",
      ends_on: "2026-09-01",
      grace_ends_on: "2026-09-05",
      plan_name: "Salle 1 mois",
      duration_months: 1,
      price: "300.00",
      currency: "MAD",
      service_type: "gym",
      total_sessions: null,
      remaining_sessions: null,
      created_by_id: "00000000-0000-0000-0000-000000000110",
      created_at: "2026-08-01T10:00:00Z",
      updated_at: "2026-08-01T10:00:00Z",
    },
    {
      id: "00000000-0000-0000-0000-000000000122",
      member_id: member.id,
      plan_id: plans[2].id,
      status: "active",
      effective_status: "active",
      starts_on: "2026-08-01",
      ends_on: "2026-09-01",
      grace_ends_on: "2026-09-05",
      plan_name: "Pack Recovery",
      duration_months: 1,
      price: "600.00",
      currency: "MAD",
      service_type: "recovery",
      total_sessions: 10,
      remaining_sessions: 0,
      created_by_id: "00000000-0000-0000-0000-000000000110",
      created_at: "2026-08-01T10:00:00Z",
      updated_at: "2026-08-20T10:00:00Z",
    },
  ];

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    let status = 200;
    if (url.pathname === "/api/v1/users/me") body = member;
    if (url.pathname === "/api/v1/membership-plans") {
      const serviceType = url.searchParams.get("service_type");
      body = serviceType
        ? plans.filter((plan) => plan.service_type === serviceType)
        : plans;
    }
    if (url.pathname === "/api/v1/promotions") body = [memberPromotion];
    if (url.pathname === `/api/v1/members/${member.id}/subscriptions`) {
      body = subscriptions;
    }
    if (url.pathname === `/api/v1/payments/members/${member.id}/receipts`) {
      body = [];
    }
    if (url.pathname === `/api/v1/attendance/members/${member.id}`) body = [];
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

  await page.goto("/");
  await page.evaluate((user) => {
    window.localStorage.setItem("access_token", "member-access-token");
    window.localStorage.setItem("refresh_token", "member-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, member);

  await page.goto("/abonnements");
  await expect(
    page.getByText("Vous avez deja paye cette categorie"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Deja paye" })).toBeVisible();

  await page.goto(`/inscription?plan=${plans[0].id}`);
  await expect(
    page.getByText("Vous avez deja paye cette categorie", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Formule *").selectOption(plans[1].id);
  await expect(
    page.getByText("Vous avez deja paye cette categorie", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Soumettre la demande/ }),
  ).toBeEnabled();

  await page.goto("/recovery");
  await expect(
    page.getByText(/ancienne formule Pack Recovery est terminee/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Renouveler" }).first(),
  ).toBeVisible();

  await page.goto("/espace/membre");
  await page.getByRole("button", { name: "Abonnements", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Offres disponibles" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Historique des abonnements" }),
  ).toBeVisible();
  await expect(page.getByText("Salle 1 mois", { exact: true })).toBeVisible();
  await expect(
    page.getByText(memberPromotion.title, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Decouvrir l'offre/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Deja paye" })).toBeVisible();
  await expect(page.getByTestId("member-service-recovery")).toContainText(
    "Seances terminees",
  );
  await page.getByRole("button", { name: "Voir mon abonnement" }).click();
  await expect(page.getByText("Pack Recovery", { exact: true })).toBeVisible();
});

test("la reception accepte clairement une nouvelle demande", async ({
  page,
}) => {
  const receptionist = {
    id: "00000000-0000-0000-0000-000000000130",
    full_name: "Reception Demandes",
    phone: "+212600000130",
    email: "reception.demandes@masterz.test",
    date_of_birth: null,
    gender: "female",
    role: "receptionist",
    status: "active",
    member_number: null,
    created_at: "2026-08-17T10:00:00Z",
    updated_at: "2026-08-17T10:00:00Z",
  };
  let applicationStatus = "pending";
  let reviewBody: Record<string, unknown> | null = null;
  let paymentBody: Record<string, unknown> | null = null;
  const applicationId = "00000000-0000-0000-0000-000000000131";

  function application() {
    return {
      id: applicationId,
      full_name: "Nouveau Client",
      phone: "+212600000131",
      email: "nouveau.client@masterz.test",
      date_of_birth: null,
      gender: "male",
      selected_plan_id: plans[0].id,
      promotion_id: null,
      promotion_title: null,
      promotion_price: null,
      promotion_currency: null,
      promotion_participant_count: null,
      fitness_objective: null,
      message: null,
      status: applicationStatus,
      review_reason: null,
      reviewed_by_id: applicationStatus === "approved" ? receptionist.id : null,
      converted_member_id: null,
      created_at: "2026-08-25T10:00:00Z",
      updated_at: "2026-08-25T10:00:00Z",
    };
  }

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/api/v1/users/me") body = receptionist;
    if (url.pathname === "/api/v1/membership-applications") {
      body = [application()];
    }
    if (url.pathname === "/api/v1/membership-plans") body = plans;
    if (
      url.pathname ===
        `/api/v1/membership-applications/${applicationId}/review` &&
      route.request().method() === "PATCH"
    ) {
      reviewBody = route.request().postDataJSON();
      applicationStatus = "approved";
      body = application();
    }
    if (
      url.pathname === "/api/v1/payments/memberships" &&
      route.request().method() === "POST"
    ) {
      paymentBody = route.request().postDataJSON();
      applicationStatus = "converted_to_member";
      body = {
        receipt_id: "00000000-0000-0000-0000-000000000132",
        receipt_number: "TMG-20260829-TEST",
        issued_at: "2026-08-29T10:00:00Z",
        payment_id: "00000000-0000-0000-0000-000000000133",
        member_id: "00000000-0000-0000-0000-000000000134",
        member_name: "Nouveau Client",
        member_number: "TMG-2026-TEST",
        subscription_id: "00000000-0000-0000-0000-000000000135",
        subscription_status: "active",
        plan_name: plans[1].name,
        service_type: plans[1].service_type,
        total_sessions: null,
        remaining_sessions: null,
        starts_on: "2026-08-29",
        ends_on: "2026-11-28",
        amount: plans[1].price,
        currency: plans[1].currency,
        payment_method: "cash",
        bank_transfer_reference: null,
        recorded_by_id: receptionist.id,
        recorded_by_name: receptionist.full_name,
        paid_at: "2026-08-29T10:00:00Z",
      };
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
    window.localStorage.setItem("access_token", "reception-access-token");
    window.localStorage.setItem("refresh_token", "reception-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, receptionist);
  await page.goto("/espace/reception");

  await expect(page.getByTestId("navigation-badge-applications")).toHaveText(
    "1",
  );
  await page.getByRole("link", { name: /^Demandes/ }).click();
  await expect(page).toHaveURL(/\/espace\/reception\/demandes$/);
  await expect(page.getByTestId("navigation-badge-applications")).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "Accepter la demande" }).click();
  await expect(
    page.getByText(/Demande acceptee. Enregistrez maintenant le paiement/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accepter la demande" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Encaisser et générer le reçu/ }),
  ).toBeVisible();
  const finalPlan = page.getByLabel("Formule finale a valider");
  await expect(finalPlan).toHaveValue(plans[0].id);
  await finalPlan.selectOption(plans[1].id);
  await expect(page.getByText("900.00 MAD", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: /Encaisser et générer le reçu/ })
    .click();
  expect(paymentBody).toMatchObject({
    application_id: applicationId,
    plan_id: plans[1].id,
    method: "cash",
  });
  await expect(page.getByTestId("navigation-badge-applications")).toHaveCount(
    0,
  );
  expect(reviewBody).toMatchObject({ status: "approved", reason: null });
});

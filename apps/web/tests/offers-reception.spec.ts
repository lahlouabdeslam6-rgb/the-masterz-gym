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
        plans.filter((plan) => plan.service_type === serviceType),
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
    page.getByRole("heading", {
      name: "Votre abonnement salle est deja paye.",
    }),
  ).toBeVisible();

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
  await expect(page.getByRole("link", { name: "Deja paye" })).toBeVisible();
  await expect(page.getByTestId("member-service-recovery")).toContainText(
    "Seances terminees",
  );
  await page
    .getByRole("button", { name: "Historique des abonnements" })
    .click();
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
    if (
      url.pathname ===
        `/api/v1/membership-applications/${applicationId}/review` &&
      route.request().method() === "PATCH"
    ) {
      reviewBody = route.request().postDataJSON();
      applicationStatus = "approved";
      body = application();
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
  await page.goto("/espace/reception/demandes");

  await expect(page.getByTestId("navigation-badge-applications")).toHaveText(
    "1",
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
  await expect(page.getByTestId("navigation-badge-applications")).toHaveCount(
    0,
  );
  expect(reviewBody).toMatchObject({ status: "approved", reason: null });
});

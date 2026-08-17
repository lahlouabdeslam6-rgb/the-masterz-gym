import { expect, test } from "@playwright/test";

const adminUser = {
  id: "00000000-0000-0000-0000-000000000001",
  full_name: "Admin Masterz",
  phone: "+212600000001",
  email: "admin@masterz.test",
  date_of_birth: null,
  gender: null,
  role: "admin",
  status: "active",
  member_number: null,
  created_at: "2026-08-15T12:00:00Z",
  updated_at: "2026-08-15T12:00:00Z",
};

const directoryUsers = Array.from({ length: 12 }, (_, index) => {
  const member = index < 6;
  const sequence = String(index + 1).padStart(2, "0");
  return {
    ...adminUser,
    id: `00000000-0000-0000-0001-${String(index + 1).padStart(12, "0")}`,
    full_name: `${member ? "Membre" : "Coach"} Test ${sequence}`,
    phone: `+2126000010${sequence}`,
    email: `${member ? "membre" : "coach"}${sequence}@masterz.test`,
    role: member ? "member" : "coach",
    member_number: member ? `TMG-TEST-${sequence}` : null,
  };
});

const activePlan = {
  id: "00000000-0000-0000-0000-000000000010",
  name: "12 mois",
  duration_months: 12,
  price: "2000.00",
  currency: "MAD",
  service_type: "gym",
  is_active: true,
  created_at: "2026-08-01T12:00:00Z",
  updated_at: "2026-08-01T12:00:00Z",
};

const coachingPlan = {
  ...activePlan,
  id: "00000000-0000-0000-0000-000000000011",
  name: "Coaching 1 mois",
  duration_months: 1,
  price: "900.00",
  service_type: "coaching",
};

const recoveryPlan = {
  ...activePlan,
  id: "00000000-0000-0000-0000-000000000012",
  name: "Pack Recovery 1 mois",
  duration_months: 1,
  price: "600.00",
  service_type: "recovery",
};

const priorityMembers = [
  {
    id: "00000000-0000-0000-0000-000000000020",
    full_name: "Membre Urgent",
    phone: "+212600000020",
    email: "urgent@masterz.test",
    date_of_birth: "1995-04-12",
    gender: "male",
    account_status: "active",
    member_number: "TMG-URGENT",
    created_at: "2025-08-19T12:00:00Z",
    subscription_id: "00000000-0000-0000-0000-000000000030",
    plan_name: "12 mois",
    starts_on: "2025-08-19",
    ends_on: "2026-08-18",
    status: "active",
    effective_status: "expiring_soon",
    days_remaining: 2,
    has_active_coaching: false,
    has_active_recovery: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000021",
    full_name: "Membre Stable",
    phone: "+212600000021",
    email: null,
    date_of_birth: null,
    gender: null,
    account_status: "active",
    member_number: "TMG-STABLE",
    created_at: "2026-08-15T12:00:00Z",
    subscription_id: "00000000-0000-0000-0000-000000000031",
    plan_name: "12 mois",
    starts_on: "2026-08-18",
    ends_on: "2027-08-17",
    status: "active",
    effective_status: "active",
    days_remaining: 366,
    has_active_coaching: true,
    has_active_recovery: false,
  },
];

const urgentSubscription = {
  id: priorityMembers[0].subscription_id,
  member_id: priorityMembers[0].id,
  plan_id: activePlan.id,
  status: "active",
  effective_status: "expiring_soon",
  starts_on: priorityMembers[0].starts_on,
  ends_on: priorityMembers[0].ends_on,
  grace_ends_on: "2026-08-22",
  plan_name: activePlan.name,
  duration_months: activePlan.duration_months,
  price: activePlan.price,
  currency: activePlan.currency,
  service_type: activePlan.service_type,
  created_by_id: adminUser.id,
  created_at: "2025-08-19T12:00:00Z",
  updated_at: "2026-08-15T12:00:00Z",
};

const urgentReceipt = {
  receipt_id: "00000000-0000-0000-0000-000000000040",
  receipt_number: "TMG-20250819-TEST",
  issued_at: "2025-08-19T12:00:00Z",
  payment_id: "00000000-0000-0000-0000-000000000041",
  member_id: priorityMembers[0].id,
  member_name: priorityMembers[0].full_name,
  member_number: priorityMembers[0].member_number,
  subscription_id: priorityMembers[0].subscription_id,
  subscription_status: "active",
  plan_name: activePlan.name,
  starts_on: priorityMembers[0].starts_on,
  ends_on: priorityMembers[0].ends_on,
  amount: activePlan.price,
  currency: activePlan.currency,
  service_type: activePlan.service_type,
  payment_method: "cash",
  bank_transfer_reference: null,
  recorded_by_id: adminUser.id,
  recorded_by_name: adminUser.full_name,
  paid_at: "2025-08-19T12:00:00Z",
};

const urgentAttendance = [
  {
    id: "00000000-0000-0000-0000-000000000050",
    member_id: priorityMembers[0].id,
    receptionist_id: adminUser.id,
    subscription_id: priorityMembers[0].subscription_id,
    checked_in_at: "2026-08-16T02:16:00Z",
    subscription_status_at_entry: "cancelled",
    decision: "exceptional_access",
    exceptional_access_reason: "Validation responsable",
    warning: null,
  },
  {
    id: "00000000-0000-0000-0000-000000000051",
    member_id: priorityMembers[0].id,
    receptionist_id: adminUser.id,
    subscription_id: priorityMembers[0].subscription_id,
    checked_in_at: "2026-08-09T20:08:00Z",
    subscription_status_at_entry: "active",
    decision: "allowed",
    exceptional_access_reason: null,
    warning: null,
  },
];

const coachKarim = {
  id: "00000000-0000-0000-0000-000000000060",
  full_name: "Coach Karim",
  phone: "+212600000060",
  email: "karim@masterz.test",
  status: "active",
  active_member_count: 0,
};

test("separe les fonctions de l'administration en pages", async ({ page }) => {
  let urgentCancelled = false;
  let statusPatchAttempts = 0;
  let refreshCalls = 0;
  let retryAuthorization = "";
  let stableStartedToday = false;
  let startTodayCalls = 0;
  let profilePatchCalls = 0;
  let userPatchBody: Record<string, unknown> | null = null;
  let userDeleteCalls = 0;
  let coachingAssignments: Array<Record<string, unknown>> = [];
  let coachingAssignmentCalls = 0;
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "authorization, content-type",
          "access-control-allow-methods":
            "GET, POST, PATCH, PUT, DELETE, OPTIONS",
        },
      });
      return;
    }
    let body: unknown = [];
    if (
      url.pathname === "/api/v1/auth/refresh" &&
      route.request().method() === "POST"
    ) {
      refreshCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          access_token: "refreshed-access-token",
          refresh_token: "refreshed-refresh-token",
          token_type: "bearer",
          expires_in: 1800,
          user: adminUser,
        }),
      });
      return;
    }
    if (url.pathname === "/api/v1/users/me") body = adminUser;
    if (
      url.pathname === "/api/v1/users" &&
      route.request().method() === "GET"
    ) {
      body = directoryUsers;
    }
    if (
      url.pathname === `/api/v1/users/${directoryUsers[10].id}` &&
      route.request().method() === "PATCH"
    ) {
      userPatchBody = route.request().postDataJSON();
      body = { ...directoryUsers[10], ...userPatchBody, password: undefined };
    }
    if (
      url.pathname === `/api/v1/users/${directoryUsers[10].id}` &&
      route.request().method() === "DELETE"
    ) {
      userDeleteCalls += 1;
      await route.fulfill({
        status: 204,
        headers: { "access-control-allow-origin": "*" },
      });
      return;
    }
    if (url.pathname === "/api/v1/coaching/coaches") {
      body = [
        {
          ...coachKarim,
          active_member_count: coachingAssignments.filter(
            (assignment) => assignment.coach_id === coachKarim.id,
          ).length,
        },
      ];
    }
    if (
      url.pathname === "/api/v1/coaching/assignments" &&
      route.request().method() === "GET"
    ) {
      body = coachingAssignments;
    }
    if (
      url.pathname === "/api/v1/coaching/assignments" &&
      route.request().method() === "POST"
    ) {
      coachingAssignmentCalls += 1;
      const payload = route.request().postDataJSON();
      const member = priorityMembers.find(
        (item) => item.id === payload.member_id,
      )!;
      const assignment = {
        id: "00000000-0000-0000-0000-000000000061",
        coach_id: coachKarim.id,
        coach_name: coachKarim.full_name,
        member_id: member.id,
        member_name: member.full_name,
        member_number: member.member_number,
        assigned_by_id: adminUser.id,
        started_at: "2026-08-16T16:00:00Z",
        ended_at: null,
        reason: payload.reason,
        created_at: "2026-08-16T16:00:00Z",
        updated_at: "2026-08-16T16:00:00Z",
      };
      coachingAssignments = [assignment];
      body = assignment;
    }
    if (
      url.pathname.startsWith("/api/v1/coaching/assignments/") &&
      url.pathname.endsWith("/end") &&
      route.request().method() === "PATCH"
    ) {
      const assignment = coachingAssignments[0];
      coachingAssignments = [];
      body = { ...assignment, ended_at: "2026-08-16T17:00:00Z" };
    }
    if (
      url.pathname ===
        `/api/v1/users/${priorityMembers[0].id}/member-profile` &&
      route.request().method() === "PATCH"
    ) {
      profilePatchCalls += 1;
      const payload = route.request().postDataJSON();
      body = {
        ...adminUser,
        id: priorityMembers[0].id,
        full_name: payload.full_name,
        phone: payload.phone,
        email: payload.email,
        date_of_birth: payload.date_of_birth,
        gender: payload.gender,
        role: "member",
        status: "active",
        member_number: priorityMembers[0].member_number,
      };
    }
    if (url.pathname === "/api/v1/membership-plans") {
      body = [activePlan, coachingPlan, recoveryPlan];
    }
    if (url.pathname === "/api/v1/members/subscription-summaries") {
      const query = url.searchParams.get("query")?.toLocaleLowerCase() ?? "";
      body = priorityMembers
        .map((member) => {
          if (urgentCancelled && member.id === priorityMembers[0].id) {
            return {
              ...member,
              status: "cancelled",
              effective_status: "cancelled",
              days_remaining: null,
            };
          }
          if (stableStartedToday && member.id === priorityMembers[1].id) {
            return {
              ...member,
              starts_on: "2026-08-16",
              ends_on: "2027-08-15",
              days_remaining: 364,
            };
          }
          return member;
        })
        .filter((member) =>
          `${member.full_name} ${member.phone} ${member.member_number}`
            .toLocaleLowerCase()
            .includes(query),
        );
    }
    if (
      url.pathname === `/api/v1/members/${priorityMembers[0].id}/subscriptions`
    ) {
      body = [
        urgentCancelled
          ? {
              ...urgentSubscription,
              status: "cancelled",
              effective_status: "cancelled",
            }
          : urgentSubscription,
      ];
    }
    if (
      url.pathname ===
        `/api/v1/subscriptions/${urgentSubscription.id}/status` &&
      route.request().method() === "PATCH"
    ) {
      statusPatchAttempts += 1;
      if (statusPatchAttempts === 1) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({
            detail: {
              code: "authentication_required",
              message: "Authentification requise.",
            },
          }),
        });
        return;
      }
      retryAuthorization = route.request().headers()["authorization"] ?? "";
      urgentCancelled = true;
      body = {
        ...urgentSubscription,
        status: "cancelled",
        effective_status: "cancelled",
      };
    }
    if (
      url.pathname ===
        `/api/v1/subscriptions/${priorityMembers[1].subscription_id}/dates` &&
      route.request().method() === "PATCH"
    ) {
      startTodayCalls += 1;
      stableStartedToday = true;
      body = {
        id: priorityMembers[1].subscription_id,
        member_id: priorityMembers[1].id,
        plan_id: activePlan.id,
        status: "active",
        effective_status: "active",
        starts_on: "2026-08-16",
        ends_on: "2027-08-15",
        grace_ends_on: "2027-08-19",
        plan_name: activePlan.name,
        duration_months: activePlan.duration_months,
        price: activePlan.price,
        currency: activePlan.currency,
        service_type: activePlan.service_type,
        created_by_id: adminUser.id,
        created_at: "2026-08-16T12:00:00Z",
        updated_at: "2026-08-16T12:00:00Z",
      };
    }
    if (
      url.pathname ===
      `/api/v1/payments/members/${priorityMembers[0].id}/receipts`
    ) {
      body = [urgentReceipt];
    }
    if (
      url.pathname === `/api/v1/attendance/members/${priorityMembers[0].id}`
    ) {
      body = urgentAttendance;
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
    window.localStorage.setItem("access_token", "test-access-token");
    window.localStorage.setItem("refresh_token", "test-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  }, adminUser);

  await page.goto("/espace/admin");

  await expect(
    page.getByRole("heading", { name: "Bonjour, Admin." }),
  ).toBeVisible();
  const navigation = page.getByRole("navigation", {
    name: "Navigation administration",
  });
  await expect(
    navigation.getByRole("link", { name: "Utilisateurs" }),
  ).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Membres" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Coachs" })).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Demandes" }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Paiements" }),
  ).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Entrees" })).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Journal d'audit" }),
  ).toBeVisible();

  await navigation.getByRole("link", { name: "Utilisateurs" }).click();
  await expect(page).toHaveURL(/\/espace\/admin\/utilisateurs$/);
  await expect(page.getByText("1-10 sur 12 compte(s)")).toBeVisible();
  await expect(page.getByText("Coach Test 11", { exact: true })).toHaveCount(0);

  await page.getByRole("tab", { name: /Coaching/ }).click();
  await expect(page.getByText("1-6 sur 6 compte(s)")).toBeVisible();
  await page.getByLabel("Rechercher un utilisateur").fill("Coach Test 11");
  await expect(page.getByText("Coach Test 11", { exact: true })).toBeVisible();
  await expect(page.getByText("1-1 sur 1 compte(s)")).toBeVisible();
  await page.getByRole("button", { name: "Modifier Coach Test 11" }).click();
  const accountDialog = page.getByRole("dialog", {
    name: "Modifier Coach Test 11",
  });
  await expect(accountDialog).toBeVisible();
  await accountDialog.getByLabel("Nom complet").fill("Coach Test 11 Modifie");
  await accountDialog
    .getByLabel("Nouveau mot de passe (optionnel)")
    .fill("NouveauLocal123!");
  await accountDialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Compte mis a jour.")).toBeVisible();
  expect(userPatchBody).toMatchObject({
    full_name: "Coach Test 11 Modifie",
    password: "NouveauLocal123!",
    reason: "Mise a jour du compte",
  });

  await page.getByRole("button", { name: "Modifier Coach Test 11" }).click();
  await accountDialog
    .getByRole("button", { name: "Supprimer le compte" })
    .click();
  await accountDialog
    .getByRole("button", { name: "Supprimer definitivement" })
    .click();
  await expect(page.getByText("Compte supprime.")).toBeVisible();
  expect(userDeleteCalls).toBe(1);

  await navigation.getByRole("link", { name: "Membres" }).click();
  await expect(page).toHaveURL(/\/espace\/admin\/membres$/);
  await expect(
    page.getByRole("heading", { name: "Membres", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Membre Urgent", { exact: true })).toBeVisible();
  await expect(page.getByText("Membre Stable", { exact: true })).toBeVisible();

  await page.getByLabel("Filtrer les membres").selectOption("expiring");
  await expect(page.getByText("Membre Urgent", { exact: true })).toBeVisible();
  await expect(page.getByText("Membre Stable", { exact: true })).toBeHidden();
  await page.getByLabel("Filtrer les membres").selectOption("all");

  await page.getByText("Membre Urgent", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Informations personnelles" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nom complet")).toHaveValue("Membre Urgent");
  await page.getByLabel("Nom complet").fill("Membre Urgent Modifie");
  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await expect(
    page.getByText("Informations du membre mises a jour."),
  ).toBeVisible();
  expect(profilePatchCalls).toBe(1);
  await page.getByRole("button", { name: "Abonnements" }).click();
  await expect(
    page.getByRole("heading", { name: "Abonnements" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Recus" }).click();
  await expect(page.getByRole("heading", { name: "Reçus" })).toBeVisible();
  await page.getByRole("button", { name: "Entrees" }).click();
  await expect(
    page.getByRole("heading", { name: "Historique des entrees" }),
  ).toBeVisible();

  const memberSearch = page.getByRole("textbox", {
    name: "Rechercher un membre",
  });
  const urgentMemberCard = page
    .locator("button")
    .filter({ hasText: "TMG-URGENT" });
  await memberSearch.fill("Stable");
  await expect(page.getByText("Membre Stable", { exact: true })).toBeVisible();
  await expect(urgentMemberCard).toBeHidden();
  await memberSearch.fill("");
  await expect(urgentMemberCard).toBeVisible();

  await navigation.getByRole("link", { name: "Coachs" }).click();
  await expect(page).toHaveURL(/\/espace\/admin\/coachs$/);
  await expect(
    page.getByRole("heading", { name: "Coachs", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Coach Karim", exact: true }),
  ).toBeVisible();
  await page
    .locator("button")
    .filter({ hasText: priorityMembers[1].member_number })
    .click();
  await page.getByRole("button", { name: "Affecter a ce coach" }).click();
  await expect(
    page.getByText("Le membre a ete affecte au coach."),
  ).toBeVisible();
  await expect(
    page.getByText(priorityMembers[1].full_name, { exact: true }).last(),
  ).toBeVisible();
  expect(coachingAssignmentCalls).toBe(1);

  await navigation.getByRole("link", { name: "Paiements" }).click();
  await expect(page).toHaveURL(/\/espace\/admin\/paiements$/);
  await expect(
    page.getByRole("heading", { name: "Paiements", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Membre Urgent", { exact: true })).toBeVisible();
  await expect(page.getByText("Membre Stable", { exact: true })).toBeVisible();
  await expect(
    page.getByText("2 jours restants", { exact: true }),
  ).toBeVisible();

  const memberCards = page.locator("button").filter({ hasText: "TMG-" });
  await expect(memberCards.first()).toContainText("Membre Urgent");
  await page.getByText("Membre Urgent", { exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Abonnements" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reçus" })).toBeVisible();
  await expect(page.getByText("Paiement enregistre le :")).toBeVisible();
  await expect(page.getByText("Abonnement du :")).toBeVisible();
  await expect(
    page.getByText("Abonnement Salle musculation encore valide"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nouveau paiement / renouvellement" }),
  ).toBeVisible();

  await page
    .getByLabel(`Statut de ${activePlan.name}`)
    .selectOption("cancelled");
  await expect(
    page.getByRole("heading", { name: "Nouveau paiement / renouvellement" }),
  ).toBeVisible();
  const expectedToday = await page.evaluate(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  await expect(page.getByLabel("Date de debut de l'abonnement")).toHaveValue(
    expectedToday,
  );
  await expect(page.getByLabel("Paiement")).not.toContainText("Virement");
  expect(refreshCalls).toBe(1);
  expect(statusPatchAttempts).toBe(2);
  expect(retryAuthorization).toBe("Bearer refreshed-access-token");
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem("access_token")),
    )
    .toBe("refreshed-access-token");

  const dossierHeadings = await page.locator("h3").allTextContents();
  const subscriptionIndex = dossierHeadings.indexOf("Abonnements");
  const receiptsIndex = dossierHeadings.indexOf("Reçus");
  const paymentIndex = dossierHeadings.indexOf(
    "Nouveau paiement / renouvellement",
  );
  expect(subscriptionIndex).toBeGreaterThanOrEqual(0);
  expect(receiptsIndex).toBeGreaterThan(subscriptionIndex);
  expect(paymentIndex).toBeGreaterThan(receiptsIndex);

  await navigation.getByRole("link", { name: "Entrees" }).click();
  await expect(page).toHaveURL(/\/espace\/admin\/acces$/);
  await expect(page.getByText("Membre Urgent", { exact: true })).toBeVisible();
  await expect(page.getByText("Membre Stable", { exact: true })).toBeVisible();
  await page.getByText("Membre Stable", { exact: true }).click();
  await expect(page.getByText("Abonnement a venir")).toBeVisible();
  await page
    .getByRole("button", { name: "Commencer l'abonnement aujourd'hui" })
    .click();
  await expect(
    page.getByRole("button", { name: "Enregistrer l'entree" }),
  ).toBeVisible();
  expect(startTodayCalls).toBe(1);
  await expect(page.getByLabel("Motif d'acces exceptionnel")).toHaveCount(0);

  await page.getByText("Membre Urgent", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Historique des entrees" }),
  ).toBeVisible();
  await expect(page.getByText("Entree enregistree")).toHaveCount(2);
  await expect(page.getByText("Motif : Validation responsable")).toBeVisible();
  await expect(
    page.getByText("Abonnement lors du passage : Annulé"),
  ).toBeVisible();
  await expect(
    page.getByText("Hna kaybano ghir les passages li tsajlo b date w sa3a."),
  ).toBeVisible();
});

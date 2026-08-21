import { expect, test } from "@playwright/test";

const coach = {
  id: "00000000-0000-0000-0000-000000000101",
  full_name: "Coach Karim",
  phone: "+212600000101",
  email: "coach@masterz.test",
  date_of_birth: null,
  gender: "male",
  role: "coach",
  status: "active",
  member_number: null,
  created_at: "2026-08-20T08:00:00Z",
  updated_at: "2026-08-20T08:00:00Z",
};

const memberId = "00000000-0000-0000-0000-000000000102";
const assignment = {
  id: "00000000-0000-0000-0000-000000000103",
  coach_id: coach.id,
  coach_name: coach.full_name,
  member_id: memberId,
  member_name: "Sara Coaching",
  member_number: "TMG-COACH-01",
  assigned_by_id: "00000000-0000-0000-0000-000000000104",
  started_at: "2026-08-19T08:00:00Z",
  ended_at: null,
  reason: "Choix du membre",
  created_at: "2026-08-19T08:00:00Z",
  updated_at: "2026-08-19T08:00:00Z",
};

test("coach enregistre l'objectif et les tests de son client", async ({
  page,
}) => {
  let objective: null | {
    objective: string;
    updated_by_id: string;
    updated_by_name: string;
    updated_at: string;
  } = null;
  let savedObjective = "";
  const assessments: Array<Record<string, unknown>> = [];

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = {};

    if (path === "/api/v1/users/me") body = coach;
    if (path === "/api/v1/coaching/my-members") body = [assignment];
    if (path === `/api/v1/coaching/members/${memberId}/tracking`) {
      body = {
        member_id: memberId,
        member_name: assignment.member_name,
        member_number: assignment.member_number,
        coach_id: coach.id,
        coach_name: coach.full_name,
        objective,
        assessments,
      };
    }
    if (
      path === `/api/v1/coaching/members/${memberId}/objective` &&
      request.method() === "PATCH"
    ) {
      const payload = request.postDataJSON();
      savedObjective = payload.objective;
      objective = {
        objective: payload.objective,
        updated_by_id: coach.id,
        updated_by_name: coach.full_name,
        updated_at: "2026-08-20T10:00:00Z",
      };
      body = objective;
    }
    if (
      path === `/api/v1/coaching/members/${memberId}/assessments` &&
      request.method() === "POST"
    ) {
      const payload = request.postDataJSON();
      const assessment = {
        id: "00000000-0000-0000-0000-000000000105",
        assignment_id: assignment.id,
        member_id: memberId,
        coach_id: coach.id,
        coach_name: coach.full_name,
        ...payload,
        created_at: "2026-08-20T10:05:00Z",
      };
      assessments.unshift(assessment);
      body = assessment;
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
    localStorage.setItem("access_token", "coach-access-token");
    localStorage.setItem("refresh_token", "coach-refresh-token");
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, coach);
  await page.goto("/espace/coach");

  await expect(
    page.getByRole("heading", { name: "Sara Coaching", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Objectif du client")
    .fill("Gagner en force et ameliorer sa mobilite");
  await page.getByRole("button", { name: /Enregistrer l'objectif/ }).click();
  await expect(page.getByText("Objectif coaching enregistre.")).toBeVisible();

  const testSelect = page.getByLabel("Type de test");
  await expect(testSelect.locator("option")).toHaveText([
    "Impedancemetre",
    "Test neuromusculaire",
    "Mesures du corps",
    "Test RM de force",
    "Enquete alimentaire",
  ]);
  await testSelect.selectOption("body_measurements");
  await page.getByLabel("Taille (cm)", { exact: true }).fill("170");
  await page.getByLabel("Tour de taille (cm)", { exact: true }).fill("74");
  await page.getByLabel("Notes du coach").fill("Mesure initiale");
  await page
    .getByRole("button", { name: /Enregistrer dans l'historique/ })
    .click();

  await expect(
    page.getByText("Mesures du corps enregistre dans l'historique."),
  ).toBeVisible();
  await expect(page.getByText("Mesure initiale")).toBeVisible();
  expect(savedObjective).toContain("Gagner en force");
  expect(assessments).toHaveLength(1);
});

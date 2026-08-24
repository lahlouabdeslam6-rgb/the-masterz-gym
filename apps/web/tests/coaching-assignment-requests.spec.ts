import { expect, test } from "@playwright/test";

const member = {
  id: "00000000-0000-0000-0000-000000000701",
  full_name: "Sara Coaching",
  phone: "+212600000701",
  email: "sara.coaching@masterz.test",
  date_of_birth: null,
  gender: "female",
  role: "member",
  status: "active",
  member_number: "TMG-COACHING-701",
  created_at: "2026-08-24T08:00:00Z",
  updated_at: "2026-08-24T08:00:00Z",
};

const receptionist = {
  id: "00000000-0000-0000-0000-000000000702",
  full_name: "Reception Coaching",
  phone: "+212600000702",
  email: "reception.coaching@masterz.test",
  date_of_birth: null,
  gender: "female",
  role: "receptionist",
  status: "active",
  member_number: null,
  created_at: "2026-08-24T08:00:00Z",
  updated_at: "2026-08-24T08:00:00Z",
};

const coaches = [
  {
    id: "00000000-0000-0000-0000-000000000703",
    full_name: "Coach Karim",
    status: "active",
    active_member_count: 4,
  },
  {
    id: "00000000-0000-0000-0000-000000000704",
    full_name: "Coach Nadia",
    status: "active",
    active_member_count: 2,
  },
];

test("le membre choisit un coach et la reception confirme la demande", async ({
  page,
}) => {
  let currentUser: typeof member | typeof receptionist = member;
  let pendingRequests: Array<Record<string, unknown>> = [];
  let requestedCoachId = "";
  let approvedCoachId = "";

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = [];
    let status = 200;

    if (path === "/api/v1/users/me") body = currentUser;
    if (path === `/api/v1/members/${member.id}/subscriptions`) {
      body = [
        {
          id: "00000000-0000-0000-0000-000000000705",
          service_type: "coaching",
          status: "active",
          effective_status: "active",
        },
      ];
    }
    if (path === "/api/v1/coaching/my-assignment") body = null;
    if (path === "/api/v1/coaching/directory") body = coaches;
    if (path === "/api/v1/coaching/assignment-requests") {
      if (request.method() === "POST") {
        const payload = request.postDataJSON();
        requestedCoachId = payload.preferred_coach_id;
        const created = {
          id: "00000000-0000-0000-0000-000000000706",
          member_id: member.id,
          member_name: member.full_name,
          member_number: member.member_number,
          preferred_coach_id: requestedCoachId,
          preferred_coach_name: coaches[1].full_name,
          assigned_coach_id: null,
          assigned_coach_name: null,
          status: "pending",
          member_note: payload.member_note,
          decision_note: null,
          decided_by_id: null,
          decided_by_name: null,
          decided_at: null,
          created_at: "2026-08-24T10:00:00Z",
          updated_at: "2026-08-24T10:00:00Z",
        };
        pendingRequests = [created];
        body = created;
        status = 201;
      } else {
        body = pendingRequests;
      }
    }
    if (
      path ===
        "/api/v1/coaching/assignment-requests/00000000-0000-0000-0000-000000000706/decision" &&
      request.method() === "PATCH"
    ) {
      const payload = request.postDataJSON();
      approvedCoachId = payload.coach_id;
      body = {
        ...pendingRequests[0],
        status: "approved",
        assigned_coach_id: approvedCoachId,
        assigned_coach_name: coaches[1].full_name,
        decision_note: payload.decision_note,
        decided_by_id: receptionist.id,
        decided_by_name: receptionist.full_name,
        decided_at: "2026-08-24T10:05:00Z",
      };
      pendingRequests = [];
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await storeSession(page, member);
  await page.goto("/espace/membre");
  await page.getByRole("button", { name: "Coaching", exact: true }).click();

  await expect(
    page.getByRole("heading", {
      name: "Comment voulez-vous choisir votre coach ?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Coach Nadia/ }).click();
  await page
    .getByLabel("Message pour la demande de coach")
    .fill("Je prefere un suivi oriente force");
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();

  await expect(page.getByText("Demande en attente")).toBeVisible();
  expect(requestedCoachId).toBe(coaches[1].id);

  currentUser = receptionist;
  await storeSession(page, receptionist);
  await page.goto("/espace/reception/coaching");

  await expect(
    page.getByRole("heading", { name: "Demandes de coach", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(member.member_number).first()).toBeVisible();
  await expect(page.getByLabel("Coach a affecter a la demande")).toHaveValue(
    coaches[1].id,
  );
  await page.getByRole("button", { name: "Confirmer l'affectation" }).click();

  await expect(
    page.getByText(
      "Le coach est affecte et le membre a recu une notification.",
    ),
  ).toBeVisible();
  expect(approvedCoachId).toBe(coaches[1].id);
});

async function storeSession(
  page: import("@playwright/test").Page,
  user: typeof member | typeof receptionist,
) {
  await page.goto("/");
  await page.evaluate((currentUser) => {
    localStorage.setItem("access_token", "coaching-choice-access-token");
    localStorage.setItem("refresh_token", "coaching-choice-refresh-token");
    localStorage.setItem("auth_user", JSON.stringify(currentUser));
  }, user);
}

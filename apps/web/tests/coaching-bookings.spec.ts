import { expect, test } from "@playwright/test";

const coach = {
  id: "00000000-0000-0000-0000-000000000501",
  full_name: "Coach Planning",
  phone: "+212600000501",
  email: "planning.coach@masterz.test",
  date_of_birth: null,
  gender: "male",
  role: "coach",
  status: "active",
  member_number: null,
  created_at: "2026-08-24T08:00:00Z",
  updated_at: "2026-08-24T08:00:00Z",
};

const member = {
  id: "00000000-0000-0000-0000-000000000502",
  full_name: "Membre Planning",
  phone: "+212600000502",
  email: "planning.member@masterz.test",
  date_of_birth: null,
  gender: "female",
  role: "member",
  status: "active",
  member_number: "TMG-PLANNING-01",
  created_at: "2026-08-24T08:00:00Z",
  updated_at: "2026-08-24T08:00:00Z",
};

const assignment = {
  id: "00000000-0000-0000-0000-000000000503",
  coach_id: coach.id,
  coach_name: coach.full_name,
  member_id: member.id,
  member_name: member.full_name,
  member_number: member.member_number,
  assigned_by_id: "00000000-0000-0000-0000-000000000504",
  started_at: "2026-08-24T08:00:00Z",
  ended_at: null,
  reason: "Planning coaching",
  created_at: "2026-08-24T08:00:00Z",
  updated_at: "2026-08-24T08:00:00Z",
};

const availability = {
  id: "00000000-0000-0000-0000-000000000505",
  coach_id: coach.id,
  coach_name: coach.full_name,
  starts_at: "2026-08-30T09:00:00Z",
  ends_at: "2026-08-30T10:00:00Z",
  note: "Seance individuelle",
  is_active: true,
  requested_booking_count: 1,
  confirmed_booking_count: 0,
  created_at: "2026-08-24T08:00:00Z",
  updated_at: "2026-08-24T08:00:00Z",
};

function booking(status: "requested" | "confirmed" = "requested") {
  return {
    id: "00000000-0000-0000-0000-000000000506",
    availability_id: availability.id,
    assignment_id: assignment.id,
    coach_id: coach.id,
    coach_name: coach.full_name,
    member_id: member.id,
    member_name: member.full_name,
    member_number: member.member_number,
    starts_at: availability.starts_at,
    ends_at: availability.ends_at,
    status,
    member_note: "Travail de force",
    decision_note: status === "confirmed" ? "Confirmee" : null,
    decided_by_id: status === "confirmed" ? coach.id : null,
    decided_by_name: status === "confirmed" ? coach.full_name : null,
    decided_at: status === "confirmed" ? "2026-08-24T09:00:00Z" : null,
    conflict_override: status === "confirmed",
    overlapping_confirmed_count: status === "confirmed" ? 1 : 0,
    created_at: "2026-08-24T08:30:00Z",
    updated_at: "2026-08-24T08:30:00Z",
  };
}

async function storeSession(
  page: import("@playwright/test").Page,
  user: typeof coach | typeof member,
) {
  await page.goto("/");
  await page.evaluate((currentUser) => {
    localStorage.setItem("access_token", "planning-access-token");
    localStorage.setItem("refresh_token", "planning-refresh-token");
    localStorage.setItem("auth_user", JSON.stringify(currentUser));
  }, user);
}

test("coach ajoute un creneau et confirme explicitement un conflit", async ({
  page,
}) => {
  const availabilities = [{ ...availability }];
  let currentBooking = booking();
  let confirmCalls = 0;
  let overrideSent = false;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = [];
    let status = 200;

    if (path === "/api/v1/users/me") body = coach;
    if (path === "/api/v1/coaching/my-members") body = [assignment];
    if (path === `/api/v1/coaching/members/${member.id}/tracking`) {
      body = {
        member_id: member.id,
        member_name: member.full_name,
        member_number: member.member_number,
        coach_id: coach.id,
        coach_name: coach.full_name,
        objective: null,
        assessments: [],
      };
    }
    if (path === "/api/v1/coaching/availability") {
      if (request.method() === "POST") {
        const payload = request.postDataJSON();
        const created = {
          ...availability,
          id: "00000000-0000-0000-0000-000000000507",
          starts_at: payload.starts_at,
          ends_at: payload.ends_at,
          note: payload.note,
          requested_booking_count: 0,
        };
        availabilities.push(created);
        body = created;
      } else {
        body = availabilities;
      }
    }
    if (path === "/api/v1/coaching/bookings") body = [currentBooking];
    if (
      path === `/api/v1/coaching/bookings/${currentBooking.id}/status` &&
      request.method() === "PATCH"
    ) {
      confirmCalls += 1;
      const payload = request.postDataJSON();
      overrideSent = payload.confirm_overlap === true;
      if (!overrideSent) {
        status = 409;
        body = {
          detail: {
            code: "coaching_booking_overlap",
            message: "Ce coach a deja une seance confirmee.",
            details: { conflicts: [] },
          },
        };
      } else {
        currentBooking = booking("confirmed");
        body = currentBooking;
      }
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await storeSession(page, coach);
  await page.goto("/espace/coach");
  await page.getByRole("button", { name: "Mon planning", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Mon planning" }).first(),
  ).toBeVisible();
  await page.getByLabel("Debut du creneau coaching").fill("2026-08-31T14:00");
  await page.getByLabel("Fin du creneau coaching").fill("2026-08-31T15:00");
  await page.getByLabel("Note du creneau coaching").fill("Technique et force");
  await page.getByRole("button", { name: /Ajouter au planning/ }).click();
  await expect(
    page.getByText("Disponibilite ajoutee au planning."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Confirmer", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Deux seances au meme moment" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmer quand meme" }).click();
  await expect(page.getByText("Reservation: Confirmee.")).toBeVisible();
  expect(confirmCalls).toBe(2);
  expect(overrideSent).toBe(true);
});

test("membre reserve un creneau propose par son coach", async ({ page }) => {
  const bookings: Array<ReturnType<typeof booking>> = [];
  let reservedAvailability = "";

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = [];

    if (path === "/api/v1/users/me") body = member;
    if (path === `/api/v1/members/${member.id}/subscriptions`) {
      body = [
        {
          id: "00000000-0000-0000-0000-000000000508",
          service_type: "coaching",
          status: "active",
          effective_status: "active",
        },
      ];
    }
    if (path === "/api/v1/coaching/my-assignment") body = assignment;
    if (path === "/api/v1/coaching/assignment-requests") body = [];
    if (path === "/api/v1/coaching/directory") {
      body = [
        {
          id: coach.id,
          full_name: coach.full_name,
          status: "active",
          active_member_count: 1,
        },
      ];
    }
    if (path === "/api/v1/coaching/availability") body = [availability];
    if (path === "/api/v1/coaching/bookings") {
      if (request.method() === "POST") {
        const payload = request.postDataJSON();
        reservedAvailability = payload.availability_id;
        bookings.push(booking());
        body = bookings[0];
      } else {
        body = bookings;
      }
    }
    if (path === `/api/v1/coaching/members/${member.id}/tracking`) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          detail: { code: "tracking_not_found", message: "Introuvable." },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await storeSession(page, member);
  await page.goto("/espace/membre");
  await page.getByRole("button", { name: "Coaching", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Mes seances coaching" }),
  ).toBeVisible();
  await page
    .getByLabel(`Note reservation ${availability.id}`)
    .fill("Bghit nkhdem 3la lforce");
  await page.getByRole("button", { name: "Reserver ce creneau" }).click();
  await expect(
    page.getByText(
      "Reservation envoyee. Votre coach doit maintenant la confirmer.",
    ),
  ).toBeVisible();
  expect(reservedAvailability).toBe(availability.id);
});

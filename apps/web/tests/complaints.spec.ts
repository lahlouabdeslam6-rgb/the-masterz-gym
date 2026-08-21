import { expect, test } from "@playwright/test";

const member = {
  id: "00000000-0000-0000-0000-000000000410",
  full_name: "Membre Reclamation",
  phone: "+212600000410",
  email: "reclamation@masterz.test",
  date_of_birth: null,
  gender: "male",
  role: "member",
  status: "active",
  member_number: "TMG-RECLAMATION",
  created_at: "2026-08-21T10:00:00Z",
  updated_at: "2026-08-21T10:00:00Z",
};

const receptionist = {
  ...member,
  id: "00000000-0000-0000-0000-000000000411",
  full_name: "Reception Reclamation",
  phone: "+212600000411",
  email: "reception-reclamation@masterz.test",
  role: "receptionist",
  member_number: null,
};

test("le membre cree une reclamation dirigee vers la reception", async ({
  page,
}) => {
  let createdBody: Record<string, unknown> | null = null;
  const complaints: Array<Record<string, unknown>> = [];

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    let status = 200;
    if (url.pathname === "/api/v1/users/me") body = member;
    if (url.pathname === "/api/v1/complaints") {
      if (route.request().method() === "POST") {
        createdBody = route.request().postDataJSON();
        body = {
          id: "00000000-0000-0000-0000-000000000412",
          member_id: member.id,
          member_name: member.full_name,
          member_number: member.member_number,
          category: (createdBody as { category: string }).category,
          assigned_role: "receptionist",
          subject: (createdBody as { subject: string }).subject,
          status: "open",
          created_at: "2026-08-21T10:00:00Z",
          updated_at: "2026-08-21T10:00:00Z",
          messages: [
            {
              id: "00000000-0000-0000-0000-000000000413",
              author_id: member.id,
              author_name: member.full_name,
              author_role: "member",
              body: (createdBody as { message: string }).message,
              created_at: "2026-08-21T10:00:00Z",
            },
          ],
        };
        complaints.unshift(body as Record<string, unknown>);
        status = 201;
      } else {
        body = complaints;
      }
    }
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

  await storeSession(page, member);
  await page.goto("/espace/membre");
  await page.getByRole("button", { name: "Reclamations", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mes reclamations" }),
  ).toBeVisible();

  await page.getByLabel("Categorie").selectOption("payment");
  await page.getByLabel("Sujet").fill("Probleme avec mon recu");
  await page
    .getByLabel("Votre message")
    .fill("Le montant de mon recu n'est pas correct.");
  await expect(page.getByText("Destinataire: Reception")).toBeVisible();
  await page.getByRole("button", { name: "Envoyer la reclamation" }).click();

  await expect(
    page.getByText("Reclamation envoyee a Reception."),
  ).toBeVisible();
  await expect(page.getByText("Probleme avec mon recu").first()).toBeVisible();
  expect(createdBody).toMatchObject({
    category: "payment",
    subject: "Probleme avec mon recu",
    message: "Le montant de mon recu n'est pas correct.",
  });
});

test("la reception repond et change le statut dans sa page", async ({
  page,
}) => {
  let statusValue = "open";
  let replyBody: Record<string, unknown> | null = null;
  const complaintId = "00000000-0000-0000-0000-000000000420";
  const messages: Array<Record<string, unknown>> = [
    {
      id: "00000000-0000-0000-0000-000000000421",
      author_id: member.id,
      author_name: member.full_name,
      author_role: "member",
      body: "Le montant de mon recu n'est pas correct.",
      created_at: "2026-08-21T10:00:00Z",
    },
  ];

  function complaint() {
    return {
      id: complaintId,
      member_id: member.id,
      member_name: member.full_name,
      member_number: member.member_number,
      category: "payment",
      assigned_role: "receptionist",
      subject: "Probleme avec mon recu",
      status: statusValue,
      created_at: "2026-08-21T10:00:00Z",
      updated_at: "2026-08-21T10:00:00Z",
      messages,
    };
  }

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/api/v1/users/me") body = receptionist;
    if (url.pathname === "/api/v1/complaints") body = [complaint()];
    if (
      url.pathname === `/api/v1/complaints/${complaintId}/messages` &&
      route.request().method() === "POST"
    ) {
      replyBody = route.request().postDataJSON();
      messages.push({
        id: "00000000-0000-0000-0000-000000000422",
        author_id: receptionist.id,
        author_name: receptionist.full_name,
        author_role: "receptionist",
        body: (replyBody as { body: string }).body,
        created_at: "2026-08-21T10:05:00Z",
      });
      body = complaint();
    }
    if (
      url.pathname === `/api/v1/complaints/${complaintId}/status` &&
      route.request().method() === "PATCH"
    ) {
      statusValue = (route.request().postDataJSON() as { status: string })
        .status;
      body = complaint();
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await storeSession(page, receptionist);
  await page.goto("/espace/reception/reclamations");
  await expect(
    page.getByRole("heading", { name: "Reclamations", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(member.full_name, { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Ajouter une reponse").fill("Nous verifions le recu.");
  await page.getByRole("button", { name: "Envoyer la reponse" }).click();
  await expect(page.getByText("Nous verifions le recu.")).toBeVisible();
  expect(replyBody).toEqual({ body: "Nous verifions le recu." });

  await page.getByLabel("Statut de la reclamation").selectOption("in_progress");
  await expect(page.getByText("Statut modifie: En cours.")).toBeVisible();
  expect(statusValue).toBe("in_progress");
});

async function storeSession(
  page: import("@playwright/test").Page,
  user: Record<string, unknown>,
) {
  await page.goto("/");
  await page.evaluate((sessionUser) => {
    window.localStorage.setItem("access_token", "complaint-access-token");
    window.localStorage.setItem("refresh_token", "complaint-refresh-token");
    window.localStorage.setItem("auth_user", JSON.stringify(sessionUser));
  }, user);
}

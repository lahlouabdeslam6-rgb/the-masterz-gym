import { expect, test } from "@playwright/test";

import { apiRequestPath } from "./support/api-request";

const coach = {
  id: "00000000-0000-0000-0000-000000000601",
  full_name: "Coach Messages",
  phone: "+212600000601",
  email: "coach.messages@masterz.test",
  date_of_birth: null,
  gender: "male",
  role: "coach",
  status: "active",
  member_number: null,
  profile_photo_url: null,
  created_at: "2026-08-27T08:00:00Z",
  updated_at: "2026-08-27T08:00:00Z",
};

const member = {
  id: "00000000-0000-0000-0000-000000000602",
  full_name: "Membre Messages",
  member_number: "TMG-MSG-01",
};

const assignment = {
  id: "00000000-0000-0000-0000-000000000603",
  coach_id: coach.id,
  coach_name: coach.full_name,
  member_id: member.id,
  member_name: member.full_name,
  member_number: member.member_number,
  assigned_by_id: "00000000-0000-0000-0000-000000000604",
  started_at: "2026-08-26T08:00:00Z",
  ended_at: null,
  reason: "Suivi individuel",
  created_at: "2026-08-26T08:00:00Z",
  updated_at: "2026-08-26T08:00:00Z",
};

const conversation = {
  assignment_id: assignment.id,
  coach_id: coach.id,
  coach_name: coach.full_name,
  member_id: member.id,
  member_name: member.full_name,
  member_number: member.member_number,
  is_active: true,
  last_message: {
    id: "00000000-0000-0000-0000-000000000605",
    assignment_id: assignment.id,
    sender_id: member.id,
    sender_name: member.full_name,
    sender_role: "member",
    body: "Hadi lmakla dyal lyom.",
    media_url: null,
    media_type: null,
    created_at: "2026-08-27T09:00:00Z",
  },
};

test("coach ychof conversation dyal client w ysift message", async ({
  page,
}) => {
  const messages = [conversation.last_message];
  let sent = false;

  await page.addInitScript(() => {
    const stream = {
      getTracks: () => [{ stop: () => undefined }],
    };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });

    class TestMediaRecorder {
      static isTypeSupported(type: string) {
        return type.startsWith("audio/webm");
      }

      state: "inactive" | "recording" = "inactive";
      mimeType = "audio/webm;codecs=opus";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;

      start() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
        this.ondataavailable?.({
          data: new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], {
            type: "audio/webm",
          }),
        });
        this.onstop?.();
      }
    }

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: TestMediaRecorder,
    });
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = apiRequestPath(request.url());
    let body: unknown = [];
    let status = 200;

    if (path === "/api/v1/users/me") body = coach;
    if (path === "/api/v1/coaching/my-members") body = [assignment];
    if (path === "/api/v1/coaching/conversations") body = [conversation];
    if (path === `/api/v1/coaching/conversations/${assignment.id}/messages`) {
      if (request.method() === "POST") {
        sent = true;
        const created = {
          id: "00000000-0000-0000-0000-000000000606",
          assignment_id: assignment.id,
          sender_id: coach.id,
          sender_name: coach.full_name,
          sender_role: "coach",
          body: "Mzyan, kemel hakak.",
          media_url: null,
          media_type: null,
          created_at: "2026-08-27T09:05:00Z",
        };
        messages.push(created);
        body = created;
        status = 201;
      } else {
        body = messages;
      }
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await page.goto("/");
  await page.evaluate((currentUser) => {
    localStorage.setItem("access_token", "messages-access-token");
    localStorage.setItem("refresh_token", "messages-refresh-token");
    localStorage.setItem("auth_user", JSON.stringify(currentUser));
  }, coach);
  await page.goto("/espace/coach");
  await page
    .getByRole("button", { name: "Messages clients", exact: true })
    .click();

  await expect(
    page.getByRole("heading", { name: "Messages avec mes clients" }),
  ).toBeVisible();
  await expect(page.getByText(member.full_name).first()).toBeVisible();
  await expect(
    page.getByRole("article").getByText("Hadi lmakla dyal lyom."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Micro", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stopper", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stopper", exact: true }).click();
  await expect(page.getByText("Audio pret", { exact: false })).toBeVisible();
  await page.getByLabel("Message coaching").fill("Mzyan, kemel hakak.");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByText("Mzyan, kemel hakak.")).toBeVisible();
  expect(sent).toBe(true);
});

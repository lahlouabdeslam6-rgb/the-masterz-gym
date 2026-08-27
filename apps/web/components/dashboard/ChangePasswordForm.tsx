"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Alert, Button, Card, Input } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { Field } from "./dashboard-shared";

export function ChangePasswordForm({ session }: { session: AuthSession }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setFeedback({
        type: "error",
        message: "La confirmation ne correspond pas au nouveau mot de passe.",
      });
      return;
    }
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH("/api/v1/auth/password", {
      headers: authorizationHeaders(session.accessToken),
      body: {
        current_password: currentPassword,
        new_password: newPassword,
      },
    });
    setBusy(false);
    if (result.error) {
      setFeedback({
        type: "error",
        message: errorMessage(
          result.error,
          "Le mot de passe n'a pas pu etre modifie.",
        ),
      });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    setFeedback({
      type: "success",
      message: "Votre mot de passe a ete modifie.",
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-primary/[0.1] text-primary">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-black text-white">
            Modifier mon mot de passe
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Confirmez votre mot de passe actuel avant d&apos;en choisir un
            nouveau.
          </p>
        </div>
      </div>
      {feedback ? (
        <Alert
          type={feedback.type}
          message={feedback.message}
          className="mt-5"
        />
      ) : null}
      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => void submit(event)}
      >
        <Field label="Mot de passe actuel">
          <Input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nouveau mot de passe">
            <Input
              type="password"
              autoComplete="new-password"
              minLength={10}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </Field>
          <Field label="Confirmer le nouveau mot de passe">
            <Input
              type="password"
              autoComplete="new-password"
              minLength={10}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </Field>
        </div>
        <Button type="submit" className="w-full md:w-fit" disabled={busy}>
          <KeyRound className="h-4 w-4" />
          {busy ? "Modification..." : "Modifier le mot de passe"}
        </Button>
      </form>
    </Card>
  );
}

function errorMessage(error: unknown, fallback: string) {
  const detail = (error as { detail?: { message?: unknown } } | undefined)
    ?.detail;
  return typeof detail?.message === "string" ? detail.message : fallback;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Alert, Button, Input, Label, LoadingMessage } from "@masterz/ui";
import { AuthShell } from "@/components/AuthShell";
import { api } from "@/lib/api";

export default function ActivationMembrePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: apiError } = await api.POST(
        "/api/v1/auth/member-activation/request",
        {
          body: {
            phone,
            full_name: fullName,
            member_number: memberNumber,
          },
        },
      );
      if (apiError)
        setError(
          "Impossible de vérifier votre identité. Vérifiez vos informations.",
        );
      else if (data?.challenge_id) {
        setChallengeId(data.challenge_id);
        setStep(2);
      }
    } catch {
      setError("Erreur inattendue de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: apiError } = await api.POST(
        "/api/v1/auth/member-activation/confirm",
        { body: { challenge_id: challengeId, otp, new_password: newPassword } },
      );
      if (apiError)
        setError(
          "Code OTP incorrect ou mot de passe invalide (minimum 10 caractères).",
        );
      else setStep(3);
    } catch {
      setError("Erreur inattendue de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      backHref="/connexion"
      eyebrow="Activation membre"
      title={
        step === 1
          ? "Activez votre accès en ligne."
          : step === 2
            ? "Sécurisez votre compte."
            : "Votre compte est activé."
      }
      description={
        step === 1
          ? "Déjà membre du club ? Vérifiez votre identité pour créer votre accès en ligne."
          : step === 2
            ? "Saisissez le code de vérification et choisissez votre mot de passe."
            : "Vous pouvez maintenant vous connecter à votre espace membre."
      }
    >
      <StepIndicator current={step} />
      {error ? <Alert type="error" message={error} className="mb-6" /> : null}
      {step === 1 ? (
        <form onSubmit={handleRequest} className="space-y-5">
          <Field id="phone" label="Numéro de téléphone">
            <Input
              id="phone"
              type="tel"
              placeholder="+212600000003"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </Field>
          <Field id="fullName" label="Nom complet">
            <Input
              id="fullName"
              placeholder="Votre nom complet exact"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </Field>
          <Field id="memberNumber" label="Numéro membre">
            <Input
              id="memberNumber"
              placeholder="TMG-2026-XXXXXXXX"
              value={memberNumber}
              onChange={(event) =>
                setMemberNumber(event.target.value.toUpperCase())
              }
              autoComplete="off"
              required
            />
            <p className="text-xs text-gray-600">
              Ce numéro figure sur votre dossier validé par la salle.
            </p>
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <LoadingMessage
                message="Vérification…"
                className="p-0 text-black"
              />
            ) : (
              <>
                Vérifier mon identité <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      ) : null}
      {step === 2 ? (
        <form onSubmit={handleConfirm} className="space-y-5">
          <div className="rounded-sm border border-primary/20 bg-primary/[0.06] p-4 text-xs leading-5 text-gray-300">
            En environnement local, le code OTP est visible dans les logs du
            backend.
          </div>
          <Field id="otp" label="Code de vérification">
            <Input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
              required
            />
          </Field>
          <Field id="newPassword" label="Créer un mot de passe">
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={10}
              required
            />
            <p className="text-xs text-gray-600">Minimum 10 caractères.</p>
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <LoadingMessage
                message="Activation…"
                className="p-0 text-black"
              />
            ) : (
              "Activer mon compte"
            )}
          </Button>
        </form>
      ) : null}
      {step === 3 ? (
        <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] p-6 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
          <p className="mt-4 text-sm text-gray-300">Votre accès est prêt.</p>
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => router.push("/connexion")}
          >
            Aller à la connexion
          </Button>
        </div>
      ) : null}
    </AuthShell>
  );
}

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="mb-8 grid grid-cols-3 gap-2">
      {["Identité", "Sécurité", "Terminé"].map((label, index) => (
        <div key={label}>
          <div
            className={`h-1 ${current >= index + 1 ? "bg-primary" : "bg-white/10"}`}
          />
          <p
            className={`mt-2 text-[0.6rem] font-black uppercase tracking-[0.1em] ${current >= index + 1 ? "text-primary" : "text-gray-600"}`}
          >
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

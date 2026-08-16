"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Alert, Button, Input, Label, LoadingMessage } from "@masterz/ui";
import { AuthShell } from "@/components/AuthShell";
import { api } from "@/lib/api";

export default function MotDePasseOubliePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: apiError } = await api.POST(
        "/api/v1/auth/password-reset/request",
        { body: { phone } },
      );
      if (apiError) setError("Numéro de téléphone introuvable ou invalide.");
      else if (data && "challenge_id" in data) {
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
        "/api/v1/auth/password-reset/confirm",
        { body: { challenge_id: challengeId, otp, new_password: newPassword } },
      );
      if (apiError) setError("Code OTP incorrect ou mot de passe invalide.");
      else setStep(3);
    } catch {
      setError("Erreur inattendue de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Sécurité"
      title={
        step === 1
          ? "Réinitialisez votre mot de passe."
          : step === 2
            ? "Créez votre nouvel accès."
            : "Mot de passe modifié."
      }
      description={
        step === 1
          ? "Commencez avec le numéro associé à votre compte membre."
          : step === 2
            ? "Validez votre identité avec le code reçu, puis choisissez un nouveau mot de passe."
            : "Votre accès est de nouveau opérationnel."
      }
    >
      <div className="mb-8 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((item) => (
          <span
            key={item}
            className={`h-1 ${step >= item ? "bg-primary" : "bg-white/10"}`}
          />
        ))}
      </div>
      {error ? <Alert type="error" message={error} className="mb-6" /> : null}
      {step === 1 ? (
        <form onSubmit={handleRequest} className="space-y-5">
          <Field id="phone" label="Numéro de téléphone">
            <Input
              id="phone"
              type="tel"
              placeholder="+212…"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <LoadingMessage message="Envoi…" className="p-0 text-black" />
            ) : (
              <>
                Recevoir le code <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <Link
            href="/connexion"
            className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à la connexion
          </Link>
        </form>
      ) : null}
      {step === 2 ? (
        <form onSubmit={handleConfirm} className="space-y-5">
          <Field id="otp" label="Code OTP">
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
          <Field id="newPassword" label="Nouveau mot de passe">
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={10}
              required
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <LoadingMessage
                message="Validation…"
                className="p-0 text-black"
              />
            ) : (
              "Réinitialiser"
            )}
          </Button>
        </form>
      ) : null}
      {step === 3 ? (
        <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] p-6 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
          <p className="mt-4 text-sm text-gray-300">
            Vous pouvez utiliser votre nouveau mot de passe.
          </p>
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => router.push("/connexion")}
          >
            Se connecter
          </Button>
        </div>
      ) : null}
    </AuthShell>
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

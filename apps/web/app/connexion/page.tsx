"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, UserRoundCheck } from "lucide-react";
import { Alert, Button, Input, Label, LoadingMessage } from "@masterz/ui";
import { AuthShell } from "@/components/AuthShell";
import { api } from "@/lib/api";
import { dashboardPath, saveSession } from "@/lib/auth";

export default function ConnexionPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: apiError } = await api.POST("/api/v1/auth/login", {
        body: { phone, password },
      });

      if (apiError) {
        setError("Numéro de téléphone ou mot de passe incorrect.");
      } else if (data) {
        saveSession({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
        });
        router.push(dashboardPath(data.user.role));
      }
    } catch {
      setError("Une erreur inattendue s’est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Connexion"
      title="Bienvenue dans votre espace."
      description="Retrouvez votre accès membre avec le numéro de téléphone associé à votre compte."
    >
      {error ? <Alert type="error" message={error} className="mb-6" /> : null}
      <Link
        href="/activation-membre"
        className="group mb-7 flex items-center gap-4 rounded-sm border border-primary/35 bg-primary/[0.07] p-4 transition hover:border-primary hover:bg-primary/[0.12]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-black">
          <KeyRound className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
            Premiere connexion ?
          </span>
          <span className="mt-1 block font-black uppercase text-white">
            Activer mon compte
          </span>
          <span className="mt-1 block text-xs leading-5 text-gray-400">
            Mon adhesion a deja ete validee par la salle.
          </span>
        </span>
        <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-1" />
      </Link>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2.5">
          <Label htmlFor="phone">Numéro de téléphone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+212600000003"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            required
          />
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              href="/mot-de-passe-oublie"
              className="text-xs font-bold text-primary hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <LoadingMessage message="Connexion…" className="p-0 text-black" />
          ) : (
            <>
              Se connecter <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
      <div className="mt-8 border-t border-white/10 pt-7 text-sm text-gray-400">
        <Link
          href="/inscription"
          className="group flex items-center gap-4 rounded-sm border border-white/10 p-4 transition hover:border-primary/35"
        >
          <UserRoundCheck className="h-5 w-5 text-primary" />
          <span>
            <span className="block font-bold text-white">Nouveau membre</span>
            <span className="mt-1 block text-xs">
              Faire une demande d’adhésion
            </span>
          </span>
          <ArrowRight className="ml-auto h-4 w-4 text-primary transition group-hover:translate-x-1" />
        </Link>
      </div>
    </AuthShell>
  );
}

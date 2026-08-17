"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  Alert,
  Button,
  Input,
  Label,
  LoadingMessage,
  buttonStyles,
} from "@masterz/ui";
import { AuthShell } from "@/components/AuthShell";
import { api } from "@/lib/api";

type PlanOption = {
  id: string;
  name: string;
  price: number | string;
  currency?: string;
};

function InscriptionContent() {
  const searchParams = useSearchParams();
  const preselectedPlanId = searchParams.get("plan");
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "male",
    selected_plan_id: preselectedPlanId || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchPlans() {
      try {
        const { data } = await api.GET("/api/v1/membership-plans", {
          params: { query: { active_only: true, service_type: "gym" } },
        });
        if (active && data) {
          const sortedPlans = [...data].sort(
            (a, b) => Number(a.price) - Number(b.price),
          );
          setPlans(sortedPlans);
          if (!preselectedPlanId && sortedPlans.length > 0) {
            setFormData((current) => ({
              ...current,
              selected_plan_id: sortedPlans[0].id,
            }));
          }
        }
      } finally {
        if (active) setLoadingPlans(false);
      }
    }
    fetchPlans();
    return () => {
      active = false;
    };
  }, [preselectedPlanId]);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    setFormData((current) => ({
      ...current,
      [event.target.id]: event.target.value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: apiError } = await api.POST(
        "/api/v1/membership-applications",
        {
          body: {
            full_name: formData.full_name,
            phone: formData.phone,
            email: formData.email || null,
            date_of_birth: formData.date_of_birth || null,
            gender: formData.gender as "female" | "male",
            selected_plan_id: formData.selected_plan_id,
          },
        },
      );
      if (apiError)
        setError("Erreur de validation. Veuillez vérifier vos informations.");
      else if (data) setSuccess(true);
    } catch {
      setError("Une erreur inattendue s’est produite.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="Demande reçue"
        title="Bienvenue dans le parcours Masterz."
        description="Votre demande d’adhésion a bien été enregistrée. Le paiement et la validation finale se feront à l’accueil du club."
      >
        <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] p-6 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
          <p className="mt-4 text-sm leading-6 text-gray-300">
            L’équipe reviendra vers vous pour finaliser les prochaines étapes.
          </p>
        </div>
        <Link href="/" className={buttonStyles({ className: "mt-6 w-full" })}>
          Retour à l’accueil
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Inscription"
      title="Commencez votre demande d’adhésion."
      description="Choisissez votre formule et partagez votre objectif. L’équipe finalisera l’adhésion avec vous à l’accueil."
    >
      {error ? <Alert type="error" message={error} className="mb-6" /> : null}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom complet *" id="full_name">
            <Input
              id="full_name"
              autoComplete="name"
              required
              value={formData.full_name}
              onChange={handleChange}
            />
          </Field>
          <Field label="Téléphone *" id="phone">
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+212…"
              required
              value={formData.phone}
              onChange={handleChange}
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" id="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
            />
          </Field>
          <Field label="Date de naissance" id="date_of_birth">
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Formule *" id="selected_plan_id">
            {loadingPlans ? (
              <div className="flex h-12 items-center rounded-sm border border-white/10 bg-black/25 px-4 text-sm text-gray-500">
                Chargement des formules…
              </div>
            ) : (
              <select
                id="selected_plan_id"
                className="h-12 w-full rounded-sm border border-white/15 bg-[#071018] px-4 text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
                value={formData.selected_plan_id}
                onChange={handleChange}
              >
                <option value="" disabled>
                  Sélectionnez une formule
                </option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {plan.price} {plan.currency ?? "MAD"}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Genre" id="gender">
            <select
              id="gender"
              className="h-12 w-full rounded-sm border border-white/15 bg-[#071018] px-4 text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </Field>
        </div>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || loadingPlans || plans.length === 0}
        >
          {loading ? (
            <LoadingMessage message="Envoi…" className="p-0 text-black" />
          ) : (
            <>
              Soumettre la demande <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        Vous avez déjà un compte ?{" "}
        <Link
          href="/connexion"
          className="font-bold text-primary hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center bg-background text-gray-400">
          Chargement…
        </div>
      }
    >
      <InscriptionContent />
    </Suspense>
  );
}

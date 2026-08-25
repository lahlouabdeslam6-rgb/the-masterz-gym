"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Megaphone, UsersRound } from "lucide-react";
import type { components } from "@masterz/api-client";
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
import {
  currentSubscriptionFor,
  useMemberSubscriptions,
} from "@/lib/member-subscriptions";

type PlanOption = {
  id: string;
  name: string;
  price: number | string;
  currency?: string;
};

type Promotion = components["schemas"]["PromotionRead"];

function InscriptionContent() {
  const searchParams = useSearchParams();
  const preselectedPlanId = searchParams.get("plan");
  const promotionId = searchParams.get("promotion");
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
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
  const { subscriptions } = useMemberSubscriptions();
  const currentGymSubscription = currentSubscriptionFor(subscriptions, "gym");

  useEffect(() => {
    let active = true;
    async function fetchPlans() {
      try {
        const [plansResult, promotionsResult] = await Promise.all([
          api.GET("/api/v1/membership-plans", {
            params: { query: { active_only: true, service_type: "gym" } },
          }),
          promotionId
            ? api.GET("/api/v1/promotions")
            : Promise.resolve({ data: [] as Promotion[] }),
        ]);
        const data = plansResult.data;
        if (active && data) {
          const sortedPlans = [...data].sort(
            (a, b) => Number(a.price) - Number(b.price),
          );
          const selectedPromotion =
            promotionsResult.data?.find((item) => item.id === promotionId) ??
            null;
          setPlans(sortedPlans);
          setPromotion(selectedPromotion);
          if (selectedPromotion) {
            setFormData((current) => ({
              ...current,
              selected_plan_id: selectedPromotion.base_plan_id,
            }));
          } else if (!preselectedPlanId && sortedPlans.length > 0) {
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
  }, [preselectedPlanId, promotionId]);

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
            promotion_id: promotion?.id ?? null,
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

  if (currentGymSubscription) {
    return (
      <AuthShell
        eyebrow="Abonnement deja actif"
        title="Votre abonnement salle est deja paye."
        description="Vous ne devez pas envoyer une deuxieme demande tant que cette formule est encore valide."
      >
        <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] p-6">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300">
            {currentGymSubscription.plan_name}
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-300">
            Votre abonnement reste valable jusqu&apos;au{" "}
            <strong className="text-white">
              {currentGymSubscription.ends_on}
            </strong>
            .
          </p>
        </div>
        <Link
          href="/espace/membre"
          className={buttonStyles({ className: "mt-6 w-full" })}
        >
          Voir mon abonnement
        </Link>
        <Link
          href="/abonnements"
          className={buttonStyles({
            variant: "outline",
            className: "mt-3 w-full",
          })}
        >
          Retour aux formules
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
      {promotion ? (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/[0.08] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.17em] text-primary">
                <Megaphone className="h-4 w-4" /> Offre selectionnee
              </p>
              <p className="mt-2 text-xl font-black uppercase text-white">
                {promotion.title}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                <UsersRound className="h-4 w-4" />
                {promotion.participant_count} personne(s) ·{" "}
                {promotion.base_plan_name}
              </p>
            </div>
            <p className="text-2xl font-black text-primary">
              {promotion.price} {promotion.currency}
            </p>
          </div>
        </div>
      ) : null}
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
                disabled={Boolean(promotion)}
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  buttonStyles,
} from "@masterz/ui";
import { api } from "@/lib/api";
import {
  currentSubscriptionFor,
  latestSubscriptionFor,
  useMemberSubscriptions,
} from "@/lib/member-subscriptions";

type MembershipPlan = components["schemas"]["MembershipPlanRead"];
type Promotion = components["schemas"]["PromotionRead"];
type ServiceType = MembershipPlan["service_type"];

const planContent: Record<
  ServiceType,
  { features: string[]; buttonLabel: string; emptyTitle: string }
> = {
  gym: {
    features: [
      "Accès aux espaces d’entraînement",
      "Parcours encadré par l’équipe",
      "Expérience membre Masterz",
    ],
    buttonLabel: "Choisir",
    emptyTitle: "Les formules salle évoluent.",
  },
  coaching: {
    features: [
      "Accompagnement par un coach",
      "Analyse corporelle et tests inclus",
      "Programme et suivi personnalisé",
      "Progression mesurée dans le temps",
    ],
    buttonLabel: "Demander",
    emptyTitle: "Les formules coaching arrivent bientôt.",
  },
  recovery: {
    features: [
      "Sauna et retour au calme",
      "Bain froid encadré",
      "Compression et récupération",
    ],
    buttonLabel: "Demander",
    emptyTitle: "Les formules recovery arrivent bientôt.",
  },
};

export function MembershipPlansList({
  serviceType = "gym",
  showPromotions = false,
  onViewSubscription,
}: {
  serviceType?: ServiceType;
  showPromotions?: boolean;
  onViewSubscription?: () => void;
}) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const { session, subscriptions } = useMemberSubscriptions();

  useEffect(() => {
    let active = true;

    async function fetchPlans() {
      setLoading(true);
      setError(null);

      try {
        const [plansResult, promotionsResult] = await Promise.all([
          api.GET("/api/v1/membership-plans", {
            params: { query: { active_only: true, service_type: serviceType } },
          }),
          showPromotions
            ? api.GET("/api/v1/promotions")
            : Promise.resolve(null),
        ]);

        if (!active) return;
        if (plansResult.error) {
          setError("Impossible de charger les formules pour le moment.");
          return;
        }

        const loadedPlans = [...(plansResult.data ?? [])].sort(
          (a, b) => Number(a.price) - Number(b.price),
        );
        const planIds = new Set(loadedPlans.map((plan) => plan.id));
        setPlans(loadedPlans);
        setPromotions(
          (promotionsResult?.data ?? []).filter((promotion) =>
            planIds.has(promotion.base_plan_id),
          ),
        );
      } catch {
        if (active)
          setError("La connexion au service des abonnements a échoué.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchPlans();
    return () => {
      active = false;
    };
  }, [requestKey, serviceType, showPromotions]);

  const content = planContent[serviceType];
  const currentSubscription = currentSubscriptionFor(
    subscriptions,
    serviceType,
  );
  const latestSubscription = latestSubscriptionFor(subscriptions, serviceType);
  const memberIsRenewing =
    session?.user.role === "member" &&
    !currentSubscription &&
    Boolean(latestSubscription);

  if (loading) {
    return (
      <div
        className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Chargement des formules"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[390px] animate-pulse rounded-lg border border-white/10 bg-white/[0.035] p-6"
          >
            <div className="h-3 w-20 bg-white/10" />
            <div className="mt-6 h-8 w-36 bg-white/10" />
            <div className="mt-8 h-12 w-44 bg-white/10" />
            <div className="mt-10 space-y-3">
              <div className="h-3 bg-white/10" />
              <div className="h-3 w-4/5 bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-red-400/20 bg-red-400/[0.06] px-6 text-center">
        <p className="max-w-md text-sm leading-6 text-red-200">{error}</p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => setRequestKey((key) => key + 1)}
        >
          <RefreshCw className="h-4 w-4" /> Réessayer
        </Button>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-6 text-center">
        <p className="text-lg font-bold text-white">{content.emptyTitle}</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-gray-400">
          L’équipe prépare les prochaines offres. Contactez-nous pour être
          conseillé dès maintenant.
        </p>
        <Link
          href="/contact"
          className={buttonStyles({ variant: "outline", className: "mt-6" })}
        >
          Parler à l’équipe
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentSubscription ? (
        <div className="flex flex-col gap-5 rounded-lg border border-emerald-300/30 bg-emerald-300/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-4">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />
            <div>
              <p className="font-black uppercase text-white">
                Vous avez deja paye cette categorie
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                {currentSubscription.plan_name} · valide jusqu&apos;au{" "}
                {currentSubscription.ends_on}
              </p>
            </div>
          </div>
          {onViewSubscription ? (
            <Button
              type="button"
              variant="outline"
              onClick={onViewSubscription}
            >
              Voir mon abonnement
            </Button>
          ) : (
            <Link
              href="/espace/membre"
              className={buttonStyles({ variant: "outline" })}
            >
              Voir mon abonnement
            </Link>
          )}
        </div>
      ) : memberIsRenewing ? (
        <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.06] p-5 text-sm leading-6 text-amber-100">
          Votre ancienne formule {latestSubscription?.plan_name} est terminee.
          Vous pouvez choisir une nouvelle offre ci-dessous.
        </div>
      ) : null}

      {promotions.length ? (
        <section className="rounded-lg border border-primary/25 bg-primary/[0.055] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-sm bg-primary p-2 text-black">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
                Promotions Masterz
              </p>
              <h3 className="mt-1 text-xl font-black text-white">
                Offres speciales du moment
              </h3>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {promotions.map((promotion) => (
              <Link
                key={promotion.id}
                href={`/offres/${promotion.slug}`}
                className="group rounded-sm border border-white/10 bg-black/25 p-5 transition hover:border-primary/50 hover:bg-primary/[0.06]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-black text-white group-hover:text-primary">
                      {promotion.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {promotion.short_description}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
                    {formatPrice(promotion.price)} {promotion.currency}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-gray-500">
                  <span>
                    {promotion.participant_count} personne(s) · jusqu&apos;au{" "}
                    {new Date(promotion.ends_at).toLocaleDateString("fr-MA")}
                  </span>
                  <span className="flex items-center gap-2 font-black uppercase text-primary">
                    Decouvrir l&apos;offre <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div
        className={`grid gap-5 ${plans.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3"}`}
      >
        {plans.map((plan, index) => {
          const planIsCurrent = currentSubscription?.plan_id === plan.id;
          const highlighted =
            !planIsCurrent &&
            plans.length > 2 &&
            index === Math.floor(plans.length / 2);
          return (
            <Card
              key={plan.id}
              className={`relative flex min-h-[410px] flex-col overflow-hidden transition duration-300 hover:-translate-y-1 ${
                planIsCurrent
                  ? "border-emerald-300/45 bg-emerald-300/[0.06]"
                  : highlighted
                    ? "border-primary/55 bg-[linear-gradient(180deg,rgba(0,212,255,.11),#0a0f14_38%)]"
                    : "hover:border-primary/35"
              }`}
            >
              {planIsCurrent ? (
                <span className="absolute right-0 top-0 bg-emerald-300 px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.12em] text-black">
                  Deja paye
                </span>
              ) : highlighted ? (
                <span className="absolute right-0 top-0 bg-primary px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-black">
                  Le choix Masterz
                </span>
              ) : null}
              <CardHeader className="border-b border-white/10 pb-6">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary">
                  Formule {String(index + 1).padStart(2, "0")}
                </p>
                <CardTitle className="mt-4 pr-8 text-2xl">
                  {plan.name}
                </CardTitle>
                <p className="mt-2 text-sm text-gray-500">
                  Valable {plan.duration_months} mois
                  {serviceType === "recovery"
                    ? ` · ${plan.session_count ?? "Nombre a confirmer"} seance(s)`
                    : ""}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col pt-6">
                <div className="flex items-end gap-2">
                  <span className="font-display text-5xl font-black tracking-[-0.04em] text-white">
                    {formatPrice(plan.price)}
                  </span>
                  <span className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                    {plan.currency}
                  </span>
                </div>
                <ul className="mt-8 flex-1 space-y-3 text-sm text-gray-300">
                  {(serviceType === "recovery" && plan.session_count
                    ? [
                        `${plan.session_count} séances à utiliser pendant la validité du pack`,
                        ...content.features,
                      ]
                    : content.features
                  ).map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Check className="h-5 w-5 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={
                    planIsCurrent
                      ? "/espace/membre"
                      : `/inscription?plan=${plan.id}`
                  }
                  className={buttonStyles({
                    variant: planIsCurrent ? "outline" : "primary",
                    className: "mt-8 w-full",
                  })}
                >
                  {planIsCurrent
                    ? "Deja paye"
                    : currentSubscription
                      ? "Voir cette offre"
                      : memberIsRenewing
                        ? "Renouveler"
                        : content.buttonLabel}{" "}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function formatPrice(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(
    amount,
  );
}

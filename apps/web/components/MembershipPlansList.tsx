"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, RefreshCw } from "lucide-react";
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

type MembershipPlan = components["schemas"]["MembershipPlanRead"];

export function MembershipPlansList() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchPlans() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: apiError } = await api.GET(
          "/api/v1/membership-plans",
          {
            params: { query: { active_only: true, service_type: "gym" } },
          },
        );

        if (!active) return;
        if (apiError) {
          setError("Impossible de charger les formules pour le moment.");
          return;
        }

        setPlans(
          [...(data ?? [])].sort((a, b) => Number(a.price) - Number(b.price)),
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
  }, [requestKey]);

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
        <p className="text-lg font-bold text-white">Les formules évoluent.</p>
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
    <div
      className={`grid gap-5 ${plans.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3"}`}
    >
      {plans.map((plan, index) => {
        const highlighted =
          plans.length > 2 && index === Math.floor(plans.length / 2);
        return (
          <Card
            key={plan.id}
            className={`relative flex min-h-[410px] flex-col overflow-hidden transition duration-300 hover:-translate-y-1 ${highlighted ? "border-primary/55 bg-[linear-gradient(180deg,rgba(0,212,255,.11),#0a0f14_38%)]" : "hover:border-primary/35"}`}
          >
            {highlighted ? (
              <span className="absolute right-0 top-0 bg-primary px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-black">
                Le choix Masterz
              </span>
            ) : null}
            <CardHeader className="border-b border-white/10 pb-6">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary">
                Formule {String(index + 1).padStart(2, "0")}
              </p>
              <CardTitle className="mt-4 pr-8 text-2xl">{plan.name}</CardTitle>
              <p className="mt-2 text-sm text-gray-500">
                Engagement de {plan.duration_months} mois
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
                <li className="flex gap-3">
                  <Check className="h-5 w-5 shrink-0 text-primary" /> Accès aux
                  espaces d’entraînement
                </li>
                <li className="flex gap-3">
                  <Check className="h-5 w-5 shrink-0 text-primary" /> Parcours
                  encadré par l’équipe
                </li>
                <li className="flex gap-3">
                  <Check className="h-5 w-5 shrink-0 text-primary" /> Expérience
                  membre Masterz
                </li>
              </ul>
              <Link
                href={`/inscription?plan=${plan.id}`}
                className={buttonStyles({ className: "mt-8 w-full" })}
              >
                Choisir <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        );
      })}
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

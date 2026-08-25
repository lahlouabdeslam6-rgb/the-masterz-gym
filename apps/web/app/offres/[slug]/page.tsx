"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  UsersRound,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, LoadingMessage, buttonStyles } from "@masterz/ui";
import { api } from "@/lib/api";

type Promotion = components["schemas"]["PromotionRead"];

export default function PromotionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void api
      .GET("/api/v1/promotions/{slug}", { params: { path: { slug } } })
      .then(({ data }) => {
        if (!active) return;
        setPromotion(data ?? null);
        setFailed(!data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background">
        <LoadingMessage message="Chargement de l'offre..." />
      </div>
    );
  }

  if (failed || !promotion) {
    return (
      <main className="mx-auto min-h-[65vh] max-w-4xl px-5 py-20">
        <Alert type="error" message="Cette offre n'est plus disponible." />
        <Link
          href="/abonnements"
          className={buttonStyles({ variant: "outline", className: "mt-6" })}
        >
          <ArrowLeft className="h-4 w-4" /> Voir les abonnements
        </Link>
      </main>
    );
  }

  const registrationHref = `/inscription?plan=${promotion.base_plan_id}&promotion=${promotion.id}`;

  return (
    <main className="relative overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_72%_15%,rgba(16,204,234,0.18),transparent_43%)]" />
      <section className="relative mx-auto grid min-h-[72vh] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-24">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gray-400 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Retour au site
          </Link>
          <p className="mt-10 text-xs font-black uppercase tracking-[0.28em] text-primary">
            Offre speciale Masterz
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-black uppercase leading-[0.92] text-white sm:text-6xl lg:text-8xl">
            {promotion.title}
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-gray-300">
            {promotion.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2">
              <UsersRound className="h-4 w-4 text-primary" />
              {promotion.participant_count} personne(s)
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Jusqu’au {new Date(promotion.ends_at).toLocaleDateString("fr-MA")}
            </span>
          </div>
        </div>

        <aside className="rounded-xl border border-primary/30 bg-[#07141c]/95 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
            Formule concernee
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase text-white">
            {promotion.base_plan_name}
          </h2>
          <div className="my-7 border-y border-white/10 py-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
              Prix de l’offre
            </p>
            <p className="mt-2 font-display text-5xl font-black text-white sm:text-6xl">
              {promotion.price}
              <span className="ml-2 text-lg text-primary">
                {promotion.currency}
              </span>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              pour {promotion.participant_count} personne(s)
            </p>
          </div>
          {promotion.terms ? (
            <div className="flex gap-3 text-sm leading-6 text-gray-300">
              <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
              <p>{promotion.terms}</p>
            </div>
          ) : null}
          <Link
            href={registrationHref}
            className={buttonStyles({ size: "lg", className: "mt-8 w-full" })}
          >
            Choisir cette offre <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-center text-xs leading-5 text-gray-500">
            La Reception confirme le paiement et finalise l’adhesion.
          </p>
        </aside>
      </section>
    </main>
  );
}

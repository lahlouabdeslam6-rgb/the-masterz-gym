"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Megaphone, X, Zap } from "lucide-react";
import type { components } from "@masterz/api-client";
import { api } from "@/lib/api";

type Promotion = components["schemas"]["PromotionRead"];

export function TopBanner() {
  const pathname = usePathname();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [dismissedOnPath, setDismissedOnPath] = useState<string | null>(null);
  const dismissed = dismissedOnPath === pathname;

  useEffect(() => {
    let active = true;
    void api.GET("/api/v1/promotions/featured").then(({ data }) => {
      if (active && data && !Array.isArray(data)) setPromotion(data);
    });
    return () => {
      active = false;
    };
  }, []);

  if (promotion && !dismissed) {
    return (
      <div
        data-testid="top-promotion-banner"
        className="relative border-b border-primary/20 bg-primary text-black"
      >
        <Link
          href={`/offres/${promotion.slug}`}
          className="group block px-12 py-2 text-center text-[0.68rem] font-black uppercase tracking-[0.1em] transition hover:bg-cyan-300 sm:text-xs"
        >
          <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{promotion.title}</span>
            <span className="font-bold normal-case tracking-normal opacity-75">
              {promotion.short_description}
            </span>
            <span className="inline-flex items-center gap-1">
              Decouvrir{" "}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Fermer l'offre promotionnelle"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:right-4"
          onClick={() => setDismissedOnPath(pathname)}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div className="border-b border-primary/15 bg-[#07141c] px-4 py-2 text-center text-[0.68rem] font-bold uppercase tracking-[0.12em] text-gray-200 sm:text-xs">
      <span className="inline-flex items-center gap-2">
        <Zap
          className="h-3.5 w-3.5 fill-primary text-primary"
          aria-hidden="true"
        />
        Une expérience complète : entraînement, performance et récupération
      </span>
    </div>
  );
}

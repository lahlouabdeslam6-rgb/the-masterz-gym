"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Megaphone, Zap } from "lucide-react";
import type { components } from "@masterz/api-client";
import { api } from "@/lib/api";

type Promotion = components["schemas"]["PromotionRead"];

export function TopBanner() {
  const [promotion, setPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    let active = true;
    void api.GET("/api/v1/promotions/featured").then(({ data }) => {
      if (active && data && !Array.isArray(data)) setPromotion(data);
    });
    return () => {
      active = false;
    };
  }, []);

  if (promotion) {
    return (
      <Link
        href={`/offres/${promotion.slug}`}
        className="group block border-b border-primary/20 bg-primary px-4 py-2 text-center text-[0.68rem] font-black uppercase tracking-[0.1em] text-black transition hover:bg-cyan-300 sm:text-xs"
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
    );
  }

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

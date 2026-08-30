"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, RefreshCw, UtensilsCrossed } from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, LoadingMessage } from "@masterz/ui";
import { api, resolveApiMediaUrl } from "@/lib/api";

type CafeMenuItem = components["schemas"]["CafeMenuItemRead"];

export function HealthyCafeMenu() {
  const [items, setItems] = useState<CafeMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await api.GET("/api/v1/cafe/menu");
    setItems(result.data ?? []);
    setError(result.error ? "La carte n'a pas pu etre chargee." : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const categories = useMemo(() => {
    const grouped = new Map<string, CafeMenuItem[]>();
    items.forEach((item) => {
      const current = grouped.get(item.category) ?? [];
      current.push(item);
      grouped.set(item.category, current);
    });
    return Array.from(grouped.entries());
  }, [items]);

  if (loading) return <LoadingMessage message="Chargement de la carte..." />;

  if (error) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <Alert type="error" message={error} />
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" /> Reessayer
        </Button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-white/15 bg-black/20 px-6 py-16 text-center">
        <Coffee className="mx-auto h-9 w-9 text-primary" />
        <h2 className="mt-5 font-display text-2xl font-black uppercase text-white">
          La carte arrive bientot
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-500">
          L&apos;equipe publiera ici les repas disponibles et leurs prix.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {categories.map(([category, categoryItems], categoryIndex) => (
        <section key={category} aria-labelledby={`cafe-${categoryIndex}`}>
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-primary">
                Selection Healthy Cafe
              </p>
              <h2
                id={`cafe-${categoryIndex}`}
                className="mt-2 font-display text-3xl font-black uppercase tracking-[-0.03em] text-white"
              >
                {category}
              </h2>
            </div>
            <span className="hidden text-xs font-bold uppercase tracking-[0.12em] text-gray-600 sm:block">
              {categoryItems.length} choix
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categoryItems.map((item) => {
              const imageUrl = resolveApiMediaUrl(item.image_url);
              return (
                <article
                  key={item.id}
                  className="group grid min-h-52 overflow-hidden rounded-lg border border-white/10 bg-[#081119] shadow-xl transition hover:-translate-y-0.5 hover:border-primary/35 sm:grid-cols-[9.5rem_minmax(0,1fr)]"
                >
                  <div
                    role={imageUrl ? "img" : undefined}
                    aria-label={imageUrl ? `Photo de ${item.name}` : undefined}
                    style={
                      imageUrl
                        ? {
                            backgroundImage: `linear-gradient(rgba(2,8,12,.04),rgba(2,8,12,.18)),url("${imageUrl}")`,
                          }
                        : undefined
                    }
                    className={`min-h-44 border-b border-white/10 bg-[#0c1720] bg-cover bg-center sm:min-h-full sm:border-b-0 sm:border-r ${
                      imageUrl
                        ? ""
                        : "flex items-center justify-center bg-[radial-gradient(circle,rgba(0,212,255,.16),transparent_62%)]"
                    }`}
                  >
                    {!imageUrl ? (
                      <UtensilsCrossed className="h-9 w-9 text-primary/70" />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-col p-5">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-primary">
                      {category}
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-black uppercase leading-tight text-white">
                      {item.name}
                    </h3>
                    {item.description ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-500">
                        {item.description}
                      </p>
                    ) : null}
                    <p className="mt-auto pt-5 font-display text-3xl font-black text-white">
                      {formatPrice(item.price)}
                      <span className="ml-2 text-sm tracking-[0.12em] text-primary">
                        {item.currency}
                      </span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function formatPrice(value: string) {
  return new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

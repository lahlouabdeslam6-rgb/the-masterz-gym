"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Coffee,
  Eye,
  RefreshCw,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, LoadingMessage } from "@masterz/ui";
import { api, resolveApiMediaUrl } from "@/lib/api";

type CafeMenuItem = components["schemas"]["CafeMenuItemRead"];

export function HealthyCafeMenu() {
  const [items, setItems] = useState<CafeMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CafeMenuItem | null>(null);

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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {categoryItems.map((item) => {
              const mediaUrls = getCafeMediaUrls(item);
              const coverUrl = mediaUrls[0] ?? null;
              return (
                <article
                  key={item.id}
                  className="group flex min-h-[22rem] min-w-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#081119] shadow-lg transition hover:-translate-y-0.5 hover:border-primary/35"
                >
                  <CafeMedia
                    mediaUrl={coverUrl}
                    name={item.name}
                    className="aspect-[16/10] w-full border-b border-white/10"
                    cover
                  />
                  <div className="flex min-w-0 flex-1 flex-col p-5">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-primary">
                      {category}
                    </p>
                    <h3 className="mt-2 line-clamp-2 break-words font-display text-xl font-black uppercase leading-tight text-white">
                      {item.name}
                    </h3>
                    <p className="mt-auto pt-4 font-display text-2xl font-black text-white">
                      {formatPrice(item.price)}
                      <span className="ml-2 text-sm tracking-[0.12em] text-primary">
                        {item.currency}
                      </span>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-5 w-full"
                      onClick={() => setSelectedItem(item)}
                    >
                      <Eye className="h-4 w-4" /> Voir
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {selectedItem ? (
        <CafeItemDialog
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      ) : null}
    </div>
  );
}

function CafeItemDialog({
  item,
  onClose,
}: {
  item: CafeMenuItem;
  onClose: () => void;
}) {
  const mediaUrls = getCafeMediaUrls(item);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMedia = mediaUrls[activeIndex] ?? null;

  function previous() {
    setActiveIndex((current) =>
      current === 0 ? mediaUrls.length - 1 : current - 1,
    );
  }

  function next() {
    setActiveIndex((current) => (current + 1) % mediaUrls.length);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Voir ${item.name}`}
      className="fixed inset-0 z-[130] overflow-y-auto overflow-x-hidden bg-black/90 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative mx-auto grid max-h-[88vh] w-full min-w-0 max-w-5xl overflow-y-auto overflow-x-hidden rounded-lg border border-white/15 bg-[#050d14] shadow-2xl lg:h-[84vh] lg:grid-cols-[minmax(0,1.05fr)_minmax(21rem,.95fr)] lg:overflow-hidden">
        <button
          type="button"
          aria-label="Fermer"
          className="absolute right-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:bg-primary"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>

        <div className="relative flex min-h-[20rem] items-center bg-[#071827] lg:min-h-full">
          <CafeMedia
            mediaUrl={activeMedia}
            name={item.name}
            className="absolute inset-5 h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)] sm:inset-8 sm:h-[calc(100%-4rem)] sm:w-[calc(100%-4rem)]"
          />
          {mediaUrls.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Media precedent"
                className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white hover:bg-primary hover:text-black"
                onClick={previous}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Media suivant"
                className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white hover:bg-primary hover:text-black"
                onClick={next}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col overflow-x-hidden p-6 pt-20 sm:p-8 sm:pt-16 lg:overflow-y-auto">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
            {item.category}
          </p>
          <h2 className="mt-3 break-words font-display text-3xl font-black uppercase leading-[1.05] text-white [overflow-wrap:anywhere] sm:text-4xl">
            {item.name}
          </h2>
          <p className="mt-6 break-words border-y border-white/10 py-5 font-display text-4xl font-black text-white">
            {formatPrice(item.price)}
            <span className="ml-3 text-base tracking-[0.12em] text-primary">
              {item.currency}
            </span>
          </p>
          <div className="mt-7">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
              Description
            </p>
            <p className="mt-3 whitespace-pre-line break-words text-base leading-7 text-gray-400 [overflow-wrap:anywhere]">
              {item.description || "Aucune description ajoutee pour le moment."}
            </p>
          </div>
          {mediaUrls.length > 1 ? (
            <div className="mt-auto grid grid-cols-4 gap-2 pt-8">
              {mediaUrls.map((mediaUrl, index) => (
                <button
                  type="button"
                  key={`${mediaUrl}-${index}`}
                  aria-label={`Afficher media ${index + 1}`}
                  className={`overflow-hidden rounded-sm border ${
                    activeIndex === index ? "border-primary" : "border-white/10"
                  }`}
                  onClick={() => setActiveIndex(index)}
                >
                  <CafeMedia
                    mediaUrl={mediaUrl}
                    name={item.name}
                    className="aspect-square w-full"
                    cover
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CafeMedia({
  mediaUrl,
  name,
  className,
  cover = false,
}: {
  mediaUrl: string | null;
  name: string;
  className: string;
  cover?: boolean;
}) {
  const resolvedUrl = resolveApiMediaUrl(mediaUrl);
  if (!resolvedUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-[radial-gradient(circle,rgba(0,212,255,.16),transparent_62%)] ${className}`}
      >
        <UtensilsCrossed className="h-9 w-9 text-primary/70" />
      </div>
    );
  }
  if (isCafeVideo(resolvedUrl)) {
    return (
      <video
        src={resolvedUrl}
        className={`${cover ? "object-cover" : "object-contain"} bg-[#071827] ${className}`}
        controls={!cover}
        muted={cover}
        playsInline
        preload="metadata"
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={`Photo de ${name}`}
      className={`${cover ? "bg-cover" : "bg-contain"} bg-center bg-no-repeat ${className}`}
      style={{ backgroundImage: `url("${resolvedUrl}")` }}
    />
  );
}

function getCafeMediaUrls(item: CafeMenuItem) {
  if (item.media_urls?.length) return item.media_urls;
  return item.image_url ? [item.image_url] : [];
}

function isCafeVideo(mediaUrl: string) {
  return /\.(mp4|webm)(?:\?|$)/i.test(mediaUrl);
}

function formatPrice(value: string) {
  return new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

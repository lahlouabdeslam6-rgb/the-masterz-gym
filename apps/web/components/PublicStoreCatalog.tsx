"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, Package, RefreshCw, ShoppingBag } from "lucide-react";
import type { components } from "@masterz/api-client";
import { buttonStyles } from "@masterz/ui";
import { api, apiBaseUrl } from "@/lib/api";
import { getSession, type AuthSession } from "@/lib/auth";

type CatalogProduct = components["schemas"]["StoreCatalogProductRead"];

export function PublicStoreCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      setLoading(true);
      setError(null);
      const result = await api.GET("/api/v1/store/catalog");
      if (!active) return;
      setSession(getSession());
      setProducts(result.data ?? []);
      setError(result.error ? "Le catalogue n'a pas pu etre charge." : null);
      setLoading(false);
    }

    void loadCatalog();
    return () => {
      active = false;
    };
  }, [requestKey]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm font-bold uppercase tracking-[0.12em] text-gray-500">
        <RefreshCw className="mr-3 h-5 w-5 animate-spin text-primary" />
        Chargement du Store...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-8 text-center">
        <p className="text-sm text-red-200">{error}</p>
        <button
          type="button"
          className={buttonStyles({ variant: "outline", className: "mt-5" })}
          onClick={() => setRequestKey((key) => key + 1)}
        >
          Reessayer
        </button>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-surface p-10 text-center">
        <Package className="mx-auto h-10 w-10 text-primary/50" />
        <h2 className="mt-5 text-2xl font-black uppercase text-white">
          Le catalogue arrive bientot
        </h2>
        <p className="mt-3 text-sm text-gray-500">
          Les produits actifs seront affiches ici par l&apos;equipe Masterz.
        </p>
      </div>
    );
  }

  const reservationHref =
    session?.user.role === "member" ? "/espace/membre" : "/connexion";
  const reservationLabel =
    session?.user.role === "member"
      ? "Reserver dans mon espace"
      : "Se connecter pour reserver";

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <article
          key={product.id}
          className="group overflow-hidden rounded-lg border border-white/10 bg-[#080e13] shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
        >
          <CatalogMedia product={product} />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-primary">
                  Masterz Store
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {product.name}
                </h2>
              </div>
              <span
                className={
                  "shrink-0 rounded-full border px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] " +
                  (product.is_available
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-red-400/30 bg-red-400/10 text-red-300")
                }
              >
                {product.is_available ? "Disponible" : "Indisponible"}
              </span>
            </div>
            <p className="mt-4 min-h-12 text-sm leading-6 text-gray-500">
              {product.description || "Produit disponible au Masterz Store."}
            </p>
            <p className="mt-5 text-3xl font-black text-white">
              {product.price}{" "}
              <span className="text-sm uppercase tracking-[0.1em] text-primary">
                {product.currency}
              </span>
            </p>
            {product.is_available ? (
              <Link
                href={reservationHref}
                className={buttonStyles({ className: "mt-6 w-full" })}
              >
                {session?.user.role === "member" ? (
                  <ShoppingBag className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {reservationLabel}
              </Link>
            ) : (
              <span className="mt-6 flex h-11 w-full items-center justify-center rounded-sm border border-white/10 text-xs font-black uppercase tracking-[0.08em] text-gray-600">
                Rupture de stock
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function CatalogMedia({ product }: { product: CatalogProduct }) {
  const mediaUrl = resolveMediaUrl(product.image_url);
  if (mediaUrl && /\.(mp4|webm)(?:\?|$)/i.test(mediaUrl)) {
    return (
      <video
        className="h-64 w-full bg-black object-cover"
        src={mediaUrl}
        controls
        preload="metadata"
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={"Photo " + product.name}
      className="flex h-64 items-center justify-center bg-[linear-gradient(135deg,rgba(0,212,255,0.16),rgba(4,10,16,0.96))] bg-cover bg-center transition duration-500 group-hover:scale-[1.02]"
      style={
        mediaUrl ? { backgroundImage: 'url("' + mediaUrl + '")' } : undefined
      }
    >
      {!mediaUrl ? <Package className="h-14 w-14 text-primary/40" /> : null}
    </div>
  );
}

function resolveMediaUrl(mediaUrl: string | null) {
  if (!mediaUrl) return null;
  if (/^(https?:|data:|blob:)/i.test(mediaUrl)) return mediaUrl;
  return apiBaseUrl.replace(/\/$/, "") + "/" + mediaUrl.replace(/^\//, "");
}

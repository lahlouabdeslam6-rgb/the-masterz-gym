"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, LogIn, Package, RefreshCw, ShoppingBag, X } from "lucide-react";
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
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(
    null,
  );

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

  useEffect(() => {
    if (!selectedProduct) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedProduct(null);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedProduct]);

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
    <>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article
            key={product.id}
            className="group flex overflow-hidden rounded-lg border border-white/10 bg-[#080e13] shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
          >
            <div className="flex w-full flex-col">
              <button
                type="button"
                className="block w-full overflow-hidden text-left"
                aria-label={`Voir ${product.name}`}
                onClick={() => setSelectedProduct(product)}
              >
                <CatalogMedia product={product} size="card" />
              </button>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-primary">
                      Masterz Store
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">
                      {product.name}
                    </h2>
                  </div>
                  <AvailabilityBadge available={product.is_available} />
                </div>
                <p className="mt-6 text-3xl font-black text-white">
                  {product.price}{" "}
                  <span className="text-sm uppercase tracking-[0.1em] text-primary">
                    {product.currency}
                  </span>
                </p>
                <button
                  type="button"
                  className={buttonStyles({
                    variant: "outline",
                    className: "mt-6 w-full",
                  })}
                  onClick={() => setSelectedProduct(product)}
                >
                  <Eye className="h-4 w-4" />
                  Voir le produit
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selectedProduct ? (
        <ProductDetails
          product={selectedProduct}
          reservationHref={reservationHref}
          reservationLabel={reservationLabel}
          isMember={session?.user.role === "member"}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </>
  );
}

function ProductDetails({
  product,
  reservationHref,
  reservationLabel,
  isMember,
  onClose,
}: {
  product: CatalogProduct;
  reservationHref: string;
  reservationLabel: string;
  isMember: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-product-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article className="relative max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-white/15 bg-[#071019] shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
        <button
          type="button"
          aria-label="Fermer"
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-white text-black shadow-lg transition hover:bg-primary"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="grid lg:grid-cols-[1.35fr_0.85fr]">
          <CatalogMedia product={product} size="detail" />
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                Masterz Store
              </p>
              <AvailabilityBadge available={product.is_available} />
            </div>
            <h2
              id="store-product-title"
              className="mt-5 font-display text-4xl font-black uppercase leading-tight text-white sm:text-5xl"
            >
              {product.name}
            </h2>
            <div className="mt-8 border-y border-white/10 py-7">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-gray-500">
                Prix
              </p>
              <p className="mt-2 text-5xl font-black text-white">
                {product.price}{" "}
                <span className="text-base uppercase tracking-[0.12em] text-primary">
                  {product.currency}
                </span>
              </p>
            </div>
            <div className="mt-7">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white">
                Description du produit
              </h3>
              <p className="mt-3 whitespace-pre-line text-base leading-8 text-gray-400">
                {product.description || "Produit disponible au Masterz Store."}
              </p>
            </div>
            {product.is_available ? (
              <Link
                href={reservationHref}
                className={buttonStyles({ className: "mt-9 w-full" })}
              >
                {isMember ? (
                  <ShoppingBag className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {reservationLabel}
              </Link>
            ) : (
              <span className="mt-9 flex h-12 w-full items-center justify-center rounded-sm border border-red-400/20 bg-red-400/5 text-xs font-black uppercase tracking-[0.08em] text-red-300">
                Rupture de stock
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <span
      className={
        "shrink-0 rounded-full border px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] " +
        (available
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          : "border-red-400/30 bg-red-400/10 text-red-300")
      }
    >
      {available ? "Disponible" : "Indisponible"}
    </span>
  );
}

function CatalogMedia({
  product,
  size,
}: {
  product: CatalogProduct;
  size: "card" | "detail";
}) {
  const mediaUrl = resolveMediaUrl(product.image_url);
  const sizeClasses =
    size === "detail"
      ? "min-h-[22rem] h-[55vh] max-h-[42rem] lg:h-[76vh]"
      : "h-80 sm:h-96";

  if (mediaUrl && /\.(mp4|webm)(?:\?|$)/i.test(mediaUrl)) {
    return (
      <video
        className={`${sizeClasses} w-full bg-black object-contain`}
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
      className={`${sizeClasses} flex w-full items-center justify-center bg-[#f4f4f2] bg-contain bg-center bg-no-repeat transition duration-500 group-hover:brightness-[0.97]`}
      style={
        mediaUrl
          ? {
              backgroundImage: 'url("' + mediaUrl + '")',
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
            }
          : undefined
      }
    >
      {!mediaUrl ? <Package className="h-14 w-14 text-black/25" /> : null}
    </div>
  );
}

function resolveMediaUrl(mediaUrl: string | null) {
  if (!mediaUrl) return null;
  if (/^(https?:|data:|blob:)/i.test(mediaUrl)) return mediaUrl;
  return apiBaseUrl.replace(/\/$/, "") + "/" + mediaUrl.replace(/^\//, "");
}

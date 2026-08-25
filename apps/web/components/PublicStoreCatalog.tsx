"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  LogIn,
  Package,
  Play,
  RotateCcw,
  RefreshCw,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, Input, buttonStyles } from "@masterz/ui";
import { api, apiBaseUrl } from "@/lib/api";
import { authorizationHeaders, getSession, type AuthSession } from "@/lib/auth";

type CatalogProduct = components["schemas"]["StoreCatalogProductRead"];
type AvailabilityFilter = "all" | "available" | "unavailable";
type PriceSort = "default" | "price-asc" | "price-desc";

export function PublicStoreCatalog({
  memberSession,
  onReservationCreated,
}: {
  memberSession?: AuthSession;
  onReservationCreated?: () => Promise<void> | void;
} = {}) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [priceSort, setPriceSort] = useState<PriceSort>("default");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [reservationFeedback, setReservationFeedback] = useState<string | null>(
    null,
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    const filteredProducts = products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLocaleLowerCase("fr").includes(normalizedQuery);
      const matchesAvailability =
        availability === "all" ||
        (availability === "available"
          ? product.is_available
          : !product.is_available);
      return matchesQuery && matchesAvailability;
    });

    if (priceSort === "default") return filteredProducts;
    return [...filteredProducts].sort((firstProduct, secondProduct) => {
      const difference =
        Number(firstProduct.price) - Number(secondProduct.price);
      return priceSort === "price-asc" ? difference : -difference;
    });
  }, [availability, priceSort, products, query]);

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

  const resolvedSession = memberSession ?? session;
  const isMember = resolvedSession?.user.role === "member";

  async function reserveSelectedProduct() {
    if (!selectedProduct || !resolvedSession || !isMember || quantity < 1)
      return;

    setReserving(true);
    setReservationFeedback(null);
    const result = await api.POST("/api/v1/store/reservations", {
      headers: authorizationHeaders(resolvedSession.accessToken),
      body: { product_id: selectedProduct.id, quantity },
    });
    setReserving(false);

    if (!result.data) {
      setReservationFeedback(
        "La reservation n'a pas pu etre envoyee. Verifiez la quantite disponible.",
      );
      return;
    }

    setReservationFeedback("Reservation envoyee a la Reception.");
    await onReservationCreated?.();
  }

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

  const filtersAreActive =
    query !== "" || availability !== "all" || priceSort !== "default";

  function resetFilters() {
    setQuery("");
    setAvailability("all");
    setPriceSort("default");
  }

  function openProduct(product: CatalogProduct) {
    setQuantity(1);
    setReservationFeedback(null);
    setSelectedProduct(product);
  }

  return (
    <>
      <section
        aria-label="Filtres du catalogue"
        className="mb-8 rounded-lg border border-white/10 bg-surface p-4 sm:p-6"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.16em] text-gray-400">
              Rechercher un produit
            </span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom du produit..."
                className="h-12 w-full rounded-sm border border-white/15 bg-[#050a0e] pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-primary"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.16em] text-gray-400">
              Trier par prix
            </span>
            <select
              value={priceSort}
              onChange={(event) =>
                setPriceSort(event.target.value as PriceSort)
              }
              className="h-12 w-full min-w-56 rounded-sm border border-white/15 bg-[#050a0e] px-4 text-sm font-bold text-white outline-none transition focus:border-primary"
            >
              <option value="default">Ordre par defaut</option>
              <option value="price-asc">Prix : moins cher</option>
              <option value="price-desc">Prix : plus cher</option>
            </select>
          </label>

          <button
            type="button"
            disabled={!filtersAreActive}
            className={buttonStyles({
              variant: "outline",
              className: "h-12 disabled:cursor-not-allowed disabled:opacity-35",
            })}
            onClick={resetFilters}
          >
            <RotateCcw className="h-4 w-4" />
            Effacer les filtres
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Disponibilite">
            {(
              [
                ["all", "Tous"],
                ["available", "Disponibles"],
                ["unavailable", "Indisponibles"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={availability === value}
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition ${
                  availability === value
                    ? "border-primary bg-primary text-black"
                    : "border-white/15 text-gray-400 hover:border-primary/60 hover:text-white"
                }`}
                onClick={() => setAvailability(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm font-bold text-gray-400" aria-live="polite">
            <span className="text-primary">{visibleProducts.length}</span>{" "}
            {visibleProducts.length === 1 ? "produit" : "produits"}
          </p>
        </div>
      </section>

      {visibleProducts.length ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => (
            <article
              key={product.id}
              className="group flex overflow-hidden rounded-lg border border-white/10 bg-[#080e13] shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
            >
              <div className="flex w-full flex-col">
                <button
                  type="button"
                  className="block w-full overflow-hidden text-left"
                  aria-label={`Voir ${product.name}`}
                  onClick={() => openProduct(product)}
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
                    onClick={() => openProduct(product)}
                  >
                    <Eye className="h-4 w-4" />
                    Voir le produit
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/15 bg-surface p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-primary/50" />
          <h2 className="mt-5 text-2xl font-black uppercase text-white">
            Aucun produit trouve
          </h2>
          <p className="mt-3 text-sm text-gray-500">
            Essayez un autre nom ou effacez les filtres.
          </p>
          <button
            type="button"
            className={buttonStyles({ variant: "outline", className: "mt-6" })}
            onClick={resetFilters}
          >
            <RotateCcw className="h-4 w-4" />
            Afficher tous les produits
          </button>
        </div>
      )}

      {selectedProduct ? (
        <ProductDetails
          product={selectedProduct}
          isMember={isMember}
          quantity={quantity}
          reserving={reserving}
          reservationFeedback={reservationFeedback}
          onQuantityChange={setQuantity}
          onReserve={() => void reserveSelectedProduct()}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </>
  );
}

function ProductDetails({
  product,
  isMember,
  quantity,
  reserving,
  reservationFeedback,
  onQuantityChange,
  onReserve,
  onClose,
}: {
  product: CatalogProduct;
  isMember: boolean;
  quantity: number;
  reserving: boolean;
  reservationFeedback: string | null;
  onQuantityChange: (quantity: number) => void;
  onReserve: () => void;
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
      <article className="relative max-h-[94vh] w-full max-w-[96rem] overflow-y-auto rounded-xl border border-white/15 bg-[#071019] shadow-[0_30px_120px_rgba(0,0,0,0.7)] lg:overflow-hidden">
        <button
          type="button"
          aria-label="Fermer"
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-white text-black shadow-lg transition hover:bg-primary"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="grid lg:h-[94vh] lg:grid-cols-[minmax(0,1.45fr)_minmax(28rem,0.75fr)]">
          <ProductGallery product={product} />
          <div
            data-testid="product-details-scroll"
            className="flex flex-col justify-center p-7 sm:p-10 lg:h-full lg:justify-start lg:overflow-y-auto lg:p-12 lg:pt-20"
          >
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
            {reservationFeedback ? (
              <Alert
                type={
                  reservationFeedback.startsWith("Reservation envoyee")
                    ? "success"
                    : "error"
                }
                message={reservationFeedback}
                className="mt-7"
              />
            ) : null}
            {product.is_available ? (
              isMember ? (
                <div className="mt-9 grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <label>
                    <span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.16em] text-gray-500">
                      Quantite
                    </span>
                    <Input
                      aria-label={`Quantite ${product.name}`}
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(event) =>
                        onQuantityChange(Number(event.target.value))
                      }
                    />
                  </label>
                  <Button
                    className="self-end"
                    disabled={reserving || quantity < 1}
                    onClick={onReserve}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {reserving ? "Envoi..." : "Reserver ce produit"}
                  </Button>
                </div>
              ) : (
                <Link
                  href="/connexion"
                  className={buttonStyles({ className: "mt-9 w-full" })}
                >
                  <LogIn className="h-4 w-4" />
                  Se connecter pour reserver
                </Link>
              )
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

function ProductGallery({ product }: { product: CatalogProduct }) {
  const mediaUrls = getProductMediaUrls(product);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMediaUrl = mediaUrls[activeIndex] ?? null;

  function showPrevious() {
    setActiveIndex((current) =>
      current === 0 ? mediaUrls.length - 1 : current - 1,
    );
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % mediaUrls.length);
  }

  return (
    <div
      data-testid="product-gallery"
      className={`relative overflow-hidden bg-[#f4f4f2] lg:h-full ${
        mediaUrls.length > 1
          ? "lg:grid lg:grid-cols-[minmax(0,1fr)_6.5rem]"
          : ""
      }`}
    >
      <div
        data-testid="product-media-viewport"
        className="relative h-full min-h-0 overflow-hidden"
      >
        <CatalogMedia
          product={product}
          mediaUrl={activeMediaUrl}
          size="detail"
        />
        {mediaUrls.length > 1 ? (
          <>
            <span className="absolute left-4 top-4 rounded-full bg-black/75 px-3 py-1 text-xs font-black text-white backdrop-blur-sm">
              {activeIndex + 1} / {mediaUrls.length}
            </span>
            <button
              type="button"
              aria-label="Media precedent"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-white shadow-lg transition hover:bg-primary hover:text-black"
              onClick={showPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Media suivant"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-white shadow-lg transition hover:bg-primary hover:text-black"
              onClick={showNext}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        ) : null}
      </div>
      {mediaUrls.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 flex max-w-[85%] -translate-x-1/2 gap-2 overflow-x-auto rounded-lg bg-black/75 p-2 backdrop-blur-sm lg:static lg:h-full lg:max-w-none lg:translate-x-0 lg:flex-col lg:gap-3 lg:overflow-y-auto lg:overflow-x-hidden lg:rounded-none lg:border-l lg:border-black/10 lg:bg-[#071019] lg:p-3 lg:backdrop-blur-none">
          {mediaUrls.map((mediaUrl, index) => (
            <button
              type="button"
              key={`${mediaUrl}-${index}`}
              aria-label={`Afficher media ${index + 1}`}
              aria-current={index === activeIndex}
              className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border-2 bg-white bg-contain bg-center bg-no-repeat transition sm:h-16 sm:w-16 lg:h-20 lg:w-full ${
                index === activeIndex
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              style={
                isMediaVideo(mediaUrl)
                  ? undefined
                  : {
                      backgroundImage: `url("${resolveMediaUrl(mediaUrl)}")`,
                    }
              }
              onClick={() => setActiveIndex(index)}
            >
              {isMediaVideo(mediaUrl) ? (
                <Play className="h-5 w-5 fill-black text-black" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CatalogMedia({
  product,
  mediaUrl,
  size,
}: {
  product: CatalogProduct;
  mediaUrl?: string | null;
  size: "card" | "detail";
}) {
  const resolvedMediaUrl = resolveMediaUrl(
    mediaUrl === undefined ? getProductMediaUrls(product)[0] : mediaUrl,
  );
  const sizeClasses =
    size === "detail"
      ? "h-[62vh] min-h-[28rem] lg:h-full lg:min-h-0 lg:max-h-none"
      : "h-80 sm:h-96";

  if (resolvedMediaUrl && isMediaVideo(resolvedMediaUrl)) {
    return (
      <video
        className={`${sizeClasses} w-full bg-black object-contain`}
        src={resolvedMediaUrl}
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
        resolvedMediaUrl
          ? {
              backgroundImage: 'url("' + resolvedMediaUrl + '")',
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
            }
          : undefined
      }
    >
      {!resolvedMediaUrl ? (
        <Package className="h-14 w-14 text-black/25" />
      ) : null}
    </div>
  );
}

function getProductMediaUrls(product: CatalogProduct) {
  if (product.media_urls?.length) return product.media_urls;
  return product.image_url ? [product.image_url] : [];
}

function isMediaVideo(mediaUrl: string) {
  return /\.(mp4|webm)(?:\?|$)/i.test(mediaUrl);
}

function resolveMediaUrl(mediaUrl: string | null) {
  if (!mediaUrl) return null;
  if (/^(https?:|data:|blob:)/i.test(mediaUrl)) return mediaUrl;
  return apiBaseUrl.replace(/\/$/, "") + "/" + mediaUrl.replace(/^\//, "");
}

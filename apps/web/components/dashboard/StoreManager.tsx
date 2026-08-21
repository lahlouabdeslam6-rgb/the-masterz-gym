"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Check,
  CreditCard,
  Package,
  PackageCheck,
  Save,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, Card, Input, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import {
  EmptyState,
  Field,
  formatDate,
  selectClass,
  textareaClass,
} from "./dashboard-shared";

type Product = components["schemas"]["StoreProductRead"];
type Reservation = components["schemas"]["StoreReservationRead"];
type ReservationStatus = components["schemas"]["StoreReservationStatus"];
type Sale = components["schemas"]["StoreSaleRead"];
type StorePaymentMethod = components["schemas"]["StorePaymentMethod"];

const reservationLabels: Record<ReservationStatus, string> = {
  pending: "En attente",
  ready: "Disponible",
  rejected: "Refusee",
  completed: "Recuperee",
  cancelled: "Annulee",
};

const paymentLabels: Record<StorePaymentMethod, string> = {
  cash: "Especes",
  bank_card: "Carte",
};

function useStoreHeaders(session: AuthSession) {
  return useMemo(
    () => authorizationHeaders(session.accessToken),
    [session.accessToken],
  );
}

export function AdminStoreManager({ session }: { session: AuthSession }) {
  const headers = useStoreHeaders(session);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("MAD");
  const [stock, setStock] = useState("0");

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/store/products", {
      headers,
      params: { query: { active_only: false } },
    });
    setProducts(result.data ?? []);
    setFeedback(
      result.error ? "Les produits n'ont pas pu etre charges." : null,
    );
    setLoading(false);
  }, [headers]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function createProduct() {
    if (!name.trim() || Number(price) <= 0 || Number(stock) < 0) {
      setFeedback("Verifiez le nom, le prix et le stock du produit.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    const result = await api.POST("/api/v1/store/products", {
      headers,
      body: {
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        price,
        currency: currency.trim().toUpperCase(),
        stock_quantity: Number(stock),
        is_active: true,
      },
    });
    setBusy(false);
    if (!result.data) {
      setFeedback("Le produit n'a pas pu etre cree.");
      return;
    }
    setName("");
    setDescription("");
    setImageUrl("");
    setPrice("");
    setStock("0");
    setFeedback("Produit ajoute au Store.");
    await load();
  }

  return (
    <div className="space-y-6">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-xl font-black text-white">Nouveau produit</h3>
            <p className="mt-1 text-sm text-gray-500">
              L&apos;Admin definit le prix, la photo, le stock et la visibilite.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Field label="Nom du produit">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Whey Protein"
            />
          </Field>
          <Field label="Prix">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
            />
          </Field>
          <div className="grid grid-cols-[0.65fr_1fr] gap-3">
            <Field label="Devise">
              <Input
                value={currency}
                maxLength={3}
                onChange={(event) => setCurrency(event.target.value)}
              />
            </Field>
            <Field label="Stock initial">
              <Input
                type="number"
                min="0"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Lien de la photo">
            <Input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
            />
          </Field>
          <div className="lg:col-span-2">
            <Field label="Description">
              <textarea
                className={`${textareaClass} min-h-24`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Description courte du produit..."
              />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button disabled={busy} onClick={() => void createProduct()}>
            <Save className="h-4 w-4" /> Ajouter le produit
          </Button>
        </div>
      </Card>

      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white">
              Catalogue et stock
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Modifiez chaque produit sans quitter cette page.
            </p>
          </div>
          <Pill>{products.length} produit(s)</Pill>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Chargement...
          </p>
        ) : products.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {products.map((product) => (
              <ProductEditor
                key={`${product.id}-${product.updated_at}`}
                session={session}
                product={product}
                onSaved={load}
              />
            ))}
          </div>
        ) : (
          <EmptyState text="Aucun produit dans le Store." />
        )}
      </div>
    </div>
  );
}

function ProductEditor({
  session,
  product,
  onSaved,
}: {
  session: AuthSession;
  product: Product;
  onSaved: () => Promise<void>;
}) {
  const headers = useStoreHeaders(session);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [imageUrl, setImageUrl] = useState(product.image_url ?? "");
  const [price, setPrice] = useState(product.price);
  const [currency, setCurrency] = useState(product.currency);
  const [stock, setStock] = useState(String(product.stock_quantity));
  const [active, setActive] = useState(product.is_active);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH("/api/v1/store/products/{product_id}", {
      headers,
      params: { path: { product_id: product.id } },
      body: {
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        price,
        currency: currency.trim().toUpperCase(),
        stock_quantity: Number(stock),
        is_active: active,
      },
    });
    setBusy(false);
    if (!result.data) {
      setFeedback("Modification non enregistree.");
      return;
    }
    setFeedback("Produit modifie.");
    await onSaved();
  }

  return (
    <Card className="p-5">
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <ProductVisual product={{ ...product, image_url: imageUrl }} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Prix">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </Field>
          <Field label="Stock">
            <Input
              type="number"
              min="0"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
            />
          </Field>
          <Field label="Devise">
            <Input
              value={currency}
              maxLength={3}
              onChange={(event) => setCurrency(event.target.value)}
            />
          </Field>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Lien de la photo">
          <Input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
          />
        </Field>
        <Field label="Visibilite">
          <select
            className={selectClass}
            value={active ? "active" : "hidden"}
            onChange={(event) => setActive(event.target.value === "active")}
          >
            <option value="active">Visible</option>
            <option value="hidden">Masque</option>
          </select>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Description">
          <textarea
            className={`${textareaClass} min-h-20`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">{feedback}</p>
        <Button variant="outline" disabled={busy} onClick={() => void save()}>
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </div>
    </Card>
  );
}

export function MemberStoreManager({ session }: { session: AuthSession }) {
  const headers = useStoreHeaders(session);
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [productsResult, reservationsResult] = await Promise.all([
      api.GET("/api/v1/store/products", {
        headers,
        params: { query: { active_only: true } },
      }),
      api.GET("/api/v1/store/reservations", {
        headers,
        params: { query: { limit: 100 } },
      }),
    ]);
    setProducts(productsResult.data ?? []);
    setReservations(reservationsResult.data ?? []);
    setFeedback(
      productsResult.error || reservationsResult.error
        ? "Le Store n'a pas pu etre charge completement."
        : null,
    );
    setLoading(false);
  }, [headers]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function reserve(product: Product) {
    const quantity = quantities[product.id] ?? 1;
    setBusyId(product.id);
    setFeedback(null);
    const result = await api.POST("/api/v1/store/reservations", {
      headers,
      body: { product_id: product.id, quantity },
    });
    setBusyId(null);
    if (!result.data) {
      setFeedback("La reservation n'a pas pu etre envoyee. Verifiez le stock.");
      return;
    }
    setFeedback("Reservation envoyee a la Reception.");
    await load();
  }

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">Chargement...</p>
    );
  }
  return (
    <div className="space-y-8">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      {products.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const quantity = quantities[product.id] ?? 1;
            return (
              <Card key={product.id} className="overflow-hidden">
                <ProductVisual product={product} large />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-white">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-sm font-black text-primary">
                        {product.price} {product.currency}
                      </p>
                    </div>
                    <Pill>{product.stock_quantity} en stock</Pill>
                  </div>
                  {product.description ? (
                    <p className="mt-4 text-sm leading-6 text-gray-500">
                      {product.description}
                    </p>
                  ) : null}
                  <div className="mt-5 grid grid-cols-[100px_1fr] gap-3">
                    <Input
                      aria-label={`Quantite ${product.name}`}
                      type="number"
                      min="1"
                      max={product.stock_quantity}
                      value={quantity}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [product.id]: Number(event.target.value),
                        }))
                      }
                    />
                    <Button
                      disabled={
                        product.stock_quantity === 0 ||
                        quantity < 1 ||
                        quantity > product.stock_quantity ||
                        busyId === product.id
                      }
                      onClick={() => void reserve(product)}
                    >
                      <ShoppingBag className="h-4 w-4" /> Reserver
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState text="Aucun produit disponible pour le moment." />
      )}

      <div>
        <h3 className="text-xl font-black text-white">Mes reservations</h3>
        <p className="mt-1 text-sm text-gray-500">
          Suivez ici la validation et la disponibilite de vos produits.
        </p>
        <div className="mt-4 space-y-3">
          {reservations.length ? (
            reservations.map((reservation) => (
              <Card key={reservation.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black text-white">
                      {reservation.product_name} · {reservation.quantity}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      {reservation.total_amount} {reservation.currency} ·{" "}
                      {formatDate(reservation.created_at)}
                    </p>
                    {reservation.notes ? (
                      <p className="mt-2 text-xs text-gray-400">
                        {reservation.notes}
                      </p>
                    ) : null}
                  </div>
                  <Pill>{reservationLabels[reservation.status]}</Pill>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState text="Vous n'avez aucune reservation Store." />
          )}
        </div>
      </div>
    </div>
  );
}

export function StaffStoreManager({ session }: { session: AuthSession }) {
  const headers = useStoreHeaders(session);
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<
    Record<string, StorePaymentMethod>
  >({});
  const [saleProductId, setSaleProductId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [salePayment, setSalePayment] = useState<StorePaymentMethod>("cash");

  const load = useCallback(async () => {
    const [productsResult, reservationsResult, salesResult] = await Promise.all(
      [
        api.GET("/api/v1/store/products", {
          headers,
          params: { query: { active_only: true } },
        }),
        api.GET("/api/v1/store/reservations", {
          headers,
          params: { query: { limit: 100 } },
        }),
        api.GET("/api/v1/store/sales", {
          headers,
          params: { query: { limit: 100 } },
        }),
      ],
    );
    const nextProducts = productsResult.data ?? [];
    setProducts(nextProducts);
    setReservations(reservationsResult.data ?? []);
    setSales(salesResult.data ?? []);
    setSaleProductId((current) => current || nextProducts[0]?.id || "");
    setFeedback(
      productsResult.error || reservationsResult.error || salesResult.error
        ? "Les donnees du Store n'ont pas pu etre chargees completement."
        : null,
    );
    setLoading(false);
  }, [headers]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function changeStatus(
    reservation: Reservation,
    status: ReservationStatus,
  ) {
    setBusyId(reservation.id);
    setFeedback(null);
    const result = await api.PATCH(
      "/api/v1/store/reservations/{reservation_id}/status",
      {
        headers,
        params: { path: { reservation_id: reservation.id } },
        body: {
          status,
          payment_method:
            status === "completed"
              ? (paymentMethods[reservation.id] ?? "cash")
              : null,
        },
      },
    );
    setBusyId(null);
    if (!result.data) {
      setFeedback("Le statut de la reservation n'a pas pu etre modifie.");
      return;
    }
    setFeedback(`Reservation: ${reservationLabels[status]}.`);
    await load();
  }

  async function recordDirectSale() {
    if (!saleProductId || !buyerName.trim() || Number(saleQuantity) < 1) {
      setFeedback("Choisissez le produit, le client et la quantite.");
      return;
    }
    setBusyId("direct-sale");
    setFeedback(null);
    const result = await api.POST("/api/v1/store/sales", {
      headers,
      body: {
        idempotency_key: `store-sale-${crypto.randomUUID()}`,
        product_id: saleProductId,
        buyer_name: buyerName.trim(),
        quantity: Number(saleQuantity),
        payment_method: salePayment,
      },
    });
    setBusyId(null);
    if (!result.data) {
      setFeedback("La vente n'a pas ete enregistree. Verifiez le stock.");
      return;
    }
    setBuyerName("");
    setSaleQuantity("1");
    setFeedback(
      `Vente enregistree: ${result.data.total_amount} ${result.data.currency}.`,
    );
    await load();
  }

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">Chargement...</p>
    );
  }

  const pending = reservations.filter(
    (reservation) => reservation.status === "pending",
  ).length;
  return (
    <div className="space-y-8">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <StoreStat icon={ShoppingBag} value={pending} label="A valider" />
        <StoreStat
          icon={Package}
          value={products.reduce(
            (total, product) => total + product.stock_quantity,
            0,
          )}
          label="Unites en stock"
        />
        <StoreStat icon={ShoppingCart} value={sales.length} label="Ventes" />
      </div>

      <section>
        <h3 className="text-xl font-black text-white">Reservations clients</h3>
        <p className="mt-1 text-sm text-gray-500">
          Validez la disponibilite, puis confirmez le retrait et le paiement.
        </p>
        <div className="mt-4 space-y-4">
          {reservations.length ? (
            reservations.map((reservation) => (
              <Card key={reservation.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg font-black text-white">
                      {reservation.member_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {reservation.member_number} · {reservation.member_phone}
                    </p>
                    <p className="mt-4 font-bold text-gray-200">
                      {reservation.product_name} · {reservation.quantity}{" "}
                      unite(s)
                    </p>
                    <p className="mt-1 text-sm font-bold text-primary">
                      {reservation.total_amount} {reservation.currency}
                    </p>
                  </div>
                  <Pill>{reservationLabels[reservation.status]}</Pill>
                </div>
                {reservation.status === "pending" ? (
                  <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-4">
                    <Button
                      disabled={busyId === reservation.id}
                      onClick={() => void changeStatus(reservation, "ready")}
                    >
                      <PackageCheck className="h-4 w-4" /> Valider disponible
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busyId === reservation.id}
                      onClick={() => void changeStatus(reservation, "rejected")}
                    >
                      <X className="h-4 w-4" /> Refuser
                    </Button>
                  </div>
                ) : null}
                {reservation.status === "ready" ? (
                  <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-[220px_1fr_auto]">
                    <select
                      aria-label={`Paiement ${reservation.product_name}`}
                      className={selectClass}
                      value={paymentMethods[reservation.id] ?? "cash"}
                      onChange={(event) =>
                        setPaymentMethods((current) => ({
                          ...current,
                          [reservation.id]: event.target
                            .value as StorePaymentMethod,
                        }))
                      }
                    >
                      <option value="cash">Especes</option>
                      <option value="bank_card">Carte</option>
                    </select>
                    <Button
                      disabled={busyId === reservation.id}
                      onClick={() =>
                        void changeStatus(reservation, "completed")
                      }
                    >
                      <Check className="h-4 w-4" /> Confirmer retrait
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busyId === reservation.id}
                      onClick={() =>
                        void changeStatus(reservation, "cancelled")
                      }
                    >
                      Annuler
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))
          ) : (
            <EmptyState text="Aucune reservation Store." />
          )}
        </div>
      </section>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-xl font-black text-white">Vente directe</h3>
            <p className="mt-1 text-sm text-gray-500">
              Pour un client qui achete directement dans la salle.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <Field label="Produit">
            <select
              className={selectClass}
              value={saleProductId}
              onChange={(event) => setSaleProductId(event.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · stock {product.stock_quantity}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nom du client">
            <Input
              value={buyerName}
              onChange={(event) => setBuyerName(event.target.value)}
              placeholder="Client local"
            />
          </Field>
          <Field label="Quantite">
            <Input
              type="number"
              min="1"
              value={saleQuantity}
              onChange={(event) => setSaleQuantity(event.target.value)}
            />
          </Field>
          <Field label="Paiement">
            <select
              className={selectClass}
              value={salePayment}
              onChange={(event) =>
                setSalePayment(event.target.value as StorePaymentMethod)
              }
            >
              <option value="cash">Especes</option>
              <option value="bank_card">Carte</option>
            </select>
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            disabled={busyId === "direct-sale" || products.length === 0}
            onClick={() => void recordDirectSale()}
          >
            <Banknote className="h-4 w-4" /> Enregistrer la vente
          </Button>
        </div>
      </Card>

      <section>
        <h3 className="text-xl font-black text-white">Dernieres ventes</h3>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {sales.length ? (
            sales.map((sale) => (
              <Card key={sale.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-white">
                      {sale.product_name} · {sale.quantity}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {sale.buyer_name} · {formatDate(sale.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-primary">
                      {sale.total_amount} {sale.currency}
                    </p>
                    <p className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-500">
                      {sale.payment_method === "cash" ? (
                        <Banknote className="h-3.5 w-3.5" />
                      ) : (
                        <CreditCard className="h-3.5 w-3.5" />
                      )}
                      {paymentLabels[sale.payment_method]}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState text="Aucune vente Store enregistree." />
          )}
        </div>
      </section>
    </div>
  );
}

function ProductVisual({
  product,
  large = false,
}: {
  product: Pick<Product, "name" | "image_url">;
  large?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`Photo ${product.name}`}
      className={`flex items-center justify-center bg-[linear-gradient(135deg,rgba(0,212,255,0.14),rgba(5,10,15,0.9))] bg-cover bg-center ${
        large ? "h-48" : "h-36 rounded-sm"
      }`}
      style={
        product.image_url
          ? { backgroundImage: `url("${product.image_url}")` }
          : undefined
      }
    >
      {!product.image_url ? (
        <Package className="h-10 w-10 text-primary/50" />
      ) : null}
    </div>
  );
}

function StoreStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Package;
  value: number;
  label: string;
}) {
  return (
    <Card className="p-5">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>
    </Card>
  );
}

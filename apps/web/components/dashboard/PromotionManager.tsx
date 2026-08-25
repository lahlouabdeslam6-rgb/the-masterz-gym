"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Pencil, Plus, UsersRound } from "lucide-react";
import { Alert, Button, Input, Label, LoadingMessage, Pill } from "@masterz/ui";
import type { components } from "@masterz/api-client";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import {
  EmptyState,
  Field,
  selectClass,
  textareaClass,
} from "./dashboard-shared";

type Promotion = components["schemas"]["PromotionRead"];
type Plan = components["schemas"]["MembershipPlanRead"];

type PromotionForm = {
  title: string;
  short_description: string;
  description: string;
  base_plan_id: string;
  price: string;
  currency: string;
  participant_count: string;
  starts_at: string;
  ends_at: string;
  terms: string;
  is_active: boolean;
  is_featured: boolean;
};

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultForm(): PromotionForm {
  const starts = new Date();
  starts.setMinutes(0, 0, 0);
  const ends = new Date(starts);
  ends.setDate(ends.getDate() + 30);
  return {
    title: "",
    short_description: "",
    description: "",
    base_plan_id: "",
    price: "",
    currency: "MAD",
    participant_count: "1",
    starts_at: localDateTime(starts),
    ends_at: localDateTime(ends),
    terms: "",
    is_active: true,
    is_featured: false,
  };
}

function formFromPromotion(promotion: Promotion): PromotionForm {
  return {
    title: promotion.title,
    short_description: promotion.short_description,
    description: promotion.description,
    base_plan_id: promotion.base_plan_id,
    price: String(promotion.price),
    currency: promotion.currency,
    participant_count: String(promotion.participant_count),
    starts_at: localDateTime(new Date(promotion.starts_at)),
    ends_at: localDateTime(new Date(promotion.ends_at)),
    terms: promotion.terms ?? "",
    is_active: promotion.is_active,
    is_featured: promotion.is_featured,
  };
}

export function PromotionManager({ session }: { session: AuthSession }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<PromotionForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [promotionsResult, plansResult] = await Promise.all([
      api.GET("/api/v1/admin/promotions", {
        headers: authorizationHeaders(session.accessToken),
      }),
      api.GET("/api/v1/membership-plans", {
        params: { query: { active_only: true, service_type: "gym" } },
      }),
    ]);
    const nextPlans = plansResult.data ?? [];
    setPromotions(promotionsResult.data ?? []);
    setPlans(nextPlans);
    setForm((current) => ({
      ...current,
      base_plan_id: current.base_plan_id || nextPlans[0]?.id || "",
    }));
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  function updateField<Key extends keyof PromotionForm>(
    key: Key,
    value: PromotionForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    const next = defaultForm();
    next.base_plan_id = plans[0]?.id ?? "";
    setForm(next);
    setEditingId(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const headers = authorizationHeaders(session.accessToken);
    const body = {
      title: form.title,
      short_description: form.short_description,
      description: form.description,
      base_plan_id: form.base_plan_id,
      price: form.price,
      currency: form.currency.toUpperCase(),
      participant_count: Number(form.participant_count),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      terms: form.terms.trim() || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
    };
    const result = editingId
      ? await api.PATCH("/api/v1/admin/promotions/{promotion_id}", {
          headers,
          params: { path: { promotion_id: editingId } },
          body,
        })
      : await api.POST("/api/v1/admin/promotions", { headers, body });
    setBusy(false);
    if (!result.data) {
      setFeedback(
        "L'offre n'a pas pu etre enregistree. Verifiez les dates et les champs.",
      );
      return;
    }
    setFeedback(editingId ? "Offre mise a jour." : "Offre creee.");
    resetForm();
    await load();
  }

  if (loading) return <LoadingMessage message="Chargement des offres..." />;

  return (
    <div className="space-y-7">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      <form
        onSubmit={save}
        className="rounded-lg border border-primary/20 bg-primary/[0.04] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
              {editingId ? "Modification" : "Nouvelle campagne"}
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase text-white">
              {editingId
                ? "Modifier l'offre"
                : "Creer une offre promotionnelle"}
            </h3>
          </div>
          {editingId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetForm}
            >
              Annuler la modification
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Field label="Titre de l'offre">
            <Input
              required
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Ex. Offre Duo Masterz"
            />
          </Field>
          <Field label="Formule de base">
            <select
              className={selectClass}
              required
              value={form.base_plan_id}
              onChange={(event) =>
                updateField("base_plan_id", event.target.value)
              }
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {plan.price} {plan.currency}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Texte court du banner">
            <Input
              required
              value={form.short_description}
              onChange={(event) =>
                updateField("short_description", event.target.value)
              }
              placeholder="Une phrase claire pour la barre du site"
            />
          </Field>
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
            <Field label="Prix special">
              <Input
                required
                type="number"
                min="1"
                step="0.01"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
              />
            </Field>
            <Field label="Devise">
              <Input
                required
                maxLength={3}
                value={form.currency}
                onChange={(event) =>
                  updateField("currency", event.target.value)
                }
              />
            </Field>
          </div>
          <Field label="Nombre de personnes">
            <Input
              required
              type="number"
              min="1"
              max="20"
              value={form.participant_count}
              onChange={(event) =>
                updateField("participant_count", event.target.value)
              }
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Debut de l'offre">
              <Input
                required
                type="datetime-local"
                value={form.starts_at}
                onChange={(event) =>
                  updateField("starts_at", event.target.value)
                }
              />
            </Field>
            <Field label="Fin de l'offre">
              <Input
                required
                type="datetime-local"
                value={form.ends_at}
                onChange={(event) => updateField("ends_at", event.target.value)}
              />
            </Field>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="promotion-description">Description complete</Label>
            <textarea
              id="promotion-description"
              required
              className={`${textareaClass} mt-2.5 min-h-32`}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="promotion-terms">Conditions de l’offre</Label>
            <textarea
              id="promotion-terms"
              className={`${textareaClass} mt-2.5 min-h-24`}
              value={form.terms}
              onChange={(event) => updateField("terms", event.target.value)}
              placeholder="Ex. Les deux inscriptions sont finalisees ensemble a la Reception."
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Offre active"
            description="Elle peut etre consultee pendant sa periode."
            checked={form.is_active}
            onChange={(checked) =>
              setForm((current) => ({
                ...current,
                is_active: checked,
                is_featured: checked ? current.is_featured : false,
              }))
            }
          />
          <Toggle
            label="Afficher dans le banner"
            description="Elle remplace le texte en haut du site."
            checked={form.is_featured}
            onChange={(checked) =>
              setForm((current) => ({
                ...current,
                is_featured: checked,
                is_active: checked ? true : current.is_active,
              }))
            }
          />
        </div>

        <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={busy}>
          {editingId ? (
            <Pencil className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {editingId ? "Enregistrer les modifications" : "Creer l'offre"}
        </Button>
      </form>

      <div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
              Campagnes
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase text-white">
              Offres enregistrees
            </h3>
          </div>
          <Pill>{promotions.length} offre(s)</Pill>
        </div>
        {!promotions.length ? (
          <div className="mt-4">
            <EmptyState text="Aucune offre promotionnelle." />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {promotions.map((promotion) => (
              <article
                key={promotion.id}
                className="rounded-lg border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Pill>{promotion.is_active ? "Active" : "Masquee"}</Pill>
                      {promotion.is_featured ? <Pill>Banner</Pill> : null}
                    </div>
                    <h4 className="mt-3 text-xl font-black uppercase text-white">
                      {promotion.title}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      {promotion.base_plan_name}
                    </p>
                  </div>
                  <p className="text-right text-2xl font-black text-primary">
                    {promotion.price} {promotion.currency}
                  </p>
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-300">
                  {promotion.short_description}
                </p>
                <div className="mt-4 grid gap-2 border-y border-white/10 py-4 text-xs text-gray-400 sm:grid-cols-2">
                  <p className="flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-primary" />
                    {promotion.participant_count} personne(s)
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Jusqu’au{" "}
                    {new Date(promotion.ends_at).toLocaleDateString("fr-MA")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setEditingId(promotion.id);
                    setForm(formFromPromotion(promotion));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Pencil className="h-4 w-4" /> Modifier
                </Button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-sm border border-white/10 bg-black/20 p-4">
      <input
        type="checkbox"
        className="h-5 w-5 accent-cyan-400"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block text-sm font-black text-white">{label}</span>
        <span className="mt-1 block text-xs text-gray-500">{description}</span>
      </span>
    </label>
  );
}

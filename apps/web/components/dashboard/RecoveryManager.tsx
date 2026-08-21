"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  History,
  Search,
  Snowflake,
  Sparkles,
  Waves,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, Card, Input, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import {
  EmptyState,
  Field,
  formatDate,
  textareaClass,
} from "./dashboard-shared";

type RecoveryClient = components["schemas"]["RecoveryClientSummary"];
type RecoveryTracking = components["schemas"]["RecoveryTrackingRead"];
type RecoveryService = components["schemas"]["RecoveryService"];

const serviceOptions: Array<{
  value: RecoveryService;
  label: string;
  icon: typeof Waves;
}> = [
  { value: "sauna", label: "Sauna", icon: Sparkles },
  { value: "cold_bath", label: "Bain froid", icon: Snowflake },
  { value: "compression", label: "Compression", icon: Waves },
];

const serviceLabels: Record<RecoveryService, string> = {
  sauna: "Sauna",
  cold_bath: "Bain froid",
  compression: "Compression",
};

function dateTimeInputValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function RecoveryManager({ session }: { session: AuthSession }) {
  const [clients, setClients] = useState<RecoveryClient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<RecoveryTracking | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [occurredAt, setOccurredAt] = useState(dateTimeInputValue());
  const [services, setServices] = useState<RecoveryService[]>([]);
  const [notes, setNotes] = useState("");
  const headers = useMemo(
    () => authorizationHeaders(session.accessToken),
    [session.accessToken],
  );

  const loadClients = useCallback(async () => {
    const result = await api.GET("/api/v1/recovery/clients", {
      headers,
      params: { query: { limit: 100 } },
    });
    const next = result.data ?? [];
    setClients(next);
    setSelectedId((current) => current ?? next[0]?.member_id ?? null);
    setFeedback(
      result.error ? "La liste recovery n’a pas pu être chargée." : null,
    );
    setLoading(false);
  }, [headers]);

  const loadTracking = useCallback(
    async (memberId: string) => {
      setTrackingLoading(true);
      const result = await api.GET("/api/v1/recovery/members/{member_id}", {
        headers,
        params: { path: { member_id: memberId }, query: { limit: 100 } },
      });
      setTracking(result.data ?? null);
      if (result.error)
        setFeedback("Le dossier recovery n’a pas pu être chargé.");
      setTrackingLoading(false);
    },
    [headers],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadClients(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadClients]);

  useEffect(() => {
    if (!selectedId) return;
    const timeoutId = window.setTimeout(() => void loadTracking(selectedId), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadTracking, selectedId]);

  const visibleClients = clients.filter((client) => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return true;
    return [client.member_name, client.member_number, client.phone].some(
      (value) => value.toLocaleLowerCase("fr").includes(normalized),
    );
  });
  const currentPack =
    tracking?.subscriptions.find((subscription) => subscription.is_usable) ??
    tracking?.subscriptions[0];

  function toggleService(value: RecoveryService) {
    setServices((current) =>
      current.includes(value)
        ? current.filter((service) => service !== value)
        : [...current, value],
    );
  }

  async function recordVisit() {
    if (!selectedId || services.length === 0 || !occurredAt) return;
    setBusy(true);
    setFeedback(null);
    const result = await api.POST("/api/v1/recovery/visits", {
      headers,
      body: {
        idempotency_key: `recovery-${crypto.randomUUID()}`,
        member_id: selectedId,
        occurred_at: new Date(occurredAt).toISOString(),
        services,
        notes: notes.trim() || null,
      },
    });
    setBusy(false);
    if (!result.data) {
      setFeedback(
        "Le passage n’a pas été enregistré. Vérifiez la date et le solde du pack.",
      );
      return;
    }
    setFeedback(
      `Passage enregistré. ${result.data.remaining_sessions_after} séance(s) restante(s).`,
    );
    setServices([]);
    setNotes("");
    setOccurredAt(dateTimeInputValue());
    await Promise.all([loadTracking(selectedId), loadClients()]);
  }

  return (
    <div className="space-y-6">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
        <Card className="h-fit p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                Clients recovery
              </p>
              <h3 className="mt-2 text-xl font-black text-white">
                Choisir un membre
              </h3>
            </div>
            <Pill>{clients.length} pack(s)</Pill>
          </div>
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              aria-label="Rechercher un client recovery"
              className="pl-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, téléphone ou numéro membre"
            />
          </div>
          <div className="mt-4 grid max-h-[680px] gap-3 overflow-y-auto pr-1">
            {visibleClients.map((client) => (
              <button
                key={client.member_id}
                type="button"
                onClick={() => setSelectedId(client.member_id)}
                className={`rounded-sm border p-4 text-left transition ${
                  selectedId === client.member_id
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-black/20 hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">
                      {client.member_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {client.member_number}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[0.65rem] font-black text-primary">
                    {client.subscription.remaining_sessions ?? "?"} /{" "}
                    {client.subscription.total_sessions ?? "?"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  {client.subscription.plan_name}
                </p>
              </button>
            ))}
            {!loading && visibleClients.length === 0 ? (
              <EmptyState text="Aucun client recovery dans cette liste." />
            ) : null}
            {loading ? (
              <p className="py-4 text-sm text-gray-500">Chargement...</p>
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          {trackingLoading ? (
            <Card className="p-8 text-sm text-gray-500">
              Chargement du dossier recovery...
            </Card>
          ) : tracking && currentPack ? (
            <>
              <Card className="overflow-hidden border-primary/25">
                <div className="grid gap-5 bg-[linear-gradient(115deg,rgba(0,212,255,.13),transparent_60%)] p-5 sm:grid-cols-[1fr_auto] sm:p-7">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                      Pack actuel
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-white">
                      {tracking.member_name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {currentPack.plan_name} · du{" "}
                      {formatDate(currentPack.starts_on)} au{" "}
                      {formatDate(currentPack.ends_on)}
                    </p>
                  </div>
                  <div className="rounded-sm border border-primary/25 bg-black/30 px-6 py-4 text-center">
                    <p className="text-4xl font-black text-primary">
                      {currentPack.remaining_sessions ?? "—"}
                    </p>
                    <p className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-gray-400">
                      sur {currentPack.total_sessions ?? "—"} séances
                    </p>
                  </div>
                </div>
                {!currentPack.total_sessions ? (
                  <div className="border-t border-amber-300/20 bg-amber-300/[0.06] px-5 py-4 text-sm text-amber-100 sm:px-7">
                    Cette ancienne offre n’a pas encore de nombre de séances.
                    L’Admin doit la configurer dans Formules.
                  </div>
                ) : !currentPack.is_usable ? (
                  <div className="border-t border-white/10 px-5 py-4 text-sm text-gray-400 sm:px-7">
                    Ce pack n’est pas utilisable aujourd’hui: vérifiez sa date,
                    son statut ou son solde.
                  </div>
                ) : null}
              </Card>

              <Card className="p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                    <Check className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-white">
                      Enregistrer un passage
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Un passage retire une seule séance, même si le membre
                      utilise les trois services.
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {serviceOptions.map(({ value, label, icon: Icon }) => {
                    const checked = services.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleService(value)}
                        className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-sm border transition ${
                          checked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-white/10 bg-black/20 text-gray-400 hover:border-white/25"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-black uppercase tracking-[0.08em]">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Date et heure du passage">
                    <Input
                      type="datetime-local"
                      value={occurredAt}
                      max={dateTimeInputValue()}
                      onChange={(event) => setOccurredAt(event.target.value)}
                    />
                    <span className="block text-[11px] font-normal normal-case tracking-normal text-gray-600">
                      Vous pouvez choisir une autre date passée si le passage
                      n’a pas été saisi le jour même.
                    </span>
                  </Field>
                  <Field label="Note optionnelle">
                    <textarea
                      className={`${textareaClass} min-h-12 py-3`}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Ex. séance encadrée..."
                    />
                  </Field>
                </div>
                <Button
                  className="mt-5 w-full sm:w-auto"
                  disabled={
                    busy ||
                    services.length === 0 ||
                    !occurredAt ||
                    !currentPack.is_usable
                  }
                  onClick={() => void recordVisit()}
                >
                  <Check className="h-4 w-4" /> Confirmer le passage
                </Button>
              </Card>

              <RecoveryHistory tracking={tracking} />
            </>
          ) : selectedId ? (
            <EmptyState text="Aucun pack recovery disponible pour ce membre." />
          ) : (
            <EmptyState text="Choisissez un client pour ouvrir son dossier recovery." />
          )}
        </div>
      </div>
    </div>
  );
}

export function MemberRecoveryPanel({
  session,
  memberId,
}: {
  session: AuthSession;
  memberId: string;
}) {
  const [tracking, setTracking] = useState<RecoveryTracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await api.GET("/api/v1/recovery/members/{member_id}", {
        headers: authorizationHeaders(session.accessToken),
        params: { path: { member_id: memberId }, query: { limit: 100 } },
      });
      if (active) {
        setTracking(result.data ?? null);
        setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [memberId, session.accessToken]);

  if (loading) return <p className="text-sm text-gray-500">Chargement...</p>;
  if (!tracking || tracking.subscriptions.length === 0) {
    return <EmptyState text="Aucun pack recovery enregistré." />;
  }
  const pack =
    tracking.subscriptions.find((subscription) => subscription.is_usable) ??
    tracking.subscriptions[0];
  return (
    <div className="space-y-5">
      <Card className="grid gap-5 border-primary/25 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-lg font-black text-white">{pack.plan_name}</p>
          <p className="mt-1 text-sm text-gray-500">
            Du {formatDate(pack.starts_on)} au {formatDate(pack.ends_on)}
          </p>
        </div>
        <div className="rounded-sm bg-primary/10 px-5 py-3 text-center">
          <p className="text-2xl font-black text-primary">
            {pack.remaining_sessions ?? "—"} / {pack.total_sessions ?? "—"}
          </p>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-gray-400">
            séances restantes
          </p>
        </div>
      </Card>
      <RecoveryHistory tracking={tracking} compact />
    </div>
  );
}

function RecoveryHistory({
  tracking,
  compact = false,
}: {
  tracking: RecoveryTracking;
  compact?: boolean;
}) {
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <History className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-black uppercase text-white">
            Historique recovery
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Chaque ligne correspond à une séance réellement consommée.
          </p>
        </div>
      </div>
      {tracking.visits.length ? (
        <div className="mt-5 grid gap-3">
          {tracking.visits.slice(0, compact ? 10 : 100).map((visit) => (
            <div
              key={visit.id}
              className="grid gap-3 rounded-sm border border-white/10 bg-black/20 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="font-bold text-white">
                  {formatDate(visit.occurred_at)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {visit.services
                    .map((service) => serviceLabels[service])
                    .join(" · ")}
                </p>
                {visit.notes ? (
                  <p className="mt-2 text-xs text-gray-400">{visit.notes}</p>
                ) : null}
              </div>
              <Pill>{visit.remaining_sessions_after} restante(s)</Pill>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState text="Aucun passage recovery enregistré." />
        </div>
      )}
    </Card>
  );
}

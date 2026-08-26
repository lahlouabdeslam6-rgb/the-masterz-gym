"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Plus,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, Card, Input, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { notifyNavigationBadgesChanged } from "@/lib/navigation-badges";
import {
  EmptyState,
  Field,
  formatDate,
  selectClass,
  textareaClass,
} from "./dashboard-shared";

type Complaint = components["schemas"]["ComplaintRead"];
type ComplaintCategory = components["schemas"]["ComplaintCategory"];
type ComplaintStatus = components["schemas"]["ComplaintStatus"];

const categories: Array<{
  value: ComplaintCategory;
  label: string;
  target: "Administration" | "Reception";
}> = [
  { value: "payment", label: "Paiement", target: "Reception" },
  { value: "subscription", label: "Abonnement", target: "Reception" },
  { value: "access", label: "Entree et acces", target: "Reception" },
  { value: "reservation", label: "Reservation", target: "Reception" },
  { value: "recovery", label: "Recovery", target: "Reception" },
  { value: "store", label: "Store", target: "Reception" },
  { value: "coaching", label: "Coaching", target: "Administration" },
  { value: "account", label: "Compte membre", target: "Administration" },
  { value: "behavior", label: "Comportement", target: "Administration" },
  { value: "other", label: "Autre", target: "Administration" },
];

const categoryLabels = Object.fromEntries(
  categories.map((category) => [category.value, category.label]),
) as Record<ComplaintCategory, string>;

const statusLabels: Record<ComplaintStatus, string> = {
  open: "Ouverte",
  in_progress: "En cours",
  resolved: "Resolue",
};

const statusIcons: Record<ComplaintStatus, typeof Clock3> = {
  open: MessageSquareText,
  in_progress: Clock3,
  resolved: CheckCircle2,
};

export function ComplaintCenter({
  session,
  mode,
}: {
  session: AuthSession;
  mode: "member" | "staff";
}) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ComplaintCategory>("subscription");
  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [reply, setReply] = useState("");
  const headers = useMemo(
    () => authorizationHeaders(session.accessToken),
    [session.accessToken],
  );

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/complaints", {
      headers,
      params: { query: { limit: 100 } },
    });
    const next = result.data ?? [];
    setComplaints(next);
    setSelectedId((current) =>
      current && next.some((item) => item.id === current)
        ? current
        : (next[0]?.id ?? null),
    );
    setFeedback(
      result.error ? "Les reclamations n'ont pas pu etre chargees." : null,
    );
    setLoading(false);
  }, [headers]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const selected = complaints.find((item) => item.id === selectedId) ?? null;
  const visible = complaints.filter((complaint) => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return true;
    return [
      complaint.subject,
      complaint.member_name,
      complaint.member_number,
      categoryLabels[complaint.category],
      statusLabels[complaint.status],
    ].some((value) => value.toLocaleLowerCase("fr").includes(normalized));
  });
  const selectedCategory = categories.find((item) => item.value === category);

  async function createComplaint() {
    if (subject.trim().length < 3 || initialMessage.trim().length < 3) {
      setFeedback("Ecrivez un sujet et expliquez votre reclamation.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    const result = await api.POST("/api/v1/complaints", {
      headers,
      body: {
        category,
        subject: subject.trim(),
        message: initialMessage.trim(),
      },
    });
    setBusy(false);
    if (!result.data) {
      setFeedback("La reclamation n'a pas pu etre envoyee.");
      return;
    }
    setComplaints((current) => [result.data!, ...current]);
    setSelectedId(result.data.id);
    setSubject("");
    setInitialMessage("");
    setFeedback(
      `Reclamation envoyee a ${selectedCategory?.target ?? "l'equipe"}.`,
    );
    notifyNavigationBadgesChanged();
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setFeedback(null);
    const result = await api.POST(
      "/api/v1/complaints/{complaint_id}/messages",
      {
        headers,
        params: { path: { complaint_id: selected.id } },
        body: { body: reply.trim() },
      },
    );
    setBusy(false);
    if (!result.data) {
      setFeedback("La reponse n'a pas pu etre envoyee.");
      return;
    }
    replaceComplaint(result.data);
    setReply("");
    setFeedback("Reponse envoyee.");
    notifyNavigationBadgesChanged();
  }

  async function updateStatus(status: ComplaintStatus) {
    if (!selected || mode !== "staff") return;
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH("/api/v1/complaints/{complaint_id}/status", {
      headers,
      params: { path: { complaint_id: selected.id } },
      body: { status },
    });
    setBusy(false);
    if (!result.data) {
      setFeedback("Le statut n'a pas pu etre modifie.");
      return;
    }
    replaceComplaint(result.data);
    setFeedback(`Statut modifie: ${statusLabels[status]}.`);
    notifyNavigationBadgesChanged();
  }

  function replaceComplaint(updated: Complaint) {
    setComplaints((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  return (
    <div className="space-y-6">
      {feedback ? <Alert type="info" message={feedback} /> : null}

      {mode === "member" ? (
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-white">
                Nouvelle reclamation
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Choisissez le sujet. Le message sera dirige vers la bonne
                equipe.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Field label="Categorie">
              <select
                className={selectClass}
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ComplaintCategory)
                }
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sujet">
              <Input
                value={subject}
                maxLength={180}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ex. Question sur mon abonnement"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Votre message">
              <textarea
                className={`${textareaClass} min-h-28`}
                value={initialMessage}
                maxLength={4000}
                onChange={(event) => setInitialMessage(event.target.value)}
                placeholder="Expliquez votre demande avec les details utiles..."
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Destinataire: {selectedCategory?.target}
            </p>
            <Button disabled={busy} onClick={() => void createComplaint()}>
              <Send className="h-4 w-4" /> Envoyer la reclamation
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(290px,0.75fr)_minmax(0,1.25fr)]">
        <Card className="h-fit p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-black text-white">
              {mode === "member" ? "Mes demandes" : "File des reclamations"}
            </h3>
            <Pill>{complaints.length}</Pill>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              aria-label="Rechercher une reclamation"
              className="pl-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                mode === "staff" ? "Membre, sujet ou statut" : "Sujet ou statut"
              }
            />
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Chargement...
              </p>
            ) : visible.length ? (
              visible.map((complaint) => {
                const StatusIcon = statusIcons[complaint.status];
                return (
                  <button
                    key={complaint.id}
                    type="button"
                    onClick={() => setSelectedId(complaint.id)}
                    className={`w-full rounded-sm border p-4 text-left transition ${
                      selectedId === complaint.id
                        ? "border-primary bg-primary/10"
                        : "border-white/10 bg-black/20 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-white">
                        {complaint.subject}
                      </p>
                      <StatusIcon className="h-4 w-4 shrink-0 text-primary" />
                    </div>
                    {mode === "staff" ? (
                      <p className="mt-2 text-xs font-bold text-gray-300">
                        {complaint.member_name} · {complaint.member_number}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-gray-500">
                      {categoryLabels[complaint.category]} ·{" "}
                      {statusLabels[complaint.status]}
                    </p>
                  </button>
                );
              })
            ) : (
              <EmptyState text="Aucune reclamation dans cette liste." />
            )}
          </div>
        </Card>

        <Card className="min-h-[420px] p-5 sm:p-6">
          {selected ? (
            <Conversation
              complaint={selected}
              mode={mode}
              reply={reply}
              busy={busy}
              onReplyChange={setReply}
              onReply={() => void sendReply()}
              onStatus={(status) => void updateStatus(status)}
            />
          ) : (
            <div className="flex min-h-[370px] items-center justify-center">
              <EmptyState text="Choisissez une reclamation pour ouvrir la conversation." />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Conversation({
  complaint,
  mode,
  reply,
  busy,
  onReplyChange,
  onReply,
  onStatus,
}: {
  complaint: Complaint;
  mode: "member" | "staff";
  reply: string;
  busy: boolean;
  onReplyChange: (value: string) => void;
  onReply: () => void;
  onStatus: (status: ComplaintStatus) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            {categoryLabels[complaint.category]}
          </p>
          <h3 className="mt-2 text-xl font-black text-white">
            {complaint.subject}
          </h3>
          <p className="mt-2 text-xs text-gray-500">
            {mode === "staff"
              ? `${complaint.member_name} · ${complaint.member_number}`
              : `Traitee par ${complaint.assigned_role === "receptionist" ? "la Reception" : "l'Administration"}`}
          </p>
        </div>
        {mode === "staff" ? (
          <select
            aria-label="Statut de la reclamation"
            className={`${selectClass} sm:w-44`}
            value={complaint.status}
            disabled={busy}
            onChange={(event) =>
              onStatus(event.target.value as ComplaintStatus)
            }
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <Pill>{statusLabels[complaint.status]}</Pill>
        )}
      </div>

      <div className="mt-5 max-h-[430px] space-y-4 overflow-y-auto pr-1">
        {complaint.messages.map((message) => {
          const ownMessage = message.author_id === complaint.member_id;
          return (
            <div
              key={message.id}
              className={`flex ${ownMessage ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[88%] rounded-sm border px-4 py-3 ${
                  ownMessage
                    ? "border-white/10 bg-black/25"
                    : "border-primary/30 bg-primary/10"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-xs font-black text-white">
                    {message.author_name}
                  </p>
                  <p className="text-[11px] text-gray-600">
                    {formatDate(message.created_at)}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                  {message.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <Field label="Ajouter une reponse">
          <textarea
            className={`${textareaClass} min-h-24`}
            value={reply}
            maxLength={4000}
            onChange={(event) => onReplyChange(event.target.value)}
            placeholder="Ecrivez votre reponse..."
          />
        </Field>
        <div className="mt-3 flex justify-end">
          <Button disabled={busy || !reply.trim()} onClick={onReply}>
            <Send className="h-4 w-4" /> Envoyer la reponse
          </Button>
        </div>
      </div>
    </div>
  );
}

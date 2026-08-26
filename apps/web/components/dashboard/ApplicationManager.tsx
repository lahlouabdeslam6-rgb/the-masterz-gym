"use client";

import { useState } from "react";
import { Check, CreditCard, Info, X } from "lucide-react";
import { Alert, Button, Input, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { notifyNavigationBadgesChanged } from "@/lib/navigation-badges";
import {
  type Application,
  type Receipt,
  Field,
  EmptyState,
  formatDate,
  selectClass,
  statusLabels,
} from "./dashboard-shared";

function apiErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const detail = "detail" in error ? error.detail : null;
  if (detail && typeof detail === "object" && "message" in detail) {
    const message = detail.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ApplicationManager({
  session,
  applications,
  onReload,
}: {
  session: AuthSession;
  applications: Application[];
  onReload: () => Promise<void> | void;
}) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<Record<string, "cash" | "bank_card">>(
    {},
  );
  const [startDates, setStartDates] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const headers = authorizationHeaders(session.accessToken);

  async function review(
    applicationId: string,
    status: "approved" | "rejected" | "more_information_required",
  ) {
    const reason = reasons[applicationId]?.trim() || null;
    if (status !== "approved" && !reason) {
      setFeedback(
        "Ajoutez un motif avant de refuser ou demander des informations.",
      );
      return;
    }
    setBusyId(applicationId);
    setFeedback(null);
    const result = await api.PATCH(
      "/api/v1/membership-applications/{application_id}/review",
      {
        headers,
        params: { path: { application_id: applicationId } },
        body: { status, reason },
      },
    );
    setFeedback(
      result.data
        ? status === "approved"
          ? "Demande acceptee. Enregistrez maintenant le paiement et la date de debut."
          : "Demande mise a jour."
        : apiErrorMessage(
            result.error,
            "La demande ne peut pas etre mise a jour.",
          ),
    );
    setBusyId(null);
    if (result.data) {
      await onReload();
      notifyNavigationBadgesChanged();
    }
  }

  async function collectPayment(applicationId: string) {
    const method = methods[applicationId] ?? "cash";
    setBusyId(applicationId);
    setFeedback(null);
    const result = await api.POST("/api/v1/payments/memberships", {
      headers,
      body: {
        idempotency_key: crypto.randomUUID(),
        application_id: applicationId,
        starts_on: startDates[applicationId] ?? todayInputValue(),
        method,
        bank_transfer_reference: null,
      },
    });
    setBusyId(null);
    if (result.data) {
      setReceipt(result.data);
      setFeedback("Paiement enregistré et reçu généré.");
      await onReload();
      notifyNavigationBadgesChanged();
    } else {
      setFeedback(
        apiErrorMessage(
          result.error,
          "Le paiement n'a pas pu etre enregistre.",
        ),
      );
    }
  }

  return (
    <div className="space-y-4">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      {receipt ? <ReceiptSummary receipt={receipt} /> : null}
      {!applications.length ? (
        <EmptyState text="Aucune demande pour le moment." />
      ) : (
        applications.map((application) => {
          const method = methods[application.id] ?? "cash";
          return (
            <article
              key={application.id}
              className="rounded-sm border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-bold text-white">
                    {application.full_name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {application.phone}
                    {application.email ? ` · ${application.email}` : ""}
                  </p>
                </div>
                <Pill>
                  {statusLabels[application.status] ?? application.status}
                </Pill>
              </div>

              {application.promotion_id ? (
                <div className="mt-4 rounded-sm border border-primary/25 bg-primary/[0.07] p-4">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
                    Offre promotionnelle choisie
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="font-black uppercase text-white">
                        {application.promotion_title}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Offre pour {application.promotion_participant_count}{" "}
                        personne(s)
                      </p>
                    </div>
                    <p className="text-xl font-black text-primary">
                      {application.promotion_price}{" "}
                      {application.promotion_currency}
                    </p>
                  </div>
                </div>
              ) : null}

              {application.status === "pending" ||
              application.status === "more_information_required" ? (
                <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  <Input
                    placeholder="Motif si refus ou informations requises"
                    value={reasons[application.id] ?? ""}
                    onChange={(event) =>
                      setReasons((current) => ({
                        ...current,
                        [application.id]: event.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => review(application.id, "approved")}
                      disabled={busyId === application.id}
                    >
                      <Check className="h-4 w-4" /> Accepter la demande
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        review(application.id, "more_information_required")
                      }
                      disabled={busyId === application.id}
                    >
                      <Info className="h-4 w-4" /> Plus d’infos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => review(application.id, "rejected")}
                      disabled={busyId === application.id}
                    >
                      <X className="h-4 w-4" /> Refuser
                    </Button>
                  </div>
                </div>
              ) : null}

              {application.status === "approved" ? (
                <div className="mt-4 space-y-4 border-t border-primary/20 pt-4">
                  <div className="rounded-sm border border-emerald-300/30 bg-emerald-300/[0.07] p-4">
                    <p className="font-black uppercase text-emerald-200">
                      Demande acceptee
                    </p>
                    <p className="mt-1 text-sm leading-6 text-gray-400">
                      L&apos;etape suivante est l&apos;encaissement. Le compte
                      membre sera cree apres le paiement.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Mode de paiement">
                      <select
                        className={selectClass}
                        value={method}
                        onChange={(event) =>
                          setMethods((current) => ({
                            ...current,
                            [application.id]: event.target
                              .value as typeof method,
                          }))
                        }
                      >
                        <option value="cash">Espèces</option>
                        <option value="bank_card">Carte bancaire</option>
                      </select>
                    </Field>
                    <Field label="Date de debut de l'abonnement">
                      <Input
                        type="date"
                        value={startDates[application.id] ?? todayInputValue()}
                        onChange={(event) =>
                          setStartDates((current) => ({
                            ...current,
                            [application.id]: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Button
                      className="sm:col-span-2"
                      onClick={() => collectPayment(application.id)}
                      disabled={busyId === application.id}
                    >
                      <CreditCard className="h-4 w-4" /> Encaisser et générer le
                      reçu
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })
      )}
    </div>
  );
}

export function ReceiptSummary({ receipt }: { receipt: Receipt }) {
  const serviceTypeLabels = {
    gym: "Salle musculation",
    coaching: "Coaching",
    recovery: "Recovery",
  } as const;

  return (
    <div className="rounded-sm border border-emerald-400/25 bg-emerald-400/[0.07] p-5">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
        Reçu {receipt.receipt_number}
      </p>
      <div className="mt-3 grid gap-3 text-sm text-gray-300 sm:grid-cols-2">
        <p>
          Membre : <strong className="text-white">{receipt.member_name}</strong>
        </p>
        <p>
          Formule : <strong className="text-white">{receipt.plan_name}</strong>
        </p>
        <p>
          Categorie :{" "}
          <strong className="text-white">
            {serviceTypeLabels[receipt.service_type]}
          </strong>
        </p>
        <p>
          Montant :{" "}
          <strong className="text-white">
            {receipt.amount} {receipt.currency}
          </strong>
        </p>
        {receipt.service_type === "recovery" ? (
          <p>
            Seances :{" "}
            <strong className="text-white">
              {receipt.remaining_sessions ?? "—"} /{" "}
              {receipt.total_sessions ?? "—"}
            </strong>
          </p>
        ) : null}
        <p>
          Paiement enregistre le :{" "}
          <strong className="text-white">{formatDate(receipt.paid_at)}</strong>
        </p>
        <p className="sm:col-span-2">
          Abonnement du :{" "}
          <strong className="text-white">
            {formatDate(receipt.starts_on)} au {formatDate(receipt.ends_on)}
          </strong>
        </p>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500">
        Ces dates indiquent le debut et la fin de l&apos;abonnement. Elles ne
        correspondent pas aux entrees dans la salle.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => window.print()}
      >
        Imprimer le reçu
      </Button>
    </div>
  );
}

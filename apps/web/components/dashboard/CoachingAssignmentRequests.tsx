"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Check,
  Clock3,
  Search,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, Card, Input, LoadingMessage, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { EmptyState, formatDate } from "./dashboard-shared";

type Coach = components["schemas"]["CoachDirectoryRead"];
type Assignment = components["schemas"]["CoachMemberAssignmentRead"];
type AssignmentRequest = components["schemas"]["CoachingAssignmentRequestRead"];

const textareaClass =
  "min-h-24 w-full resize-y rounded-sm border border-white/15 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function MemberCoachingAssignmentRequest({
  session,
  hasActiveCoaching,
  children,
}: {
  session: AuthSession;
  hasActiveCoaching: boolean;
  children?: ReactNode;
}) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [choiceMode, setChoiceMode] = useState<"self" | "staff">("self");
  const [preferredCoachId, setPreferredCoachId] = useState("");
  const [memberNote, setMemberNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const headers = authorizationHeaders(session.accessToken);

  const load = useCallback(async () => {
    setLoading(true);
    const requestHeaders = authorizationHeaders(session.accessToken);
    const [requestResult, assignmentResult, directoryResult] =
      await Promise.all([
        api.GET("/api/v1/coaching/assignment-requests", {
          headers: requestHeaders,
          params: {
            query: { request_status: undefined, limit: 50 },
          },
        }),
        api.GET("/api/v1/coaching/my-assignment", {
          headers: requestHeaders,
        }),
        hasActiveCoaching
          ? api.GET("/api/v1/coaching/directory", {
              headers: requestHeaders,
            })
          : Promise.resolve({ data: [] as Coach[], error: undefined }),
      ]);
    const loadedCoaches = directoryResult.data ?? [];
    setRequests(requestResult.data ?? []);
    setAssignment(assignmentResult.data ?? null);
    setCoaches(loadedCoaches);
    setPreferredCoachId((current) => current || loadedCoaches[0]?.id || "");
    setFeedback(
      requestResult.error || assignmentResult.error || directoryResult.error
        ? "Le dossier d'affectation coaching n'a pas pu etre charge."
        : null,
    );
    setLoading(false);
  }, [hasActiveCoaching, session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const pendingRequest = requests.find((item) => item.status === "pending");
  const lastDecision = requests.find((item) => item.status !== "pending");

  async function submitRequest() {
    if (
      !hasActiveCoaching ||
      pendingRequest ||
      assignment ||
      (choiceMode === "self" && !preferredCoachId)
    ) {
      return;
    }
    setBusy(true);
    setFeedback(null);
    const result = await api.POST("/api/v1/coaching/assignment-requests", {
      headers,
      body: {
        preferred_coach_id:
          choiceMode === "self" ? preferredCoachId : undefined,
        member_note: memberNote.trim() || undefined,
      },
    });
    setBusy(false);
    if (!result.data) {
      setFeedback(
        errorMessage(
          result.error,
          "Votre demande de coach n'a pas pu etre envoyee.",
        ),
      );
      return;
    }
    setMemberNote("");
    await load();
    setFeedback("Votre demande a ete envoyee a l'equipe Masterz.");
  }

  if (loading) {
    return (
      <LoadingMessage message="Chargement de votre affectation coaching..." />
    );
  }

  if (assignment) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-emerald-300/25 bg-emerald-300/[0.06]">
          <div className="grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-300 text-black">
              <UserRoundCheck className="h-6 w-6" />
            </span>
            <div>
              <Pill>Coach confirme</Pill>
              <h3 className="mt-3 text-2xl font-black text-white">
                {assignment.coach_name}
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Affectation active depuis le {formatDate(assignment.started_at)}
                .
              </p>
            </div>
            <span className="text-xs font-black uppercase tracking-[0.1em] text-emerald-200">
              Planning disponible
            </span>
          </div>
        </Card>
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      {!hasActiveCoaching ? (
        <Alert
          type="warning"
          title="Abonnement Coaching requis"
          message="La demande de coach sera disponible apres l'activation d'une formule Coaching par la Reception ou l'Administration."
        />
      ) : null}

      {pendingRequest ? (
        <Card className="border-primary/30 bg-primary/[0.06] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Clock3 className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-[0.12em]">
                  Demande en attente
                </span>
              </div>
              <h3 className="mt-4 text-xl font-black text-white">
                {pendingRequest.preferred_coach_name
                  ? `Coach souhaite : ${pendingRequest.preferred_coach_name}`
                  : "L'equipe choisira le coach adapte"}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Envoyee le {formatDate(pendingRequest.created_at)}. Admin ou
                Reception va confirmer l&apos;affectation.
              </p>
            </div>
            <Pill>En attente</Pill>
          </div>
        </Card>
      ) : null}

      {!pendingRequest && hasActiveCoaching ? (
        <Card className="p-5 sm:p-6">
          {lastDecision?.status === "rejected" ? (
            <Alert
              type="warning"
              className="mb-5"
              title="Derniere demande refusee"
              message={
                lastDecision.decision_note ||
                "Vous pouvez choisir un autre coach ou demander l'aide de la Reception."
              }
            />
          ) : null}
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
              Premiere affectation
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">
              Comment voulez-vous choisir votre coach ?
            </h3>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ChoiceButton
              active={choiceMode === "self"}
              icon={UsersRound}
              title="Je choisis mon coach"
              text="Consultez la liste et indiquez votre preference."
              onClick={() => setChoiceMode("self")}
            />
            <ChoiceButton
              active={choiceMode === "staff"}
              icon={Sparkles}
              title="L'equipe choisit pour moi"
              text="La Reception choisira selon le profil et la disponibilite."
              onClick={() => setChoiceMode("staff")}
            />
          </div>

          {choiceMode === "self" ? (
            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-gray-400">
                Coach souhaite
              </p>
              <div className="mt-3 grid max-h-72 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {coaches.length ? (
                  coaches.map((coach) => (
                    <button
                      type="button"
                      key={coach.id}
                      aria-pressed={preferredCoachId === coach.id}
                      onClick={() => setPreferredCoachId(coach.id)}
                      className={`rounded-sm border p-4 text-left transition ${
                        preferredCoachId === coach.id
                          ? "border-primary bg-primary/10"
                          : "border-white/10 bg-black/25 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-white">
                            {coach.full_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {coach.active_member_count} client(s) suivi(s)
                          </p>
                        </div>
                        {preferredCoachId === coach.id ? (
                          <Check className="h-5 w-5 text-primary" />
                        ) : null}
                      </div>
                    </button>
                  ))
                ) : (
                  <EmptyState text="Aucun coach disponible actuellement." />
                )}
              </div>
            </div>
          ) : null}

          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-gray-400">
              Message optionnel
            </span>
            <textarea
              aria-label="Message pour la demande de coach"
              className={textareaClass}
              value={memberNote}
              onChange={(event) => setMemberNote(event.target.value)}
              placeholder="Objectif, disponibilites ou preference particuliere..."
            />
          </label>

          <Button
            className="mt-5 w-full sm:w-auto"
            onClick={submitRequest}
            disabled={
              busy ||
              (choiceMode === "self" && (!preferredCoachId || !coaches.length))
            }
          >
            <UserRoundCheck className="h-4 w-4" />
            {busy ? "Envoi..." : "Envoyer ma demande"}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

export function StaffCoachingAssignmentRequests({
  session,
}: {
  session: AuthSession;
}) {
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [query, setQuery] = useState("");
  const [decisionNote, setDecisionNote] = useState(
    "Demande confirmee avec le membre",
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const headers = authorizationHeaders(session.accessToken);

  const load = useCallback(async () => {
    setLoading(true);
    const requestHeaders = authorizationHeaders(session.accessToken);
    const [requestResult, coachResult] = await Promise.all([
      api.GET("/api/v1/coaching/assignment-requests", {
        headers: requestHeaders,
        params: { query: { request_status: "pending", limit: 200 } },
      }),
      api.GET("/api/v1/coaching/directory", { headers: requestHeaders }),
    ]);
    const loadedRequests = requestResult.data ?? [];
    const loadedCoaches = coachResult.data ?? [];
    setRequests(loadedRequests);
    setCoaches(loadedCoaches);
    setSelectedRequestId((current) =>
      loadedRequests.some((item) => item.id === current)
        ? current
        : loadedRequests[0]?.id || "",
    );
    const firstRequest = loadedRequests[0];
    setSelectedCoachId((current) =>
      loadedCoaches.some((coach) => coach.id === current)
        ? current
        : firstRequest?.preferred_coach_id || loadedCoaches[0]?.id || "",
    );
    setFeedback(
      requestResult.error || coachResult.error
        ? "Les demandes de coach n'ont pas pu etre chargees."
        : null,
    );
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const visibleRequests = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return requests;
    return requests.filter((item) =>
      `${item.member_name} ${item.member_number} ${item.preferred_coach_name ?? ""}`
        .toLocaleLowerCase()
        .includes(normalized),
    );
  }, [query, requests]);
  const selectedRequest = requests.find(
    (item) => item.id === selectedRequestId,
  );

  function selectRequest(request: AssignmentRequest) {
    setSelectedRequestId(request.id);
    setSelectedCoachId(request.preferred_coach_id || coaches[0]?.id || "");
    setDecisionNote("Demande confirmee avec le membre");
    setFeedback(null);
  }

  async function decide(status: "approved" | "rejected") {
    if (
      !selectedRequest ||
      (status === "approved" && !selectedCoachId) ||
      (status === "rejected" && decisionNote.trim().length < 3)
    ) {
      return;
    }
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH(
      "/api/v1/coaching/assignment-requests/{request_id}/decision",
      {
        headers,
        params: { path: { request_id: selectedRequest.id } },
        body: {
          status,
          coach_id: status === "approved" ? selectedCoachId : undefined,
          decision_note: decisionNote.trim() || undefined,
        },
      },
    );
    setBusy(false);
    if (!result.data) {
      setFeedback(
        errorMessage(result.error, "La demande n'a pas pu etre traitee."),
      );
      return;
    }
    await load();
    setFeedback(
      status === "approved"
        ? "Le coach est affecte et le membre a recu une notification."
        : "La demande a ete refusee avec son motif.",
    );
  }

  if (loading) {
    return <LoadingMessage message="Chargement des demandes de coach..." />;
  }

  return (
    <div className="space-y-5">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <Clock3 className="h-6 w-6 text-primary" />
          <p className="mt-4 text-3xl font-black text-white">
            {requests.length}
          </p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.1em] text-gray-500">
            Demandes en attente
          </p>
        </Card>
        <Card className="p-5">
          <UsersRound className="h-6 w-6 text-primary" />
          <p className="mt-4 text-3xl font-black text-white">
            {coaches.length}
          </p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.1em] text-gray-500">
            Coachs disponibles
          </p>
        </Card>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
        <Card className="p-5">
          <h3 className="text-xl font-black text-white">File des demandes</h3>
          <p className="mt-1 text-sm text-gray-500">
            Les demandes les plus recentes apparaissent en premier.
          </p>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              aria-label="Rechercher une demande de coach"
              className="pl-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Membre, numero ou coach"
            />
          </div>
          <div className="mt-4 max-h-[56vh] space-y-2 overflow-y-auto pr-1">
            {visibleRequests.length ? (
              visibleRequests.map((request) => (
                <button
                  type="button"
                  key={request.id}
                  onClick={() => selectRequest(request)}
                  className={`w-full rounded-sm border p-4 text-left transition ${
                    selectedRequestId === request.id
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-black/25 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">
                        {request.member_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {request.member_number}
                      </p>
                    </div>
                    <Pill>En attente</Pill>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    {request.preferred_coach_name
                      ? `Souhaite ${request.preferred_coach_name}`
                      : "Demande un choix de l'equipe"}
                  </p>
                </button>
              ))
            ) : (
              <EmptyState text="Aucune demande de coach en attente." />
            )}
          </div>
        </Card>

        {selectedRequest ? (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
                  Dossier d&apos;affectation
                </p>
                <h3 className="mt-2 text-2xl font-black text-white">
                  {selectedRequest.member_name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedRequest.member_number} · Demande du{" "}
                  {formatDate(selectedRequest.created_at)}
                </p>
              </div>
              <Pill>Abonnement Coaching verifie</Pill>
            </div>

            <div className="mt-5 rounded-sm border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-gray-500">
                Choix du membre
              </p>
              <p className="mt-2 font-bold text-white">
                {selectedRequest.preferred_coach_name ||
                  "L'equipe Masterz choisit le coach"}
              </p>
              {selectedRequest.member_note ? (
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {selectedRequest.member_note}
                </p>
              ) : null}
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-gray-400">
                Coach a affecter
              </span>
              <select
                aria-label="Coach a affecter a la demande"
                value={selectedCoachId}
                onChange={(event) => setSelectedCoachId(event.target.value)}
                className="h-12 w-full rounded-sm border border-white/15 bg-black/35 px-4 text-sm font-bold text-white outline-none focus:border-primary"
              >
                <option value="">Choisir un coach</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.full_name} · {coach.active_member_count} client(s)
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-gray-400">
                Note de decision
              </span>
              <textarea
                aria-label="Note de decision de la demande"
                className={textareaClass}
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
              />
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => void decide("approved")}
                disabled={busy || !selectedCoachId}
              >
                <Check className="h-4 w-4" />
                Confirmer l&apos;affectation
              </Button>
              <Button
                variant="outline"
                onClick={() => void decide("rejected")}
                disabled={busy || decisionNote.trim().length < 3}
              >
                <X className="h-4 w-4" /> Refuser la demande
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8">
            <EmptyState text="Choisissez une demande pour la traiter." />
          </Card>
        )}
      </div>
    </div>
  );
}

function ChoiceButton({
  active,
  icon: Icon,
  title,
  text,
  onClick,
}: {
  active: boolean;
  icon: typeof UsersRound;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-sm border p-5 text-left transition ${
        active
          ? "border-primary bg-primary/10"
          : "border-white/10 bg-black/25 hover:border-primary/40"
      }`}
    >
      <Icon className="h-6 w-6 text-primary" />
      <strong className="mt-4 block text-white">{title}</strong>
      <span className="mt-1 block text-sm leading-6 text-gray-500">{text}</span>
    </button>
  );
}

function errorMessage(error: unknown, fallback: string) {
  return (
    (error as { detail?: { message?: string } } | undefined)?.detail?.message ??
    fallback
  );
}

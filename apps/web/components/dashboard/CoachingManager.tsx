"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Dumbbell,
  Eye,
  Search,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { Alert, Button, Card, Input, LoadingMessage, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import {
  type CoachSummary,
  type CoachingAssignment,
  type MemberSubscriptionSummary,
  EmptyState,
  Field,
  Stat,
  formatDate,
  statusLabels,
} from "./dashboard-shared";
import { CoachingTrackingPanel } from "./CoachingTrackingPanel";

export function CoachingManager({ session }: { session: AuthSession }) {
  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [assignments, setAssignments] = useState<CoachingAssignment[]>([]);
  const [members, setMembers] = useState<MemberSubscriptionSummary[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [trackingMemberId, setTrackingMemberId] = useState("");
  const [coachQuery, setCoachQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [reason, setReason] = useState("Choix confirme avec le membre");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const headers = authorizationHeaders(session.accessToken);

  const load = useCallback(async () => {
    setLoading(true);
    const requestHeaders = authorizationHeaders(session.accessToken);
    const [coachResult, assignmentResult, memberResult] = await Promise.all([
      api.GET("/api/v1/coaching/coaches", { headers: requestHeaders }),
      api.GET("/api/v1/coaching/assignments", {
        headers: requestHeaders,
        params: {
          query: {
            active_only: true,
            coach_id: undefined,
            member_id: undefined,
          },
        },
      }),
      api.GET("/api/v1/members/subscription-summaries", {
        headers: requestHeaders,
        params: { query: { query: undefined, limit: 500 } },
      }),
    ]);
    const loadedCoaches = coachResult.data ?? [];
    setCoaches(loadedCoaches);
    setAssignments(assignmentResult.data ?? []);
    setMembers(memberResult.data ?? []);
    setSelectedCoachId((current) => current || loadedCoaches[0]?.id || "");
    setFeedback(
      coachResult.error || assignmentResult.error || memberResult.error
        ? "Impossible de charger toutes les donnees du coaching."
        : null,
    );
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const selectedCoach = coaches.find((coach) => coach.id === selectedCoachId);
  const selectedCoachAssignments = assignments.filter(
    (assignment) => assignment.coach_id === selectedCoachId,
  );
  const assignmentByMember = useMemo(
    () =>
      new Map(
        assignments.map((assignment) => [assignment.member_id, assignment]),
      ),
    [assignments],
  );
  const visibleCoaches = coaches.filter((coach) =>
    `${coach.full_name} ${coach.phone}`
      .toLocaleLowerCase()
      .includes(coachQuery.trim().toLocaleLowerCase()),
  );
  const coachingMembers = members.filter(
    (member) => member.has_active_coaching,
  );
  const visibleMembers = coachingMembers
    .filter((member) =>
      `${member.full_name} ${member.phone} ${member.member_number}`
        .toLocaleLowerCase()
        .includes(memberQuery.trim().toLocaleLowerCase()),
    )
    .sort((first, second) =>
      first.full_name.localeCompare(second.full_name, "fr", {
        sensitivity: "base",
      }),
    );
  const selectedMemberAssignment = assignmentByMember.get(selectedMemberId);
  const unassignedCount = coachingMembers.filter(
    (member) => !assignmentByMember.has(member.id),
  ).length;

  async function assignMember() {
    if (!selectedCoachId || !selectedMemberId || reason.trim().length < 3) {
      return;
    }
    setBusy(true);
    setFeedback(null);
    const changingCoach = Boolean(
      selectedMemberAssignment &&
      selectedMemberAssignment.coach_id !== selectedCoachId,
    );
    const result = await api.POST("/api/v1/coaching/assignments", {
      headers,
      body: {
        coach_id: selectedCoachId,
        member_id: selectedMemberId,
        reason,
      },
    });
    setBusy(false);
    if (!result.data) {
      setFeedback("L'affectation n'a pas pu etre enregistree.");
      return;
    }
    setSelectedMemberId("");
    await load();
    setFeedback(
      changingCoach
        ? "Le coach du membre a ete change."
        : "Le membre a ete affecte au coach.",
    );
  }

  async function endAssignment(assignment: CoachingAssignment) {
    if (reason.trim().length < 3) return;
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH(
      "/api/v1/coaching/assignments/{assignment_id}/end",
      {
        headers,
        params: { path: { assignment_id: assignment.id } },
        body: { reason },
      },
    );
    setBusy(false);
    if (!result.data) {
      setFeedback("Le membre n'a pas pu etre retire du suivi.");
      return;
    }
    await load();
    setFeedback("Le membre a ete retire du suivi de ce coach.");
  }

  if (loading) return <LoadingMessage message="Chargement du coaching..." />;

  return (
    <div className="space-y-6">
      {feedback ? <Alert type="info" message={feedback} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Dumbbell} value={coaches.length} label="Coachs" />
        <Stat
          icon={UsersRound}
          value={assignments.length}
          label="Clients affectes"
        />
        <Stat icon={UserPlus} value={unassignedCount} label="Sans coach" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-black uppercase text-white">
                Liste des coachs
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Choisissez un coach pour ouvrir son dossier.
              </p>
            </div>
            <Link
              href="/espace/admin/utilisateurs"
              className="text-xs font-black uppercase tracking-[0.08em] text-primary hover:text-white"
            >
              Creer un compte coach
            </Link>
          </div>
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              aria-label="Rechercher un coach"
              className="pl-11"
              value={coachQuery}
              onChange={(event) => setCoachQuery(event.target.value)}
              placeholder="Nom ou telephone"
            />
          </div>
          <div className="mt-4 space-y-2">
            {visibleCoaches.length ? (
              visibleCoaches.map((coach) => (
                <button
                  type="button"
                  key={coach.id}
                  onClick={() => {
                    setSelectedCoachId(coach.id);
                    setSelectedMemberId("");
                    setTrackingMemberId("");
                  }}
                  className={`w-full rounded-sm border p-4 text-left transition ${
                    coach.id === selectedCoachId
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-black/20 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-white">
                        {coach.full_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {coach.phone}
                      </p>
                    </div>
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">
                      {coach.active_member_count} client(s)
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState text="Aucun coach trouve." />
            )}
          </div>
        </Card>

        {selectedCoach ? (
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Pill>Dossier coach</Pill>
                  <h2 className="mt-4 text-2xl font-black text-white">
                    {selectedCoach.full_name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedCoach.phone}
                    {selectedCoach.email ? ` · ${selectedCoach.email}` : ""}
                  </p>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-black uppercase text-emerald-200">
                  {statusLabels[selectedCoach.status] ?? selectedCoach.status}
                </span>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-black uppercase text-white">
                Affecter un client
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Ghir les membres li 3andhom abonnement Coaching khdam kaybano
                hna. Une nouvelle affectation ferme automatiquement
                l&apos;ancienne.
              </p>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  aria-label="Rechercher un client coaching"
                  className="pl-11"
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Nom, telephone ou numero membre"
                />
              </div>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {visibleMembers.length ? (
                  visibleMembers.map((member) => {
                    const current = assignmentByMember.get(member.id);
                    return (
                      <button
                        type="button"
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-sm border p-3 text-left transition ${
                          selectedMemberId === member.id
                            ? "border-primary bg-primary/10"
                            : "border-white/10 bg-black/20 hover:border-primary/40"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold text-white">
                            {member.full_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {member.member_number}
                          </p>
                        </div>
                        <span className="text-right text-[11px] font-bold text-gray-400">
                          {current ? current.coach_name : "Sans coach"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <EmptyState text="Aucun membre avec un abonnement Coaching actif." />
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Field label="Motif">
                  <Input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </Field>
                <Button
                  onClick={assignMember}
                  disabled={
                    busy ||
                    !selectedMemberId ||
                    reason.trim().length < 3 ||
                    selectedMemberAssignment?.coach_id === selectedCoachId
                  }
                >
                  {selectedMemberAssignment ? (
                    <ArrowRightLeft className="h-4 w-4" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {selectedMemberAssignment
                    ? selectedMemberAssignment.coach_id === selectedCoachId
                      ? "Deja avec ce coach"
                      : "Changer vers ce coach"
                    : "Affecter a ce coach"}
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-black uppercase text-white">
                    Clients de ce coach
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedCoachAssignments.length} client(s) suivi(s)
                    actuellement.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {selectedCoachAssignments.length ? (
                  selectedCoachAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-4 rounded-sm border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-bold text-white">
                          {assignment.member_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {assignment.member_number} · Depuis le{" "}
                          {formatDate(assignment.started_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() =>
                            setTrackingMemberId(assignment.member_id)
                          }
                        >
                          <Eye className="h-4 w-4" /> Voir la progression
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => endAssignment(assignment)}
                          disabled={busy || reason.trim().length < 3}
                        >
                          <UserMinus className="h-4 w-4" /> Retirer du suivi
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="Aucun client affecte a ce coach." />
                )}
              </div>
            </Card>

            {trackingMemberId ? (
              <CoachingTrackingPanel
                key={trackingMemberId}
                session={session}
                memberId={trackingMemberId}
              />
            ) : null}
          </div>
        ) : (
          <EmptyState text="Creez ou choisissez un coach pour ouvrir son dossier." />
        )}
      </div>
    </div>
  );
}

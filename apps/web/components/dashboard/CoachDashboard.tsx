"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Target, UsersRound } from "lucide-react";
import { Alert, Card, Input, LoadingMessage, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { CoachingTrackingPanel } from "./CoachingTrackingPanel";
import {
  type CoachingAssignment,
  EmptyState,
  Panel,
  Stat,
  formatDate,
} from "./dashboard-shared";

export function CoachDashboard({ session }: { session: AuthSession }) {
  const [assignments, setAssignments] = useState<CoachingAssignment[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/coaching/my-members", {
      headers: authorizationHeaders(session.accessToken),
    });
    const loaded = result.data ?? [];
    setAssignments(loaded);
    setSelectedMemberId((current) =>
      loaded.some((item) => item.member_id === current)
        ? current
        : (loaded[0]?.member_id ?? ""),
    );
    setError(
      result.error ? "La liste de vos clients n'a pas pu etre chargee." : null,
    );
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const visibleAssignments = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return assignments.filter((assignment) =>
      `${assignment.member_name} ${assignment.member_number}`
        .toLocaleLowerCase()
        .includes(normalized),
    );
  }, [assignments, query]);

  if (loading) return <LoadingMessage message="Chargement de vos clients..." />;

  return (
    <div className="mt-8 space-y-6">
      {error ? <Alert type="error" message={error} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          icon={UsersRound}
          value={assignments.length}
          label="Clients suivis"
        />
        <Stat icon={Target} value="5" label="Tests disponibles" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.65fr)_minmax(0,1.35fr)]">
        <Panel
          title="Mes clients"
          subtitle="Choisissez un client pour saisir son objectif et ses tests."
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              aria-label="Rechercher un client"
              className="pl-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom ou numero membre"
            />
          </div>
          <div className="mt-4 space-y-2">
            {visibleAssignments.length ? (
              visibleAssignments.map((assignment) => (
                <button
                  type="button"
                  key={assignment.id}
                  onClick={() => setSelectedMemberId(assignment.member_id)}
                  className={`w-full rounded-sm border p-4 text-left transition ${
                    selectedMemberId === assignment.member_id
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-black/20 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">
                        {assignment.member_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {assignment.member_number}
                      </p>
                    </div>
                    <Pill>Actif</Pill>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Suivi depuis le {formatDate(assignment.started_at)}
                  </p>
                </button>
              ))
            ) : (
              <EmptyState text="Aucun client coaching affecte a votre compte." />
            )}
          </div>
        </Panel>

        <div>
          {selectedMemberId ? (
            <CoachingTrackingPanel
              key={selectedMemberId}
              session={session}
              memberId={selectedMemberId}
              editable
            />
          ) : (
            <Card className="p-8">
              <EmptyState text="Choisissez un client pour ouvrir son suivi." />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

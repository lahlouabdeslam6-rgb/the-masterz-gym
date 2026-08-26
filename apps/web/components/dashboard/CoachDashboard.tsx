"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarDays,
  LayoutDashboard,
  Search,
  Target,
  UsersRound,
} from "lucide-react";
import { Alert, Card, Input, LoadingMessage, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import {
  type NavigationBadgeKey,
  useNavigationBadges,
} from "@/lib/navigation-badges";
import { CoachingTrackingPanel } from "./CoachingTrackingPanel";
import { CoachingScheduleManager } from "./CoachingScheduleManager";
import { MemberNotifications } from "./MemberNotifications";
import {
  type CoachingAssignment,
  EmptyState,
  Panel,
  Stat,
  formatDate,
} from "./dashboard-shared";

type CoachSection = "overview" | "notifications" | "schedule" | "clients";

const coachSections: Array<{
  id: CoachSection;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    description: "Resume de votre activite",
    icon: LayoutDashboard,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Nouveaux clients et reservations",
    icon: Bell,
  },
  {
    id: "schedule",
    label: "Mon planning",
    description: "Horaires et reservations",
    icon: CalendarDays,
  },
  {
    id: "clients",
    label: "Mes clients",
    description: "Objectifs, tests et progression",
    icon: UsersRound,
  },
];

const coachBadgeKeys: Partial<Record<CoachSection, NavigationBadgeKey>> = {
  notifications: "notifications",
  schedule: "schedule",
  clients: "clients",
};

export function CoachDashboard({ session }: { session: AuthSession }) {
  const [activeSection, setActiveSection] = useState<CoachSection>("overview");
  const [assignments, setAssignments] = useState<CoachingAssignment[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { badges, clearBadge } = useNavigationBadges(session, activeSection);
  const openSection = (nextSection: CoachSection) => {
    const badgeKey = coachBadgeKeys[nextSection];
    if (badgeKey) clearBadge(badgeKey);
    setActiveSection(nextSection);
  };

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

  const section =
    coachSections.find((item) => item.id === activeSection) ?? coachSections[0];
  const SectionIcon = section.icon;

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-lg border border-white/10 bg-[#081119]/95 shadow-2xl lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="border-b border-white/10 bg-primary/[0.07] p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-primary text-black">
            <Target className="h-5 w-5" />
          </span>
          <p className="mt-4 font-black uppercase text-white">
            {session.user.full_name}
          </p>
          <p className="mt-1 text-xs text-gray-500">Espace coach Masterz</p>
        </div>

        <nav
          aria-label="Navigation espace coach"
          className="hidden space-y-1 p-3 lg:block"
        >
          {coachSections.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badgeKey = coachBadgeKeys[item.id];
            const badgeCount = badgeKey ? badges[badgeKey] : undefined;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-sm border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-primary/35 bg-primary/[0.1] text-white"
                    : "border-transparent text-gray-500 hover:bg-white/[0.04] hover:text-white"
                }`}
                onClick={() => openSection(item.id)}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-primary" : "text-gray-600"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.65rem] text-gray-600">
                    {item.description}
                  </span>
                </span>
                {badgeCount ? (
                  <span
                    data-testid={`navigation-badge-${item.id}`}
                    className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[0.65rem] font-black text-black"
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <label className="block p-4 lg:hidden">
          <span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.14em] text-gray-500">
            Choisir une rubrique
          </span>
          <select
            aria-label="Rubrique espace coach"
            value={activeSection}
            onChange={(event) =>
              openSection(event.target.value as CoachSection)
            }
            className="h-12 w-full rounded-sm border border-white/15 bg-[#050a0f] px-3 text-sm font-bold text-white outline-none focus:border-primary"
          >
            {coachSections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {coachBadgeKeys[item.id] && badges[coachBadgeKeys[item.id]!]
                  ? ` (${badges[coachBadgeKeys[item.id]!]})`
                  : ""}
              </option>
            ))}
          </select>
        </label>
      </aside>

      <main className="min-w-0">
        <header className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(0,212,255,0.12),rgba(8,17,25,0.92)_48%)] p-5 shadow-2xl sm:p-7">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/[0.1] text-primary">
              <SectionIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-primary">
                Espace coach
              </p>
              <h2 className="mt-1 font-display text-3xl font-black uppercase tracking-[-0.035em] text-white">
                {section.label}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {section.description}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-6">
          {error ? (
            <Alert type="error" message={error} className="mb-6" />
          ) : null}

          {activeSection === "overview" ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Stat
                  icon={UsersRound}
                  value={assignments.length}
                  label="Clients suivis"
                />
                <Stat icon={Target} value="5" label="Tests disponibles" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => openSection("schedule")}
                  className="group rounded-lg border border-white/10 bg-[#081119] p-6 text-left transition hover:border-primary/40 hover:bg-primary/[0.04]"
                >
                  <CalendarDays className="h-7 w-7 text-primary" />
                  <strong className="mt-5 block text-xl text-white group-hover:text-primary">
                    Ouvrir mon planning
                  </strong>
                  <span className="mt-2 block text-sm leading-6 text-gray-500">
                    Ajoutez vos horaires et traitez les reservations sans
                    melanger le suivi des clients.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => openSection("clients")}
                  className="group rounded-lg border border-white/10 bg-[#081119] p-6 text-left transition hover:border-primary/40 hover:bg-primary/[0.04]"
                >
                  <UsersRound className="h-7 w-7 text-primary" />
                  <strong className="mt-5 block text-xl text-white group-hover:text-primary">
                    Ouvrir mes clients
                  </strong>
                  <span className="mt-2 block text-sm leading-6 text-gray-500">
                    Retrouvez les objectifs, les tests et la progression dans un
                    dossier separe.
                  </span>
                </button>
              </div>
            </div>
          ) : null}

          {activeSection === "notifications" ? (
            <Panel
              title="Mes notifications"
              subtitle="Retrouvez les nouveaux clients et les reservations qui demandent votre attention."
            >
              <MemberNotifications session={session} />
            </Panel>
          ) : null}

          {activeSection === "schedule" ? (
            <Panel
              title="Planning des seances"
              subtitle="Ajoutez vos disponibilites, suivez les demandes de vos clients et confirmez chaque seance."
            >
              <CoachingScheduleManager session={session} mode="coach" />
            </Panel>
          ) : null}

          {activeSection === "clients" ? (
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
                <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                  {visibleAssignments.length ? (
                    visibleAssignments.map((assignment) => (
                      <button
                        type="button"
                        key={assignment.id}
                        onClick={() =>
                          setSelectedMemberId(assignment.member_id)
                        }
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

              <div className="min-w-0">
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
          ) : null}
        </div>
      </main>
    </div>
  );
}

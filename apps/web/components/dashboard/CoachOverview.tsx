"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  MessageCircleMore,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, LoadingMessage } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { SALLE_2_ID, ClubBadge } from "./ClubSwitcher";
import type { CoachingAssignment } from "./dashboard-shared";
import {
  ActivityChart,
  activityDays,
  dayKey,
  OverviewAction,
  OverviewGuide,
  OverviewHeading,
  OverviewMetric,
  overviewSurface,
} from "./OverviewKit";

type Booking = components["schemas"]["CoachingBookingRead"];
type ClassSession = components["schemas"]["CollectiveClassSessionRead"];

export function CoachOverview({
  session,
  assignments,
  onNavigate,
}: {
  session: AuthSession;
  assignments: CoachingAssignment[];
  onNavigate: (
    section: "schedule" | "clients" | "collective" | "messages",
  ) => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [hasCollectiveAccess, setHasCollectiveAccess] = useState(false);
  const [reference, setReference] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const headers = authorizationHeaders(session.accessToken);
    const until = new Date(now.getTime() + 8 * 86400000).toISOString();
    try {
      const [bookingResult, accessResult] = await Promise.all([
        api.GET("/api/v1/coaching/bookings", {
          headers,
          params: {
            query: {
              coach_id: session.user.id,
              from_at: now.toISOString(),
              to_at: until,
              limit: 500,
            },
          },
        }),
        api.GET("/api/v1/clubs/my-access", { headers }),
      ]);
      const allowed = Boolean(
        accessResult.data?.clubs?.some((club) => club.id === SALLE_2_ID),
      );
      const classResult = allowed
        ? await api.GET("/api/v1/collective-classes/sessions", {
            headers,
            params: {
              query: {
                club_id: SALLE_2_ID,
                coach_id: session.user.id,
                from_at: now.toISOString(),
                to_at: until,
                include_history: false,
              },
            },
          })
        : null;
      if (bookingResult.error || accessResult.error || classResult?.error)
        throw new Error("overview");
      setBookings(
        Array.isArray(bookingResult.data)
          ? bookingResult.data.filter(
              (item) => item.coach_id === session.user.id,
            )
          : [],
      );
      setClasses(
        Array.isArray(classResult?.data)
          ? classResult.data.filter((item) => item.coach_id === session.user.id)
          : [],
      );
      setHasCollectiveAccess(allowed);
      setReference(now);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [session.accessToken, session.user.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const lastDay = new Date(`${dayKey(reference)}T12:00:00Z`);
  lastDay.setUTCDate(lastDay.getUTCDate() + 6);
  const isUpcoming = (startsAt: string) =>
    new Date(startsAt) >= reference && dayKey(startsAt) <= dayKey(lastDay);
  const weekBookings = bookings.filter((item) => isUpcoming(item.starts_at));
  const confirmed = weekBookings.filter((item) => item.status === "confirmed");
  const pending = weekBookings.filter((item) => item.status === "requested");
  const plannedClasses = classes.filter(
    (item) => item.status === "scheduled" && isUpcoming(item.starts_at),
  );
  const upcoming = [
    ...confirmed.map((item) => ({
      id: item.id,
      title: item.member_name,
      detail: "Coaching individuel",
      clubId: item.club_id,
      start: item.starts_at,
      section: "schedule" as const,
    })),
    ...plannedClasses.map((item) => ({
      id: item.id,
      title: item.class_name,
      detail: `${item.confirmed_count} inscription(s) · ${item.waitlist_count} en attente`,
      clubId: item.club_id,
      start: item.starts_at,
      section: "collective" as const,
    })),
  ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <div className="space-y-6">
      <OverviewHeading
        eyebrow="Votre semaine de coaching"
        title="Le bon rythme pour accompagner."
        description="Vos clients, les demandes à confirmer et vos prochaines séances en un coup d’œil."
      >
        <Button onClick={() => onNavigate("schedule")}>
          <CalendarDays className="h-4 w-4" /> Ouvrir mon planning
        </Button>
      </OverviewHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        <OverviewAction
          icon={UsersRound}
          title="Ouvrir mes clients"
          description="Objectifs, bilans et progression individuelle."
          onClick={() => onNavigate("clients")}
        />
        <OverviewAction
          icon={MessageCircleMore}
          title="Échanger avec mes clients"
          description="Messages, photos et retours sur leurs séances."
          onClick={() => onNavigate("messages")}
        />
      </div>
      {loading ? (
        <LoadingMessage message="Chargement de votre semaine..." />
      ) : error ? (
        <div className="space-y-3">
          <Alert
            type="error"
            message="Le résumé du planning est indisponible. Vos espaces de travail restent accessibles."
          />
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" /> Réessayer
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewMetric
              icon={UsersRound}
              value={new Set(assignments.map((item) => item.member_id)).size}
              label="Clients suivis"
              detail="Dossiers qui vous sont attribués"
              onClick={() => onNavigate("clients")}
            />
            <OverviewMetric
              icon={ClipboardCheck}
              value={pending.length}
              label="Demandes à confirmer"
              detail="Coaching · 7 prochains jours"
              onClick={() => onNavigate("schedule")}
            />
            <OverviewMetric
              icon={CalendarCheck}
              value={confirmed.length}
              label="Séances confirmées"
              detail="Coaching · 7 prochains jours"
              onClick={() => onNavigate("schedule")}
            />
            <OverviewMetric
              icon={CalendarRange}
              value={plannedClasses.length}
              label="Cours collectifs"
              detail={
                hasCollectiveAccess
                  ? "Salle 2 · 7 prochains jours"
                  : "Salle 2 non attribuée à ce compte"
              }
              onClick={
                hasCollectiveAccess ? () => onNavigate("collective") : undefined
              }
            />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <ActivityChart
              title="Ma semaine en séances"
              description="Coaching confirmé + cours collectifs · 7 prochains jours"
              data={activityDays(
                upcoming.map((item) => item.start),
                reference,
                true,
              )}
              emptyText="Aucune séance planifiée sur cette période. Ouvrez votre planning pour préparer la suite."
            />
            <section className={overviewSurface}>
              <h3 className="text-lg font-semibold text-white">
                Prochains rendez-vous
              </h3>
              <p className="mt-1 text-xs leading-5 text-gray-400">
                Les trois prochaines séances de votre semaine.
              </p>
              <div className="mt-5 space-y-3">
                {upcoming.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.section)}
                    className="w-full rounded-xl border border-white/10 bg-white/[.02] p-3 text-left transition hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <time
                        dateTime={item.start}
                        className="text-xs font-medium text-primary"
                      >
                        {new Intl.DateTimeFormat("fr-FR", {
                          timeZone: "Africa/Casablanca",
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(item.start))}
                      </time>
                      <ClubBadge clubId={item.clubId} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{item.detail}</p>
                  </button>
                ))}
                {!upcoming.length ? (
                  <p className="rounded-xl bg-white/[.03] p-4 text-sm leading-6 text-gray-400">
                    Votre agenda est libre pour le moment.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
          {hasCollectiveAccess ? (
            <OverviewAction
              featured
              icon={CalendarRange}
              title="Gérer mes cours Salle 2"
              description="Publier un cours, consulter les participants et la liste d’attente."
              onClick={() => onNavigate("collective")}
            />
          ) : null}
          {bookings.length >= 500 ? (
            <p className="text-xs text-gray-400">
              Aperçu limité aux 500 réservations chargées. Consultez le planning
              pour le détail.
            </p>
          ) : null}
        </>
      )}
      <OverviewGuide
        steps={[
          {
            title: "Préparer le planning",
            text: "Ajoutez vos disponibilités et publiez vos cours dans les salles qui vous sont attribuées.",
          },
          {
            title: "Confirmer les demandes",
            text: "Vérifiez les horaires et les éventuels conflits avant de confirmer une séance de coaching.",
          },
          {
            title: "Accompagner le client",
            text: "Après la séance, mettez à jour son suivi et échangez avec lui depuis son dossier.",
          },
        ]}
      />
    </div>
  );
}

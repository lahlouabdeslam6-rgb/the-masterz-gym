"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
  History,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, Card, Input, LoadingMessage, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { notifyNavigationBadgesChanged } from "@/lib/navigation-badges";
import {
  EmptyState,
  DashboardTabs,
  Field,
  formatDate,
  selectClass,
  textareaClass,
} from "./dashboard-shared";

type Availability = components["schemas"]["CoachAvailabilityRead"];
type Booking = components["schemas"]["CoachingBookingRead"];
type BookingStatus = components["schemas"]["CoachingBookingStatus"];

type Mode = "coach" | "member" | "staff";

const statusLabels: Record<BookingStatus, string> = {
  requested: "En attente",
  confirmed: "Confirmee",
  cancelled: "Annulee",
  completed: "Terminee",
};

const statusClasses: Record<BookingStatus, string> = {
  requested: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  confirmed: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  cancelled: "border-red-300/25 bg-red-300/10 text-red-200",
  completed: "border-primary/25 bg-primary/10 text-primary",
};

type ConflictAction =
  | { kind: "status"; booking: Booking; status: BookingStatus }
  | {
      kind: "schedule";
      booking: Booking;
      availabilityId: string;
      startsAt: string;
    };

export function CoachingScheduleManager({
  session,
  mode,
}: {
  session: AuthSession;
  mode: Mode;
}) {
  const headers = useMemo(
    () => authorizationHeaders(session.accessToken),
    [session.accessToken],
  );
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceTime, setReferenceTime] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [conflict, setConflict] = useState<ConflictAction | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [availabilityDuration, setAvailabilityDuration] = useState("");
  const [sessionDuration, setSessionDuration] = useState("");
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [memberNotes, setMemberNotes] = useState<Record<string, string>>({});
  const [memberStarts, setMemberStarts] = useState<Record<string, string>>({});
  const [scheduleChoices, setScheduleChoices] = useState<
    Record<string, string>
  >({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>(
    "all",
  );
  const [coachScheduleView, setCoachScheduleView] = useState<
    "current" | "history"
  >("current");

  const load = useCallback(async () => {
    setReferenceTime(Date.now());
    const [availabilityResult, bookingResult] = await Promise.all([
      api.GET("/api/v1/coaching/availability", {
        headers,
        params: { query: { active_only: mode !== "coach" } },
      }),
      api.GET("/api/v1/coaching/bookings", {
        headers,
        params: { query: { limit: 300 } },
      }),
    ]);
    setAvailabilities(
      Array.isArray(availabilityResult.data) ? availabilityResult.data : [],
    );
    setBookings(Array.isArray(bookingResult.data) ? bookingResult.data : []);
    const error = availabilityResult.error ?? bookingResult.error;
    if (error) {
      setFeedback({
        type: "error",
        message: errorMessage(
          error,
          "Le planning coaching n'a pas pu etre charge.",
        ),
      });
    }
    setLoading(false);
  }, [headers, mode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const futureAvailabilities = useMemo(
    () =>
      availabilities.filter(
        (item) =>
          item.is_active && new Date(item.ends_at).getTime() > referenceTime,
      ),
    [availabilities, referenceTime],
  );

  const pastAvailabilities = useMemo(
    () =>
      availabilities
        .filter((item) => new Date(item.ends_at).getTime() <= referenceTime)
        .sort(
          (first, second) =>
            new Date(second.starts_at).getTime() -
            new Date(first.starts_at).getTime(),
        ),
    [availabilities, referenceTime],
  );

  const visibleBookings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "all" || booking.status === statusFilter;
      const matchesQuery =
        `${booking.member_name} ${booking.member_number} ${booking.coach_name}`
          .toLocaleLowerCase()
          .includes(normalized);
      const belongsToHistory =
        ["completed", "cancelled"].includes(booking.status) ||
        new Date(booking.ends_at).getTime() <= referenceTime;
      const matchesCoachView =
        mode !== "coach" ||
        (coachScheduleView === "history"
          ? belongsToHistory
          : !belongsToHistory);
      return matchesStatus && matchesQuery && matchesCoachView;
    });
  }, [bookings, coachScheduleView, mode, query, referenceTime, statusFilter]);

  function changeStartsAt(value: string) {
    setStartsAt(value);
    const start = new Date(value);
    const duration = Number(availabilityDuration);
    if (
      value &&
      !Number.isNaN(start.getTime()) &&
      Number.isFinite(duration) &&
      duration > 0
    ) {
      setEndsAt(toLocalDateTimeInput(start.getTime() + duration * 3_600_000));
    }
  }

  function changeAvailabilityDuration(value: string) {
    setAvailabilityDuration(value);
    const start = new Date(startsAt);
    const duration = Number(value);
    if (
      startsAt &&
      !Number.isNaN(start.getTime()) &&
      Number.isFinite(duration) &&
      duration > 0
    ) {
      setEndsAt(toLocalDateTimeInput(start.getTime() + duration * 3_600_000));
    } else {
      setEndsAt("");
    }
  }

  async function createAvailability() {
    const duration = Number(sessionDuration);
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (
      !startsAt ||
      !endsAt ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      !Number.isFinite(Number(availabilityDuration)) ||
      Number(availabilityDuration) <= 0 ||
      !Number.isInteger(duration)
    ) {
      setFeedback({
        type: "error",
        message: "Choisissez la plage et la duree de chaque seance.",
      });
      return;
    }
    if (end <= start) {
      setFeedback({
        type: "error",
        message: "L'heure de fin doit etre apres l'heure de debut.",
      });
      return;
    }
    if (start.getTime() <= Date.now()) {
      setFeedback({
        type: "error",
        message: "Le planning doit commencer dans le futur.",
      });
      return;
    }
    if (duration < 15 || duration > 240) {
      setFeedback({
        type: "error",
        message: "La duree d'une seance doit etre entre 15 et 240 minutes.",
      });
      return;
    }
    if (end.getTime() - start.getTime() < duration * 60_000) {
      setFeedback({
        type: "error",
        message: "La plage choisie doit contenir au moins une seance complete.",
      });
      return;
    }
    setBusy("availability-create");
    const result = await api.POST("/api/v1/coaching/availability", {
      headers,
      body: {
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        session_duration_minutes: duration,
        note: availabilityNote.trim() || null,
      },
    });
    setBusy(null);
    if (!result.data) {
      setFeedback({
        type: "error",
        message: errorMessage(
          result.error,
          "Le creneau n'a pas pu etre ajoute.",
        ),
      });
      return;
    }
    setStartsAt("");
    setEndsAt("");
    setAvailabilityDuration("");
    setSessionDuration("");
    setAvailabilityNote("");
    setFeedback({
      type: "success",
      message: "Disponibilite ajoutee au planning.",
    });
    await load();
    notifyNavigationBadgesChanged();
  }

  async function disableAvailability(availability: Availability) {
    setBusy(availability.id);
    const result = await api.PATCH(
      "/api/v1/coaching/availability/{availability_id}",
      {
        headers,
        params: { path: { availability_id: availability.id } },
        body: {
          starts_at: availability.starts_at,
          ends_at: availability.ends_at,
          session_duration_minutes: availability.session_duration_minutes,
          note: availability.note,
          is_active: false,
        },
      },
    );
    setBusy(null);
    if (!result.data) {
      setFeedback({
        type: "error",
        message: errorMessage(
          result.error,
          "La disponibilite n'a pas pu etre desactivee.",
        ),
      });
      return;
    }
    setFeedback({ type: "success", message: "Disponibilite desactivee." });
    await load();
  }

  async function reserve(availability: Availability, startsAt: string) {
    setBusy(availability.id);
    const result = await api.POST("/api/v1/coaching/bookings", {
      headers,
      body: {
        availability_id: availability.id,
        starts_at: startsAt,
        member_note: memberNotes[availability.id]?.trim() || null,
      },
    });
    setBusy(null);
    if (!result.data) {
      setFeedback({
        type: "error",
        message: errorMessage(
          result.error,
          "La reservation n'a pas pu etre envoyee.",
        ),
      });
      return;
    }
    setMemberNotes((current) => ({ ...current, [availability.id]: "" }));
    setMemberStarts((current) => ({ ...current, [availability.id]: "" }));
    setFeedback({
      type: "success",
      message: "Reservation envoyee. Votre coach doit maintenant la confirmer.",
    });
    await load();
    notifyNavigationBadgesChanged();
  }

  async function updateStatus(
    booking: Booking,
    status: BookingStatus,
    confirmOverlap = false,
  ) {
    setBusy(booking.id);
    const result = await api.PATCH(
      "/api/v1/coaching/bookings/{booking_id}/status",
      {
        headers,
        params: { path: { booking_id: booking.id } },
        body: {
          status,
          decision_note:
            status === "cancelled"
              ? "Reservation annulee depuis le planning"
              : "Mise a jour depuis le planning",
          confirm_overlap: confirmOverlap,
        },
      },
    );
    setBusy(null);
    if (!result.data) {
      if (errorCode(result.error) === "coaching_booking_overlap") {
        setConflict({ kind: "status", booking, status });
        return;
      }
      setFeedback({
        type: "error",
        message: errorMessage(
          result.error,
          "Le statut n'a pas pu etre modifie.",
        ),
      });
      return;
    }
    setConflict(null);
    setFeedback({
      type: "success",
      message: `Reservation: ${statusLabels[result.data.status]}.`,
    });
    await load();
    notifyNavigationBadgesChanged();
  }

  async function reschedule(
    booking: Booking,
    choice: string,
    confirmOverlap = false,
  ) {
    if (!choice) return;
    const [availabilityId, startsAt] = choice.split("::");
    if (!availabilityId || !startsAt) return;
    setBusy(`schedule-${booking.id}`);
    const result = await api.PATCH(
      "/api/v1/coaching/bookings/{booking_id}/schedule",
      {
        headers,
        params: { path: { booking_id: booking.id } },
        body: {
          availability_id: availabilityId,
          starts_at: startsAt,
          decision_note: "Horaire modifie depuis le planning",
          confirm_overlap: confirmOverlap,
        },
      },
    );
    setBusy(null);
    if (!result.data) {
      if (errorCode(result.error) === "coaching_booking_overlap") {
        setConflict({ kind: "schedule", booking, availabilityId, startsAt });
        return;
      }
      setFeedback({
        type: "error",
        message: errorMessage(
          result.error,
          "L'horaire n'a pas pu etre modifie.",
        ),
      });
      return;
    }
    setConflict(null);
    setScheduleChoices((current) => ({ ...current, [booking.id]: "" }));
    setFeedback({ type: "success", message: "Horaire de la seance modifie." });
    await load();
    notifyNavigationBadgesChanged();
  }

  async function confirmConflict() {
    if (!conflict) return;
    if (conflict.kind === "status") {
      await updateStatus(conflict.booking, conflict.status, true);
    } else {
      await reschedule(
        conflict.booking,
        `${conflict.availabilityId}::${conflict.startsAt}`,
        true,
      );
    }
  }

  if (loading) return <LoadingMessage message="Chargement du planning..." />;

  return (
    <div className="space-y-7">
      {feedback ? (
        <Alert type={feedback.type} message={feedback.message} />
      ) : null}

      {conflict ? (
        <Card className="border-amber-300/40 bg-amber-300/[0.06] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-amber-200" />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-white">
                Deux seances au meme moment
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Ce coach a deja une seance confirmee pendant cet horaire. Vous
                pouvez annuler cette confirmation ou maintenir les deux seances.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setConflict(null)}>
                  <X className="h-4 w-4" /> Annuler
                </Button>
                <Button onClick={() => void confirmConflict()}>
                  <AlertTriangle className="h-4 w-4" /> Confirmer quand meme
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {mode === "coach" ? (
        <DashboardTabs
          eyebrow="Organisation du planning"
          ariaLabel="Rubriques planning coach"
          activeTab={coachScheduleView}
          onChange={setCoachScheduleView}
          tabs={[
            {
              id: "current",
              label: "Planning actuel",
              icon: CalendarDays,
              badge: futureAvailabilities.length,
            },
            {
              id: "history",
              label: "Historique",
              icon: History,
              badge: pastAvailabilities.length,
            },
          ]}
        />
      ) : null}

      {mode === "coach" && coachScheduleView === "current" ? (
        <CoachAvailabilityEditor
          startsAt={startsAt}
          endsAt={endsAt}
          availabilityDuration={availabilityDuration}
          sessionDuration={sessionDuration}
          note={availabilityNote}
          busy={busy === "availability-create"}
          onStartsAt={changeStartsAt}
          onAvailabilityDuration={changeAvailabilityDuration}
          onSessionDuration={setSessionDuration}
          onNote={setAvailabilityNote}
          onCreate={() => void createAvailability()}
        />
      ) : null}

      {mode === "member" ? (
        <MemberAvailabilityList
          availabilities={futureAvailabilities}
          notes={memberNotes}
          selectedStarts={memberStarts}
          busy={busy}
          onNote={(id, value) =>
            setMemberNotes((current) => ({ ...current, [id]: value }))
          }
          onStart={(id, value) =>
            setMemberStarts((current) => ({ ...current, [id]: value }))
          }
          onReserve={(availability, slotStart) =>
            void reserve(availability, slotStart)
          }
        />
      ) : mode === "coach" && coachScheduleView === "history" ? (
        <CoachAvailabilityHistory
          availabilities={pastAvailabilities}
          bookings={bookings}
        />
      ) : (
        <AvailabilityOverview
          mode={mode}
          availabilities={
            mode === "coach" ? futureAvailabilities : availabilities
          }
          busy={busy}
          onDisable={(availability) => void disableAvailability(availability)}
        />
      )}

      {mode !== "coach" || coachScheduleView === "current" ? (
        <section>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
                Calendrier des seances
              </p>
              <h3 className="mt-2 text-2xl font-black text-white">
                {mode === "member"
                  ? "Mes reservations"
                  : "Reservations coaching"}
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                aria-label="Rechercher une reservation coaching"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Client, numero ou coach"
              />
              <select
                aria-label="Filtrer les reservations coaching"
                className={selectClass}
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | BookingStatus)
                }
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {visibleBookings.length ? (
              visibleBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  mode={mode}
                  availabilityChoices={futureAvailabilities.filter(
                    (item) => item.coach_id === booking.coach_id,
                  )}
                  scheduleChoice={scheduleChoices[booking.id] ?? ""}
                  simultaneousCount={simultaneousBookingCount(
                    booking,
                    bookings,
                  )}
                  busy={busy}
                  onScheduleChoice={(value) =>
                    setScheduleChoices((current) => ({
                      ...current,
                      [booking.id]: value,
                    }))
                  }
                  onStatus={(status) => void updateStatus(booking, status)}
                  onReschedule={(availabilityId) =>
                    void reschedule(booking, availabilityId)
                  }
                />
              ))
            ) : (
              <EmptyState text="Aucune reservation coaching dans cette liste." />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CoachAvailabilityEditor({
  startsAt,
  endsAt,
  availabilityDuration,
  sessionDuration,
  note,
  busy,
  onStartsAt,
  onAvailabilityDuration,
  onSessionDuration,
  onNote,
  onCreate,
}: {
  startsAt: string;
  endsAt: string;
  availabilityDuration: string;
  sessionDuration: string;
  note: string;
  busy: boolean;
  onStartsAt: (value: string) => void;
  onAvailabilityDuration: (value: string) => void;
  onSessionDuration: (value: string) => void;
  onNote: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
          <Plus className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-xl font-black text-white">
            Ajouter mes heures disponibles
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Le client verra uniquement les creneaux futurs que vous ajoutez ici.
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-sm border border-white/10 bg-black/15 p-4">
          <Field label="1. Date et heure de debut">
            <Input
              type="datetime-local"
              aria-label="Debut du creneau coaching"
              value={startsAt}
              onChange={(event) => onStartsAt(event.target.value)}
            />
          </Field>
        </div>
        <div className="rounded-sm border border-white/10 bg-black/15 p-4">
          <Field label="2. Duree totale de disponibilite">
            <div className="relative">
              <Input
                type="number"
                min={0.25}
                step={0.25}
                aria-label="Duree totale du planning coaching"
                className="pr-20"
                value={availabilityDuration}
                onChange={(event) => onAvailabilityDuration(event.target.value)}
                placeholder="Ex. 8"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                heures
              </span>
            </div>
          </Field>
        </div>
        <div className="rounded-sm border border-white/10 bg-black/15 p-4">
          <Field label="3. Duree de chaque seance">
            <div className="relative">
              <Input
                type="number"
                min={15}
                max={240}
                step={15}
                aria-label="Duree d'une seance coaching"
                className="pr-24"
                value={sessionDuration}
                onChange={(event) => onSessionDuration(event.target.value)}
                placeholder="Ex. 60"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                minutes
              </span>
            </div>
          </Field>
        </div>
        <div className="rounded-sm border border-primary/20 bg-primary/[0.04] p-4">
          <Field label="4. Fin calculee automatiquement">
            <div
              aria-label="Fin calculee du planning coaching"
              className="flex min-h-12 items-center rounded-sm border border-primary/20 bg-[#050a0f] px-4 text-sm font-bold text-white"
            >
              {endsAt
                ? formatCalculatedEnd(endsAt)
                : "Ajoutez le debut et la duree totale"}
            </div>
          </Field>
        </div>
      </div>
      <Field label="Note optionnelle">
        <textarea
          aria-label="Note du creneau coaching"
          className={`${textareaClass} mt-4 min-h-24`}
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Ex. seance force, suivi individuel..."
        />
      </Field>
      <Button className="mt-4" disabled={busy} onClick={onCreate}>
        <CalendarCheck className="h-4 w-4" /> Ajouter au planning
      </Button>
    </Card>
  );
}

function AvailabilityOverview({
  mode,
  availabilities,
  busy,
  onDisable,
}: {
  mode: Mode;
  availabilities: Availability[];
  busy: string | null;
  onDisable: (availability: Availability) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-black text-white">
          {mode === "coach"
            ? "Mes disponibilites"
            : "Disponibilites des coachs"}
        </h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {availabilities.length ? (
          availabilities.map((availability) => (
            <Card key={availability.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-white">
                    {formatSchedule(
                      availability.starts_at,
                      availability.ends_at,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {availability.coach_name}
                  </p>
                </div>
                <Pill>{availability.is_active ? "Ouvert" : "Ferme"}</Pill>
              </div>
              {availability.note ? (
                <p className="mt-3 text-sm text-gray-400">
                  {availability.note}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                <span>
                  {availability.session_duration_minutes} min / seance
                </span>
                <span>·</span>
                <span>{availability.requested_booking_count} en attente</span>
                <span>·</span>
                <span>{availability.confirmed_booking_count} confirmee(s)</span>
              </div>
              {mode === "coach" && availability.is_active ? (
                <Button
                  className="mt-4"
                  size="sm"
                  variant="outline"
                  disabled={busy === availability.id}
                  onClick={() => onDisable(availability)}
                >
                  <X className="h-4 w-4" /> Desactiver
                </Button>
              ) : null}
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState text="Aucune disponibilite ajoutee au planning." />
          </div>
        )}
      </div>
    </section>
  );
}

function CoachAvailabilityHistory({
  availabilities,
  bookings,
}: {
  availabilities: Availability[];
  bookings: Booking[];
}) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <History className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-xl font-black text-white">
            Historique du planning
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Les anciennes plages et les clients recus restent classes ici.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {availabilities.length ? (
          availabilities.map((availability) => {
            const relatedBookings = bookings
              .filter(
                (booking) =>
                  booking.availability_id === availability.id &&
                  booking.status !== "cancelled",
              )
              .sort(
                (first, second) =>
                  new Date(first.starts_at).getTime() -
                  new Date(second.starts_at).getTime(),
              );
            return (
              <Card key={availability.id} className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-white">
                      {formatSchedule(
                        availability.starts_at,
                        availability.ends_at,
                      )}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      Seances de {availability.session_duration_minutes} minutes
                      {availability.note ? ` · ${availability.note}` : ""}
                    </p>
                  </div>
                  <Pill>
                    {relatedBookings.length} client(s) dans cette plage
                  </Pill>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {relatedBookings.length ? (
                    relatedBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between gap-4 rounded-sm border border-white/10 bg-black/20 p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">
                            {booking.member_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {booking.member_number} ·{" "}
                            {formatTime(booking.starts_at)}
                            {" - "}
                            {formatTime(booking.ends_at)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-[0.62rem] font-black uppercase ${statusClasses[booking.status]}`}
                        >
                          {statusLabels[booking.status]}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="lg:col-span-2">
                      <EmptyState text="Aucun client enregistre dans cette ancienne plage." />
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState text="Aucun ancien planning pour le moment." />
        )}
      </div>
    </section>
  );
}

function MemberAvailabilityList({
  availabilities,
  notes,
  selectedStarts,
  busy,
  onNote,
  onStart,
  onReserve,
}: {
  availabilities: Availability[];
  notes: Record<string, string>;
  selectedStarts: Record<string, string>;
  busy: string | null;
  onNote: (id: string, value: string) => void;
  onStart: (id: string, value: string) => void;
  onReserve: (availability: Availability, startsAt: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <Clock3 className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-xl font-black text-white">
            Creneaux de mon coach
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Choisissez un horaire. Votre coach, la Reception ou l&apos;Admin le
            confirmera ensuite.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {availabilities.length ? (
          availabilities.map((availability) => {
            const slots = availabilitySlots(availability);
            const freeSlots = slots.filter((slot) => !slot.occupied);
            const selectedStart = selectedStarts[availability.id] ?? "";
            return (
              <Card key={availability.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-white">
                      {formatSchedule(
                        availability.starts_at,
                        availability.ends_at,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Coach {availability.coach_name}
                    </p>
                  </div>
                  <Pill>
                    {freeSlots.length
                      ? `${freeSlots.length} horaire(s) libre(s)`
                      : "Complet"}
                  </Pill>
                </div>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                  Seance de {availability.session_duration_minutes} minutes
                </p>
                {availability.note ? (
                  <p className="mt-3 text-sm text-gray-400">
                    {availability.note}
                  </p>
                ) : null}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((slot) => {
                    const selected = slot.startsAt === selectedStart;
                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        disabled={slot.occupied}
                        aria-pressed={selected}
                        onClick={() => onStart(availability.id, slot.startsAt)}
                        className={`min-h-12 rounded-sm border px-3 py-2 text-sm font-black transition ${
                          slot.occupied
                            ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-700 line-through"
                            : selected
                              ? "border-primary bg-primary text-black"
                              : "border-white/15 bg-black/20 text-white hover:border-primary hover:text-primary"
                        }`}
                      >
                        {formatTime(slot.startsAt)}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  aria-label={`Note reservation ${availability.id}`}
                  className={`${textareaClass} mt-4 min-h-20`}
                  placeholder="Message optionnel pour votre coach"
                  value={notes[availability.id] ?? ""}
                  disabled={!freeSlots.length}
                  onChange={(event) =>
                    onNote(availability.id, event.target.value)
                  }
                />
                <Button
                  className="mt-3 w-full"
                  disabled={!selectedStart || busy === availability.id}
                  onClick={() => onReserve(availability, selectedStart)}
                >
                  <CalendarCheck className="h-4 w-4" />
                  {freeSlots.length
                    ? selectedStart
                      ? `Reserver a ${formatTime(selectedStart)}`
                      : "Choisir une heure"
                    : "Aucun horaire libre"}
                </Button>
              </Card>
            );
          })
        ) : (
          <div className="lg:col-span-2">
            <EmptyState text="Votre coach n'a pas encore ajoute de creneau futur." />
          </div>
        )}
      </div>
    </section>
  );
}

function BookingCard({
  booking,
  mode,
  availabilityChoices,
  scheduleChoice,
  simultaneousCount,
  busy,
  onScheduleChoice,
  onStatus,
  onReschedule,
}: {
  booking: Booking;
  mode: Mode;
  availabilityChoices: Availability[];
  scheduleChoice: string;
  simultaneousCount: number;
  busy: string | null;
  onScheduleChoice: (value: string) => void;
  onStatus: (status: BookingStatus) => void;
  onReschedule: (availabilityId: string) => void;
}) {
  const canDecide = mode !== "member";
  const open = ["requested", "confirmed"].includes(booking.status);
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-white">{booking.member_name}</p>
              <span
                className={`rounded-full border px-3 py-1 text-[0.65rem] font-black uppercase ${statusClasses[booking.status]}`}
              >
                {statusLabels[booking.status]}
              </span>
              {booking.conflict_override ||
              booking.overlapping_confirmed_count > 0 ? (
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[0.65rem] font-black uppercase text-amber-200">
                  Double horaire confirme
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-bold text-gray-300">
              {formatSchedule(booking.starts_at, booking.ends_at)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Coach {booking.coach_name} · {booking.member_number}
            </p>
            {booking.member_note ? (
              <p className="mt-3 text-sm text-gray-400">
                Message client: {booking.member_note}
              </p>
            ) : null}
            {booking.decision_note ? (
              <p className="mt-2 text-xs text-gray-500">
                Derniere decision: {booking.decision_note}
              </p>
            ) : null}
            {canDecide && simultaneousCount > 1 ? (
              <div className="mt-3 flex items-start gap-2 rounded-sm border border-amber-300/30 bg-amber-300/[0.08] p-3 text-sm text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {simultaneousCount} clients ont reserve le meme horaire.
                  Verifiez les demandes avant de confirmer.
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-[32rem] lg:justify-end">
          {canDecide && booking.status === "requested" ? (
            <Button
              size="sm"
              disabled={busy === booking.id}
              onClick={() => onStatus("confirmed")}
            >
              <Check className="h-4 w-4" /> Confirmer
            </Button>
          ) : null}
          {canDecide && booking.status === "confirmed" ? (
            <Button
              size="sm"
              disabled={busy === booking.id}
              onClick={() => onStatus("completed")}
            >
              <Check className="h-4 w-4" /> Terminer
            </Button>
          ) : null}
          {open ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy === booking.id}
              onClick={() => onStatus("cancelled")}
            >
              <X className="h-4 w-4" /> Annuler
            </Button>
          ) : null}
        </div>
      </div>

      {mode === "staff" &&
      open &&
      availableScheduleChoices(availabilityChoices).length ? (
        <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-[1fr_auto]">
          <select
            aria-label={`Nouvel horaire ${booking.member_name}`}
            className={selectClass}
            value={scheduleChoice}
            onChange={(event) => onScheduleChoice(event.target.value)}
          >
            <option value="">Choisir un autre creneau</option>
            {availableScheduleChoices(availabilityChoices).map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={!scheduleChoice || busy === `schedule-${booking.id}`}
            onClick={() => onReschedule(scheduleChoice)}
          >
            <RefreshCw className="h-4 w-4" /> Changer l&apos;horaire
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function simultaneousBookingCount(booking: Booking, bookings: Booking[]) {
  const start = new Date(booking.starts_at).getTime();
  const end = new Date(booking.ends_at).getTime();
  return bookings.filter((candidate) => {
    if (
      candidate.coach_id !== booking.coach_id ||
      !["requested", "confirmed"].includes(candidate.status)
    ) {
      return false;
    }
    const candidateStart = new Date(candidate.starts_at).getTime();
    const candidateEnd = new Date(candidate.ends_at).getTime();
    return start < candidateEnd && end > candidateStart;
  }).length;
}

function formatSchedule(startsAt: string, endsAt: string) {
  const date = formatDate(startsAt);
  const end = new Intl.DateTimeFormat("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(endsAt));
  return `${date} - ${end}`;
}

type AvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  occupied: boolean;
};

function availabilitySlots(availability: Availability): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const rangeEnd = new Date(availability.ends_at).getTime();
  const duration = availability.session_duration_minutes * 60_000;
  let cursor = new Date(availability.starts_at).getTime();

  while (cursor + duration <= rangeEnd) {
    const slotEnd = cursor + duration;
    const occupied =
      cursor <= Date.now() ||
      availability.reserved_periods.some((period) => {
        const reservedStart = new Date(period.starts_at).getTime();
        const reservedEnd = new Date(period.ends_at).getTime();
        return cursor < reservedEnd && slotEnd > reservedStart;
      });
    slots.push({
      startsAt: new Date(cursor).toISOString(),
      endsAt: new Date(slotEnd).toISOString(),
      occupied,
    });
    cursor = slotEnd;
  }

  return slots;
}

function availableScheduleChoices(availabilities: Availability[]) {
  return availabilities.flatMap((availability) =>
    availabilitySlots(availability)
      .filter((slot) => !slot.occupied)
      .map((slot) => ({
        value: `${availability.id}::${slot.startsAt}`,
        label: `${formatSchedule(slot.startsAt, slot.endsAt)} - ${availability.coach_name}`,
      })),
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCalculatedEnd(value: string) {
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function toLocalDateTimeInput(timestamp: number) {
  const date = new Date(timestamp);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function errorCode(error: unknown) {
  return (error as { detail?: { code?: string } } | undefined)?.detail?.code;
}

function errorMessage(error: unknown, fallback: string) {
  return (
    (error as { detail?: { message?: string } } | undefined)?.detail?.message ??
    fallback
  );
}

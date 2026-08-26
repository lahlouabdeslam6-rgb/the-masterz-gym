"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
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
  | { kind: "schedule"; booking: Booking; availabilityId: string };

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
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [memberNotes, setMemberNotes] = useState<Record<string, string>>({});
  const [scheduleChoices, setScheduleChoices] = useState<
    Record<string, string>
  >({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>(
    "all",
  );

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
          item.is_active && new Date(item.starts_at).getTime() > referenceTime,
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
      return matchesStatus && matchesQuery;
    });
  }, [bookings, query, statusFilter]);

  async function createAvailability() {
    if (!startsAt || !endsAt) {
      setFeedback({
        type: "error",
        message: "Choisissez le debut et la fin du creneau.",
      });
      return;
    }
    setBusy("availability-create");
    const result = await api.POST("/api/v1/coaching/availability", {
      headers,
      body: {
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
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

  async function reserve(availability: Availability) {
    setBusy(availability.id);
    const result = await api.POST("/api/v1/coaching/bookings", {
      headers,
      body: {
        availability_id: availability.id,
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
    availabilityId: string,
    confirmOverlap = false,
  ) {
    if (!availabilityId) return;
    setBusy(`schedule-${booking.id}`);
    const result = await api.PATCH(
      "/api/v1/coaching/bookings/{booking_id}/schedule",
      {
        headers,
        params: { path: { booking_id: booking.id } },
        body: {
          availability_id: availabilityId,
          decision_note: "Horaire modifie depuis le planning",
          confirm_overlap: confirmOverlap,
        },
      },
    );
    setBusy(null);
    if (!result.data) {
      if (errorCode(result.error) === "coaching_booking_overlap") {
        setConflict({ kind: "schedule", booking, availabilityId });
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
      await reschedule(conflict.booking, conflict.availabilityId, true);
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
        <CoachAvailabilityEditor
          startsAt={startsAt}
          endsAt={endsAt}
          note={availabilityNote}
          busy={busy === "availability-create"}
          onStartsAt={setStartsAt}
          onEndsAt={setEndsAt}
          onNote={setAvailabilityNote}
          onCreate={() => void createAvailability()}
        />
      ) : null}

      {mode === "member" ? (
        <MemberAvailabilityList
          availabilities={futureAvailabilities}
          bookings={bookings}
          notes={memberNotes}
          busy={busy}
          onNote={(id, value) =>
            setMemberNotes((current) => ({ ...current, [id]: value }))
          }
          onReserve={(availability) => void reserve(availability)}
        />
      ) : (
        <AvailabilityOverview
          mode={mode}
          availabilities={availabilities}
          busy={busy}
          onDisable={(availability) => void disableAvailability(availability)}
        />
      )}

      <section>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
              Calendrier des seances
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">
              {mode === "member" ? "Mes reservations" : "Reservations coaching"}
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
                  (item) =>
                    item.coach_id === booking.coach_id &&
                    item.id !== booking.availability_id,
                )}
                scheduleChoice={scheduleChoices[booking.id] ?? ""}
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
    </div>
  );
}

function CoachAvailabilityEditor({
  startsAt,
  endsAt,
  note,
  busy,
  onStartsAt,
  onEndsAt,
  onNote,
  onCreate,
}: {
  startsAt: string;
  endsAt: string;
  note: string;
  busy: boolean;
  onStartsAt: (value: string) => void;
  onEndsAt: (value: string) => void;
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
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Field label="Debut du creneau">
          <Input
            type="datetime-local"
            aria-label="Debut du creneau coaching"
            value={startsAt}
            onChange={(event) => onStartsAt(event.target.value)}
          />
        </Field>
        <Field label="Fin du creneau">
          <Input
            type="datetime-local"
            aria-label="Fin du creneau coaching"
            value={endsAt}
            onChange={(event) => onEndsAt(event.target.value)}
          />
        </Field>
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

function MemberAvailabilityList({
  availabilities,
  bookings,
  notes,
  busy,
  onNote,
  onReserve,
}: {
  availabilities: Availability[];
  bookings: Booking[];
  notes: Record<string, string>;
  busy: string | null;
  onNote: (id: string, value: string) => void;
  onReserve: (availability: Availability) => void;
}) {
  const reservedIds = new Set(
    bookings
      .filter((booking) => ["requested", "confirmed"].includes(booking.status))
      .map((booking) => booking.availability_id),
  );
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
            const reserved = reservedIds.has(availability.id);
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
                  <Pill>{reserved ? "Reserve" : "Disponible"}</Pill>
                </div>
                {availability.note ? (
                  <p className="mt-3 text-sm text-gray-400">
                    {availability.note}
                  </p>
                ) : null}
                <textarea
                  aria-label={`Note reservation ${availability.id}`}
                  className={`${textareaClass} mt-4 min-h-20`}
                  placeholder="Message optionnel pour votre coach"
                  value={notes[availability.id] ?? ""}
                  disabled={reserved}
                  onChange={(event) =>
                    onNote(availability.id, event.target.value)
                  }
                />
                <Button
                  className="mt-3 w-full"
                  disabled={reserved || busy === availability.id}
                  onClick={() => onReserve(availability)}
                >
                  <CalendarCheck className="h-4 w-4" />
                  {reserved ? "Deja reserve" : "Reserver ce creneau"}
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
  busy,
  onScheduleChoice,
  onStatus,
  onReschedule,
}: {
  booking: Booking;
  mode: Mode;
  availabilityChoices: Availability[];
  scheduleChoice: string;
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

      {canDecide && open && availabilityChoices.length ? (
        <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-[1fr_auto]">
          <select
            aria-label={`Nouvel horaire ${booking.member_name}`}
            className={selectClass}
            value={scheduleChoice}
            onChange={(event) => onScheduleChoice(event.target.value)}
          >
            <option value="">Choisir un autre creneau</option>
            {availabilityChoices.map((availability) => (
              <option key={availability.id} value={availability.id}>
                {formatSchedule(availability.starts_at, availability.ends_at)}
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

function formatSchedule(startsAt: string, endsAt: string) {
  const date = formatDate(startsAt);
  const end = new Intl.DateTimeFormat("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(endsAt));
  return `${date} - ${end}`;
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { components } from "@masterz/api-client";
import {
  CalendarDays,
  Check,
  Clock3,
  History,
  ListChecks,
  Plus,
  Save,
  Settings2,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { Alert, Button, Card, Input, LoadingMessage, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { SALLE_2_ID, ClubBadge } from "./ClubSwitcher";
import {
  DashboardTabs,
  EmptyState,
  Field,
  selectClass,
  textareaClass,
} from "./dashboard-shared";

type ClassType = components["schemas"]["CollectiveClassTypeRead"];
type ClassSession = components["schemas"]["CollectiveClassSessionRead"];
type Reservation = components["schemas"]["CollectiveClassReservationRead"];
type Coach = components["schemas"]["CoachSummary"];
type ClubAccess = components["schemas"]["MyClubAccessRead"];
type Mode = "admin" | "coach" | "member";
type AdminView = "planning" | "types";

const reservationLabels: Record<Reservation["status"], string> = {
  confirmed: "Confirmee",
  waitlisted: "Liste d'attente",
  cancelled: "Annulee",
  attended: "Present",
  no_show: "Absent",
};

const sessionLabels: Record<ClassSession["status"], string> = {
  scheduled: "Programme",
  cancelled: "Annule",
  completed: "Termine",
};

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function dateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function durationMinutes(item: ClassSession) {
  return Math.round(
    (new Date(item.ends_at).getTime() - new Date(item.starts_at).getTime()) /
      60000,
  );
}

export function CollectiveClassesManager({
  session,
  mode,
}: {
  session: AuthSession;
  mode: Mode;
}) {
  const [access, setAccess] = useState<ClubAccess | null>(null);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [adminView, setAdminView] = useState<AdminView>("planning");
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const headers = useMemo(
    () => authorizationHeaders(session.accessToken),
    [session.accessToken],
  );

  const [classTypeId, setClassTypeId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");

  const hasSalleTwoAccess = Boolean(
    access?.clubs.some((club) => club.id === SALLE_2_ID),
  );

  const load = useCallback(async () => {
    setLoading(true);
    const accessResult = await api.GET("/api/v1/clubs/my-access", { headers });
    const loadedAccess = accessResult.data ?? null;
    setAccess(loadedAccess);
    const allowed = Boolean(
      loadedAccess?.clubs.some((club) => club.id === SALLE_2_ID),
    );
    if (!allowed) {
      setClassTypes([]);
      setSessions([]);
      setMyReservations([]);
      setFeedback(
        accessResult.error
          ? "L'acces aux salles n'a pas pu etre verifie."
          : null,
      );
      setLoading(false);
      return;
    }

    const [
      typesResult,
      sessionsResult,
      memberReservationsResult,
      coachesResult,
    ] = await Promise.all([
      api.GET("/api/v1/collective-classes/types", {
        headers,
        params: {
          query: {
            club_id: SALLE_2_ID,
            active_only: mode !== "admin",
          },
        },
      }),
      api.GET("/api/v1/collective-classes/sessions", {
        headers,
        params: {
          query: {
            club_id: SALLE_2_ID,
            coach_id: mode === "coach" ? session.user.id : undefined,
            include_history: true,
            from_at: undefined,
            to_at: undefined,
          },
        },
      }),
      mode === "member"
        ? api.GET("/api/v1/collective-classes/my-reservations", {
            headers,
            params: { query: { limit: 300 } },
          })
        : Promise.resolve({ data: [] as Reservation[], error: undefined }),
      mode === "admin"
        ? api.GET("/api/v1/coaching/coaches", { headers })
        : Promise.resolve({ data: [] as Coach[], error: undefined }),
    ]);

    const loadedTypes = typesResult.data ?? [];
    const loadedSessions = sessionsResult.data ?? [];
    setClassTypes(loadedTypes);
    setSessions(loadedSessions);
    setMyReservations(memberReservationsResult.data ?? []);
    setSelectedSessionId((current) =>
      loadedSessions.some((item) => item.id === current)
        ? current
        : (loadedSessions.find((item) => item.status === "scheduled")?.id ??
          loadedSessions[0]?.id ??
          ""),
    );
    setClassTypeId((current) => current || loadedTypes[0]?.id || "");
    if (loadedTypes[0]) {
      setDuration(
        (current) => current || String(loadedTypes[0].default_duration_minutes),
      );
      setCapacity(
        (current) => current || String(loadedTypes[0].default_capacity),
      );
    }

    if (mode === "admin") {
      const loadedCoaches = coachesResult.data ?? [];
      const assignments = await Promise.all(
        loadedCoaches.map(async (coach) => {
          const result = await api.GET(
            "/api/v1/clubs/users/{user_id}/assignments",
            {
              headers,
              params: { path: { user_id: coach.id } },
            },
          );
          return {
            coach,
            allowed: Boolean(
              result.data?.some(
                (assignment) => assignment.club_id === SALLE_2_ID,
              ),
            ),
          };
        }),
      );
      const salleTwoCoaches = assignments
        .filter((item) => item.allowed)
        .map((item) => item.coach);
      setCoaches(salleTwoCoaches);
      setCoachId((current) => current || salleTwoCoaches[0]?.id || "");
    }

    setFeedback(
      typesResult.error ||
        sessionsResult.error ||
        memberReservationsResult.error ||
        coachesResult.error
        ? "Une partie du planning n'a pas pu etre chargee."
        : null,
    );
    setLoading(false);
  }, [headers, mode, session.user.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const loadReservations = useCallback(async () => {
    if (mode === "member" || !selectedSessionId) {
      setReservations([]);
      return;
    }
    const result = await api.GET(
      "/api/v1/collective-classes/sessions/{session_id}/reservations",
      {
        headers,
        params: { path: { session_id: selectedSessionId } },
      },
    );
    setReservations(result.data ?? []);
    if (result.error)
      setFeedback("Les participants n'ont pas pu etre charges.");
  }, [headers, mode, selectedSessionId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadReservations(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadReservations]);

  const [renderedAt] = useState(() => Date.now());
  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter(
          (item) =>
            item.status === "scheduled" &&
            new Date(item.ends_at).getTime() > renderedAt,
        )
        .sort(
          (first, second) =>
            new Date(first.starts_at).getTime() -
            new Date(second.starts_at).getTime(),
        ),
    [renderedAt, sessions],
  );
  const historySessions = useMemo(
    () =>
      sessions.filter(
        (item) =>
          item.status !== "scheduled" ||
          new Date(item.ends_at).getTime() <= renderedAt,
      ),
    [renderedAt, sessions],
  );
  const selectedSession = sessions.find(
    (item) => item.id === selectedSessionId,
  );

  async function createSession() {
    if (!classTypeId || !startsAt || !capacity || !duration) return;
    if (mode === "admin" && !coachId) {
      setFeedback("Affectez d'abord un coach a la Salle 2.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    const result = await api.POST("/api/v1/collective-classes/sessions", {
      headers,
      body: {
        club_id: SALLE_2_ID,
        class_type_id: classTypeId,
        coach_id: mode === "admin" ? coachId : undefined,
        starts_at: new Date(startsAt).toISOString(),
        duration_minutes: Number(duration),
        capacity: Number(capacity),
        note: note.trim() || undefined,
      },
    });
    setBusy(false);
    if (!result.data) {
      setFeedback(
        "Le cours n'a pas pu etre publie. Verifiez la date et le coach.",
      );
      return;
    }
    setStartsAt("");
    setNote("");
    await load();
    setFeedback("Le cours a ete publie dans le planning de la Salle 2.");
  }

  async function cancelSession(item: ClassSession) {
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH(
      "/api/v1/collective-classes/sessions/{session_id}",
      {
        headers,
        params: { path: { session_id: item.id } },
        body: {
          status: "cancelled",
          reason: "Cours annule depuis le planning",
        },
      },
    );
    setBusy(false);
    if (!result.data) {
      setFeedback("Le cours n'a pas pu etre annule.");
      return;
    }
    await load();
    setFeedback("Le cours et ses reservations ont ete annules.");
  }

  async function reserve(item: ClassSession) {
    setBusy(true);
    setFeedback(null);
    const result = await api.POST(
      "/api/v1/collective-classes/sessions/{session_id}/reservations",
      {
        headers,
        params: { path: { session_id: item.id } },
      },
    );
    setBusy(false);
    if (!result.data) {
      setFeedback(
        "La reservation n'a pas pu etre enregistree. Verifiez votre abonnement Salle 2.",
      );
      return;
    }
    await load();
    setFeedback(
      result.data.status === "waitlisted"
        ? `Vous etes en liste d'attente, position ${result.data.waitlist_position}.`
        : "Votre place est confirmee.",
    );
  }

  async function cancelReservation(reservationId: string) {
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH(
      "/api/v1/collective-classes/reservations/{reservation_id}/cancel",
      {
        headers,
        params: { path: { reservation_id: reservationId } },
        body: {
          reason:
            mode === "member"
              ? "Annulation par le membre"
              : "Reservation retiree depuis le planning",
        },
      },
    );
    setBusy(false);
    if (!result.data) {
      setFeedback("La reservation n'a pas pu etre annulee.");
      return;
    }
    await load();
    if (mode !== "member") await loadReservations();
    setFeedback("La place a ete liberee pour la personne suivante.");
  }

  async function updateAttendance(
    reservation: Reservation,
    status: "attended" | "no_show",
  ) {
    setBusy(true);
    const result = await api.PATCH(
      "/api/v1/collective-classes/reservations/{reservation_id}/status",
      {
        headers,
        params: { path: { reservation_id: reservation.id } },
        body: {
          status,
          reason: "Presence mise a jour depuis le planning",
        },
      },
    );
    setBusy(false);
    if (!result.data) {
      setFeedback("La presence n'a pas pu etre enregistree.");
      return;
    }
    await loadReservations();
    setFeedback(
      status === "attended" ? "Presence confirmee." : "Absence enregistree.",
    );
  }

  if (loading)
    return <LoadingMessage message="Chargement des cours Salle 2..." />;

  if (!hasSalleTwoAccess) {
    return (
      <Card className="border-primary/20 p-7">
        <ClubBadge clubId={SALLE_2_ID} />
        <h3 className="mt-5 text-xl font-black text-white">
          Acces Salle 2 non active
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Ce compte n&apos;est pas encore affecte a la Salle 2.
          L&apos;Administration doit activer cette salle avant de publier ou
          reserver un cours collectif.
        </p>
      </Card>
    );
  }

  if (mode === "member") {
    return (
      <div className="space-y-6">
        {feedback ? <Alert type="info" message={feedback} /> : null}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <ClubBadge clubId={SALLE_2_ID} />
            <h3 className="mt-3 font-display text-2xl font-black uppercase text-white">
              Cours ouverts a la reservation
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Les places sont confirmees automatiquement. Une fois le cours
              plein, vous passez dans la liste d&apos;attente.
            </p>
          </div>
          <Pill>{upcomingSessions.length} cours</Pill>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {upcomingSessions.length ? (
            upcomingSessions.map((item) => (
              <MemberSessionCard
                key={item.id}
                item={item}
                busy={busy}
                onReserve={() => void reserve(item)}
                onCancel={(reservationId) =>
                  void cancelReservation(reservationId)
                }
              />
            ))
          ) : (
            <div className="xl:col-span-2">
              <EmptyState text="Aucun cours collectif n'est encore programme." />
            </div>
          )}
        </div>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-black uppercase text-white">
              Mes reservations
            </h3>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {myReservations.length ? (
              myReservations.map((item) => (
                <ReservationSummary key={item.id} item={item} />
              ))
            ) : (
              <div className="md:col-span-2">
                <EmptyState text="Vous n'avez encore reserve aucun cours." />
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      {mode === "admin" ? (
        <DashboardTabs
          eyebrow="Gestion Salle 2"
          ariaLabel="Rubriques cours collectifs Salle 2"
          activeTab={adminView}
          onChange={setAdminView}
          tabs={[
            {
              id: "planning",
              label: "Planning et participants",
              icon: CalendarDays,
              badge: upcomingSessions.length,
            },
            {
              id: "types",
              label: "Types de cours",
              icon: Settings2,
              badge: classTypes.filter((item) => item.is_active).length,
            },
          ]}
        />
      ) : null}

      {mode === "admin" && adminView === "types" ? (
        <ClassTypeManager
          session={session}
          classTypes={classTypes}
          busy={busy}
          setBusy={setBusy}
          setFeedback={setFeedback}
          onSaved={load}
        />
      ) : null}

      {mode === "coach" || adminView === "planning" ? (
        <>
          <Card className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <ClubBadge clubId={SALLE_2_ID} />
                <h3 className="mt-4 font-display text-2xl font-black uppercase text-white">
                  Publier un cours collectif
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  La duree et la capacite viennent du type de cours, puis
                  peuvent etre adaptees avant publication.
                </p>
              </div>
              <Pill>
                {mode === "coach" ? "Mon planning" : "Administration"}
              </Pill>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Type de cours">
                <select
                  value={classTypeId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const nextType = classTypes.find(
                      (item) => item.id === nextId,
                    );
                    setClassTypeId(nextId);
                    if (nextType) {
                      setDuration(String(nextType.default_duration_minutes));
                      setCapacity(String(nextType.default_capacity));
                    }
                  }}
                  className={selectClass}
                >
                  {classTypes
                    .filter((item) => item.is_active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
              {mode === "admin" ? (
                <Field label="Coach Salle 2">
                  <select
                    value={coachId}
                    onChange={(event) => setCoachId(event.target.value)}
                    className={selectClass}
                  >
                    <option value="">Selectionnez un coach</option>
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.full_name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Date et heure">
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </Field>
              <Field label="Duree en minutes">
                <Input
                  type="number"
                  min={15}
                  max={240}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </Field>
              <Field label="Nombre maximum de places">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                />
              </Field>
              <Field label="Note optionnelle">
                <Input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ex. niveau, materiel ou consigne"
                />
              </Field>
            </div>
            <Button
              type="button"
              className="mt-5 w-full sm:w-auto"
              disabled={
                busy || !classTypeId || !startsAt || !duration || !capacity
              }
              onClick={() => void createSession()}
            >
              <Plus className="h-4 w-4" /> Publier dans le planning
            </Button>
          </Card>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-primary">
                Planning Salle 2
              </p>
              <h3 className="mt-1 font-display text-2xl font-black uppercase text-white">
                {showHistory ? "Historique des cours" : "Cours a venir"}
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowHistory((current) => !current)}
            >
              {showHistory ? (
                <CalendarDays className="h-4 w-4" />
              ) : (
                <History className="h-4 w-4" />
              )}
              {showHistory ? "Voir les cours a venir" : "Voir l'historique"}
            </Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {(showHistory ? historySessions : upcomingSessions).length ? (
              (showHistory ? historySessions : upcomingSessions).map((item) => (
                <ManagerSessionCard
                  key={item.id}
                  item={item}
                  selected={selectedSessionId === item.id}
                  busy={busy}
                  onSelect={() => setSelectedSessionId(item.id)}
                  onCancel={() => void cancelSession(item)}
                />
              ))
            ) : (
              <div className="xl:col-span-2">
                <EmptyState
                  text={
                    showHistory
                      ? "Aucun ancien cours dans cet historique."
                      : "Aucun cours collectif a venir."
                  }
                />
              </div>
            )}
          </div>

          {selectedSession ? (
            <SessionParticipants
              key={selectedSession.id}
              session={selectedSession}
              reservations={reservations}
              busy={busy}
              onReload={async () => {
                await load();
                await loadReservations();
              }}
              onFeedback={setFeedback}
              onAttendance={updateAttendance}
              onCancelReservation={(reservationId) =>
                void cancelReservation(reservationId)
              }
              authSession={session}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MemberSessionCard({
  item,
  busy,
  onReserve,
  onCancel,
}: {
  item: ClassSession;
  busy: boolean;
  onReserve: () => void;
  onCancel: (reservationId: string) => void;
}) {
  const reserved = item.my_reservation_status;
  const activeReservation = reserved && reserved !== "cancelled";
  return (
    <Card className="overflow-hidden border-white/10">
      <div className="border-b border-white/10 bg-primary/[0.06] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
              Salle 2
            </p>
            <h4 className="mt-2 text-xl font-black text-white">
              {item.class_name}
            </h4>
            <p className="mt-1 text-sm text-gray-500">
              Coach {item.coach_name}
            </p>
          </div>
          {activeReservation ? (
            <Pill>{reservationLabels[reserved]}</Pill>
          ) : (
            <Pill>{item.available_spots} place(s)</Pill>
          )}
        </div>
      </div>
      <div className="p-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <span className="flex items-center gap-2 text-gray-400">
            <CalendarDays className="h-4 w-4 text-primary" />
            {dateTimeLabel(item.starts_at)}
          </span>
          <span className="flex items-center gap-2 text-gray-400">
            <Clock3 className="h-4 w-4 text-primary" />
            {durationMinutes(item)} minutes
          </span>
          <span className="flex items-center gap-2 text-gray-400">
            <UsersRound className="h-4 w-4 text-primary" />
            {item.confirmed_count}/{item.capacity} confirme(s)
          </span>
          <span className="flex items-center gap-2 text-gray-400">
            <ListChecks className="h-4 w-4 text-primary" />
            {item.waitlist_count} en attente
          </span>
        </div>
        {item.note ? (
          <p className="mt-4 text-sm text-gray-500">{item.note}</p>
        ) : null}
        {activeReservation && item.my_reservation_id ? (
          <Button
            type="button"
            variant="outline"
            className="mt-5 w-full"
            disabled={busy}
            onClick={() => onCancel(item.my_reservation_id!)}
          >
            <X className="h-4 w-4" /> Liberer ma place
          </Button>
        ) : (
          <Button
            type="button"
            className="mt-5 w-full"
            disabled={busy}
            onClick={onReserve}
          >
            <CalendarDays className="h-4 w-4" />
            {item.available_spots > 0
              ? "Reserver ma place"
              : "Rejoindre la liste d'attente"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function ReservationSummary({ item }: { item: Reservation }) {
  return (
    <div className="rounded-sm border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-white">{item.class_name}</p>
          <p className="mt-1 text-xs text-gray-500">Coach {item.coach_name}</p>
        </div>
        <Pill>{reservationLabels[item.status]}</Pill>
      </div>
      <p className="mt-3 text-sm text-gray-400">
        {dateTimeLabel(item.starts_at)}
      </p>
      {item.status === "waitlisted" ? (
        <p className="mt-2 text-xs font-bold text-primary">
          Position {item.waitlist_position} dans la liste d&apos;attente
        </p>
      ) : null}
    </div>
  );
}

function ManagerSessionCard({
  item,
  selected,
  busy,
  onSelect,
  onCancel,
}: {
  item: ClassSession;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onCancel: () => void;
}) {
  return (
    <Card
      className={`p-5 transition ${
        selected ? "border-primary/70 bg-primary/[0.08]" : "border-white/10"
      }`}
    >
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-black text-white">{item.class_name}</p>
            <p className="mt-1 text-sm text-gray-500">
              Coach {item.coach_name}
            </p>
          </div>
          <Pill>{sessionLabels[item.status]}</Pill>
        </div>
        <p className="mt-4 font-bold text-white">
          {dateTimeLabel(item.starts_at)}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <span className="rounded-sm bg-white/[0.04] p-2 text-gray-400">
            <strong className="block text-lg text-white">
              {item.confirmed_count}
            </strong>
            confirme(s)
          </span>
          <span className="rounded-sm bg-white/[0.04] p-2 text-gray-400">
            <strong className="block text-lg text-primary">
              {item.waitlist_count}
            </strong>
            attente
          </span>
          <span className="rounded-sm bg-white/[0.04] p-2 text-gray-400">
            <strong className="block text-lg text-white">
              {item.capacity}
            </strong>
            capacite
          </span>
        </div>
      </button>
      {item.status === "scheduled" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={busy}
          onClick={onCancel}
        >
          <X className="h-4 w-4" /> Annuler le cours
        </Button>
      ) : null}
    </Card>
  );
}

function SessionParticipants({
  session: classSession,
  reservations,
  busy,
  onReload,
  onFeedback,
  onAttendance,
  onCancelReservation,
  authSession,
}: {
  session: ClassSession;
  reservations: Reservation[];
  busy: boolean;
  onReload: () => Promise<void>;
  onFeedback: (message: string) => void;
  onAttendance: (
    reservation: Reservation,
    status: "attended" | "no_show",
  ) => Promise<void>;
  onCancelReservation: (reservationId: string) => void;
  authSession: AuthSession;
}) {
  const [renderedAt] = useState(() => Date.now());
  const canRecordAttendance =
    new Date(classSession.starts_at).getTime() <= renderedAt;
  const [startsAt, setStartsAt] = useState(
    dateTimeLocal(classSession.starts_at),
  );
  const [capacity, setCapacity] = useState(String(classSession.capacity));
  const [duration, setDuration] = useState(
    String(durationMinutes(classSession)),
  );
  const [note, setNote] = useState(classSession.note ?? "");

  async function saveSession() {
    const result = await api.PATCH(
      "/api/v1/collective-classes/sessions/{session_id}",
      {
        headers: authorizationHeaders(authSession.accessToken),
        params: { path: { session_id: classSession.id } },
        body: {
          starts_at: new Date(startsAt).toISOString(),
          capacity: Number(capacity),
          duration_minutes: Number(duration),
          note: note.trim() || null,
          reason: "Planning du cours mis a jour",
        },
      },
    );
    if (!result.data) {
      onFeedback("Les modifications du cours n'ont pas pu etre enregistrees.");
      return;
    }
    await onReload();
    onFeedback("Le cours a ete mis a jour.");
  }

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-primary">
            Dossier du cours
          </p>
          <h3 className="mt-2 font-display text-2xl font-black uppercase text-white">
            {classSession.class_name}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {dateTimeLabel(classSession.starts_at)} · Coach{" "}
            {classSession.coach_name}
          </p>
        </div>
        <Pill>
          {classSession.confirmed_count}/{classSession.capacity} places
        </Pill>
      </div>

      {classSession.status === "scheduled" ? (
        <div className="mt-6 rounded-sm border border-white/10 bg-black/20 p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Date et heure">
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </Field>
            <Field label="Duree en minutes">
              <Input
                type="number"
                min={15}
                max={240}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </Field>
            <Field label="Capacite">
              <Input
                type="number"
                min={classSession.confirmed_count || 1}
                max={500}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
              />
            </Field>
            <Field label="Note">
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-4"
            disabled={busy}
            onClick={() => void saveSession()}
          >
            <Save className="h-4 w-4" /> Enregistrer les modifications
          </Button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ParticipantColumn
          title="Places confirmees"
          subtitle="Les premiers membres inscrits"
          items={reservations.filter((item) =>
            ["confirmed", "attended", "no_show"].includes(item.status),
          )}
          busy={busy}
          canRecordAttendance={canRecordAttendance}
          onAttendance={onAttendance}
          onCancel={onCancelReservation}
        />
        <ParticipantColumn
          title="Liste d'attente"
          subtitle="Ordre de remplacement automatique"
          items={reservations.filter((item) => item.status === "waitlisted")}
          busy={busy}
          canRecordAttendance={false}
          onAttendance={onAttendance}
          onCancel={onCancelReservation}
        />
      </div>
    </Card>
  );
}

function ParticipantColumn({
  title,
  subtitle,
  items,
  busy,
  canRecordAttendance,
  onAttendance,
  onCancel,
}: {
  title: string;
  subtitle: string;
  items: Reservation[];
  busy: boolean;
  canRecordAttendance: boolean;
  onAttendance: (
    reservation: Reservation,
    status: "attended" | "no_show",
  ) => Promise<void>;
  onCancel: (reservationId: string) => void;
}) {
  return (
    <section className="rounded-sm border border-white/10 bg-black/20 p-4">
      <h4 className="font-black text-white">{title}</h4>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-sm border border-white/10 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{item.member_name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.member_number ?? "Numero membre non attribue"}
                  </p>
                </div>
                <Pill>
                  {item.status === "waitlisted"
                    ? `Position ${item.waitlist_position}`
                    : reservationLabels[item.status]}
                </Pill>
              </div>
              {item.status === "confirmed" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canRecordAttendance ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void onAttendance(item, "attended")}
                      >
                        <Check className="h-4 w-4" /> Present
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void onAttendance(item, "no_show")}
                      >
                        <X className="h-4 w-4" /> Absent
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onCancel(item.id)}
                  >
                    Liberer
                  </Button>
                </div>
              ) : item.status === "waitlisted" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-3"
                  disabled={busy}
                  onClick={() => onCancel(item.id)}
                >
                  Retirer de l&apos;attente
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState text="Aucun membre dans cette liste." />
        )}
      </div>
    </section>
  );
}

function ClassTypeManager({
  session,
  classTypes,
  busy,
  setBusy,
  setFeedback,
  onSaved,
}: {
  session: AuthSession;
  classTypes: ClassType[];
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setFeedback: (message: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [capacity, setCapacity] = useState("");
  const headers = authorizationHeaders(session.accessToken);

  async function createType() {
    if (!name.trim() || !duration || !capacity) return;
    setBusy(true);
    const result = await api.POST("/api/v1/collective-classes/types", {
      headers,
      body: {
        club_id: SALLE_2_ID,
        name: name.trim(),
        description: description.trim() || undefined,
        default_duration_minutes: Number(duration),
        default_capacity: Number(capacity),
        is_active: true,
      },
    });
    setBusy(false);
    if (!result.data) {
      setFeedback("Le type de cours n'a pas pu etre cree.");
      return;
    }
    setName("");
    setDescription("");
    setDuration("");
    setCapacity("");
    await onSaved();
    setFeedback("Le nouveau type de cours est disponible.");
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <Plus className="h-5 w-5 text-primary" />
          <h3 className="font-display text-2xl font-black uppercase text-white">
            Ajouter un type de cours
          </h3>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Nom du cours">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Duree par defaut">
            <Input
              type="number"
              min={15}
              max={240}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </Field>
          <Field label="Capacite par defaut">
            <Input
              type="number"
              min={1}
              max={500}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>
        <Button
          type="button"
          className="mt-5"
          disabled={busy || !name.trim() || !duration || !capacity}
          onClick={() => void createType()}
        >
          <Plus className="h-4 w-4" /> Ajouter le cours
        </Button>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {classTypes.map((item) => (
          <ClassTypeEditor
            key={item.id}
            item={item}
            session={session}
            busy={busy}
            setBusy={setBusy}
            setFeedback={setFeedback}
            onSaved={onSaved}
          />
        ))}
      </div>
    </div>
  );
}

function ClassTypeEditor({
  item,
  session,
  busy,
  setBusy,
  setFeedback,
  onSaved,
}: {
  item: ClassType;
  session: AuthSession;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setFeedback: (message: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [duration, setDuration] = useState(
    String(item.default_duration_minutes),
  );
  const [capacity, setCapacity] = useState(String(item.default_capacity));
  const [active, setActive] = useState(item.is_active);

  async function save() {
    setBusy(true);
    const result = await api.PATCH(
      "/api/v1/collective-classes/types/{class_type_id}",
      {
        headers: authorizationHeaders(session.accessToken),
        params: { path: { class_type_id: item.id } },
        body: {
          name,
          description: description.trim() || null,
          default_duration_minutes: Number(duration),
          default_capacity: Number(capacity),
          is_active: active,
          reason: "Configuration du cours mise a jour",
        },
      },
    );
    setBusy(false);
    if (!result.data) {
      setFeedback("Les parametres du cours n'ont pas pu etre enregistres.");
      return;
    }
    await onSaved();
    setFeedback(`Le cours ${result.data.name} a ete mis a jour.`);
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/[0.1] text-primary">
            <UserRoundCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="font-black text-white">{item.name}</p>
            <p className="mt-1 text-xs text-gray-500">
              Regles modifiables par l&apos;Admin
            </p>
          </div>
        </div>
        <Pill>{active ? "Actif" : "Masque"}</Pill>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Nom">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Visibilite">
          <select
            className={selectClass}
            value={active ? "active" : "hidden"}
            onChange={(event) => setActive(event.target.value === "active")}
          >
            <option value="active">Actif</option>
            <option value="hidden">Masque</option>
          </select>
        </Field>
        <Field label="Duree en minutes">
          <Input
            type="number"
            min={15}
            max={240}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </Field>
        <Field label="Nombre maximum">
          <Input
            type="number"
            min={1}
            max={500}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          className={`${textareaClass} mt-4 min-h-24`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Button
        type="button"
        size="sm"
        className="mt-4"
        disabled={busy}
        onClick={() => void save()}
      >
        <Save className="h-4 w-4" /> Enregistrer
      </Button>
    </Card>
  );
}

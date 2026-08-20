"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  CreditCard,
  History,
  Pencil,
  ReceiptText,
  Save,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { Alert, Button, Card, Input, Pill, buttonStyles } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { ReceiptSummary } from "./ApplicationManager";
import {
  type Attendance,
  type MemberSubscriptionSummary,
  type Plan,
  type Receipt,
  type Subscription,
  type SubscriptionEvent,
  EmptyState,
  Field,
  formatDate,
  selectClass,
  statusLabels,
} from "./dashboard-shared";

type PaymentMethod = "cash" | "bank_card";
export type StaffMemberMode = "full" | "profile" | "payments" | "access";
type MemberFilter =
  | "all"
  | "active"
  | "upcoming"
  | "expiring"
  | "suspended"
  | "cancelled"
  | "expired"
  | "none";
type MemberSort = "priority" | "name" | "newest";
type ProfileTab = "informations" | "subscriptions" | "receipts" | "attendance";

type MemberListItem = MemberSubscriptionSummary;

const serviceTypeLabels: Record<Plan["service_type"], string> = {
  gym: "Salle musculation",
  coaching: "Coaching",
  recovery: "Recovery",
};
const serviceTypes = Object.keys(serviceTypeLabels) as Plan["service_type"][];

type MemberProfileDraft = {
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: "female" | "male";
};

function startsAfterToday(value: string | null | undefined) {
  if (!value) return false;
  const [year, month, day] = value.split("-").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(year, month - 1, day) > today;
}

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hasScheduledSubscription(member: MemberListItem) {
  const status = member.effective_status ?? member.status;
  return (
    startsAfterToday(member.starts_on) &&
    (status === "active" || status === "expiring_soon")
  );
}

function remainingLabel(days: number | null | undefined) {
  if (days == null) return "Aucun abonnement";
  if (days < 0) {
    const elapsed = Math.abs(days);
    return `Expire depuis ${elapsed} jour${elapsed > 1 ? "s" : ""}`;
  }
  if (days === 0) return "Expire aujourd'hui";
  return `${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`;
}

function remainingClass(days: number | null | undefined) {
  if (days == null) return "border-white/15 bg-white/5 text-gray-400";
  if (days < 0) return "border-red-400/30 bg-red-400/10 text-red-300";
  if (days <= 7) return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  if (days <= 30) return "border-primary/30 bg-primary/10 text-primary";
  return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
}

function memberStatusClass(member: MemberListItem) {
  if (hasScheduledSubscription(member))
    return "border-primary/30 bg-primary/10 text-primary";
  const status = member.effective_status ?? member.status;
  if (!status) return "border-white/15 bg-white/5 text-gray-400";
  if (status === "active")
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  if (status === "expiring_soon" || status === "grace_period")
    return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  return "border-red-400/30 bg-red-400/10 text-red-300";
}

function memberStatusLabel(member: MemberListItem) {
  if (hasScheduledSubscription(member)) return "A venir";
  const status = member.effective_status ?? member.status;
  return status ? (statusLabels[status] ?? status) : "Sans abonnement";
}

function memberFilterValue(member: MemberListItem): MemberFilter {
  if (hasScheduledSubscription(member)) return "upcoming";
  const status = member.effective_status ?? member.status;
  if (!status) return "none";
  if (status === "expiring_soon" || status === "grace_period") {
    return "expiring";
  }
  return status;
}

function memberPriority(member: MemberListItem) {
  const filter = memberFilterValue(member);
  if (filter === "expiring") return 0;
  if (["expired", "suspended", "cancelled", "none"].includes(filter)) {
    return 1;
  }
  if (filter === "active") return 2;
  return 3;
}

function profileDraft(member: MemberListItem): MemberProfileDraft {
  return {
    full_name: member.full_name,
    phone: member.phone,
    email: member.email ?? "",
    date_of_birth: member.date_of_birth ?? "",
    gender: member.gender === "female" ? "female" : "male",
  };
}

const memberFilterLabels: Record<MemberFilter, string> = {
  all: "Tous les membres",
  active: "Actifs",
  upcoming: "A venir",
  expiring: "Expire bientot",
  suspended: "Suspendus",
  cancelled: "Annules",
  expired: "Expires",
  none: "Sans abonnement",
};

function canCreateMembershipPayment(member: MemberListItem) {
  const status = member.effective_status ?? member.status;
  return (
    !member.subscription_id ||
    status === "suspended" ||
    status === "expired" ||
    status === "cancelled"
  );
}

function paymentBadgeLabel(member: MemberListItem) {
  if (hasScheduledSubscription(member) && member.starts_on) {
    return `Commence le ${formatDate(member.starts_on)}`;
  }
  return canCreateMembershipPayment(member)
    ? memberStatusLabel(member)
    : remainingLabel(member.days_remaining);
}

function paymentBadgeClass(member: MemberListItem) {
  if (hasScheduledSubscription(member)) return memberStatusClass(member);
  return canCreateMembershipPayment(member)
    ? memberStatusClass(member)
    : remainingClass(member.days_remaining);
}

export function StaffMemberManager({
  session,
  plans,
  mode = "full",
}: {
  session: AuthSession;
  plans: Plan[];
  mode?: StaffMemberMode;
}) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberSubscriptionSummary[]>([]);
  const [memberListLoading, setMemberListLoading] = useState(true);
  const [selected, setSelected] = useState<MemberListItem | null>(null);
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [memberSort, setMemberSort] = useState<MemberSort>("priority");
  const [profileTab, setProfileTab] = useState<ProfileTab>("informations");
  const [activeServiceType, setActiveServiceType] =
    useState<Plan["service_type"]>("gym");
  const [memberProfile, setMemberProfile] = useState<MemberProfileDraft | null>(
    null,
  );
  const [profileReason, setProfileReason] = useState(
    "Mise a jour du dossier membre",
  );
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [events, setEvents] = useState<Record<string, SubscriptionEvent[]>>({});
  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<
    Record<string, Subscription["status"]>
  >({});
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<
    string | null
  >(null);
  const [confirmCancelSubscriptionId, setConfirmCancelSubscriptionId] =
    useState<string | null>(null);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [startsOn, setStartsOn] = useState(todayInputValue);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [statusReason, setStatusReason] = useState(
    "Mise à jour depuis le tableau de bord",
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const requestedMemberHandledRef = useRef("");
  const headers = authorizationHeaders(session.accessToken);
  const profileMode = mode === "profile";
  const canManageSubscriptions = mode === "full" || mode === "payments";
  const canEditMemberProfile = session.user.role === "admin";
  const showAccess = mode === "full" || mode === "access";
  const showPayments = mode === "full" || mode === "payments";
  const showSubscriptions =
    mode === "full" ||
    mode === "payments" ||
    (profileMode && profileTab === "subscriptions");
  const showReceipts =
    mode === "full" ||
    mode === "payments" ||
    (profileMode && profileTab === "receipts");
  const showAttendance =
    mode === "full" ||
    mode === "access" ||
    (profileMode && profileTab === "attendance");
  const requestedParams =
    mode === "payments" && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const requestedMemberId = requestedParams?.get("membre") ?? "";
  const requestedServiceValue = requestedParams?.get("categorie");
  const requestedServiceType = serviceTypes.includes(
    requestedServiceValue as Plan["service_type"],
  )
    ? (requestedServiceValue as Plan["service_type"])
    : null;
  const visibleMembers = useMemo(() => {
    const filtered = members.filter(
      (member) =>
        memberFilter === "all" || memberFilterValue(member) === memberFilter,
    );
    if (mode === "payments") return filtered;
    return filtered.sort((first, second) => {
      if (mode === "access" || memberSort === "name") {
        return first.full_name.localeCompare(second.full_name, "fr", {
          sensitivity: "base",
        });
      }
      if (memberSort === "newest") {
        return (
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime()
        );
      }
      const priorityDifference = memberPriority(first) - memberPriority(second);
      if (priorityDifference) return priorityDifference;
      const firstDays = first.days_remaining ?? Number.MAX_SAFE_INTEGER;
      const secondDays = second.days_remaining ?? Number.MAX_SAFE_INTEGER;
      return (
        firstDays - secondDays ||
        first.full_name.localeCompare(second.full_name, "fr", {
          sensitivity: "base",
        })
      );
    });
  }, [memberFilter, memberSort, members, mode]);

  const loadMemberData = useCallback(
    async (
      member: MemberListItem,
      initialServiceType: Plan["service_type"] = "gym",
    ) => {
      setSelected(member);
      setMemberProfile(profileDraft(member));
      setEditingSubscriptionId(null);
      setConfirmCancelSubscriptionId(null);
      setActiveServiceType(initialServiceType);
      const preferredPlan = plans.find(
        (plan) => plan.is_active && plan.service_type === initialServiceType,
      );
      if (preferredPlan) setPlanId(preferredPlan.id);
      if (profileMode) setProfileTab("informations");
      setBusy(true);
      setFeedback(null);
      const requestHeaders = authorizationHeaders(session.accessToken);
      const [subscriptionResult, receiptResult, attendanceResult] =
        await Promise.all([
          api.GET("/api/v1/members/{member_id}/subscriptions", {
            headers: requestHeaders,
            params: { path: { member_id: member.id } },
          }),
          api.GET("/api/v1/payments/members/{member_id}/receipts", {
            headers: requestHeaders,
            params: { path: { member_id: member.id } },
          }),
          api.GET("/api/v1/attendance/members/{member_id}", {
            headers: requestHeaders,
            params: { path: { member_id: member.id }, query: { limit: 100 } },
          }),
        ]);
      setSubscriptions(subscriptionResult.data ?? []);
      setReceipts(receiptResult.data ?? []);
      setAttendance(attendanceResult.data ?? []);
      setBusy(false);
    },
    [plans, profileMode, session.accessToken],
  );

  const loadMembers = useCallback(
    async (searchQuery: string) => {
      setMemberListLoading(true);
      const result = await api.GET("/api/v1/members/subscription-summaries", {
        headers: authorizationHeaders(session.accessToken),
        params: {
          query: {
            query: searchQuery.trim() || undefined,
            limit: 500,
          },
        },
      });
      const loadedMembers = [...(result.data ?? [])];
      if (mode !== "payments") {
        loadedMembers.sort((first, second) =>
          first.full_name.localeCompare(second.full_name, "fr", {
            sensitivity: "base",
          }),
        );
      }
      setMembers(loadedMembers);
      if (
        mode === "payments" &&
        requestedMemberId &&
        requestedMemberHandledRef.current !== requestedMemberId
      ) {
        const requestedMember = loadedMembers.find(
          (member) => member.id === requestedMemberId,
        );
        if (requestedMember) {
          requestedMemberHandledRef.current = requestedMemberId;
          void loadMemberData(requestedMember, requestedServiceType ?? "gym");
        }
      }
      setSelected((current) => {
        if (!current) return current;
        return (
          loadedMembers.find((member) => member.id === current.id) ?? current
        );
      });
      setFeedback(
        result.error ? "Impossible de charger la liste des membres." : null,
      );
      setMemberListLoading(false);
    },
    [
      loadMemberData,
      mode,
      requestedMemberId,
      requestedServiceType,
      session.accessToken,
    ],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => void loadMembers(query),
      query.trim() ? 250 : 0,
    );
    return () => window.clearTimeout(timeoutId);
  }, [loadMembers, query]);

  async function loadMember(member: MemberListItem) {
    await loadMemberData(member);
  }

  async function updateMemberProfile() {
    if (!selected || !memberProfile || session.user.role !== "admin") return;
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH("/api/v1/users/{user_id}/member-profile", {
      headers,
      params: { path: { user_id: selected.id } },
      body: {
        full_name: memberProfile.full_name,
        phone: memberProfile.phone,
        email: memberProfile.email || null,
        date_of_birth: memberProfile.date_of_birth || null,
        gender: memberProfile.gender,
        reason: profileReason,
      },
    });
    setBusy(false);
    if (!result.data) {
      setFeedback(
        "Les informations n'ont pas pu etre modifiees. Verifiez le telephone et les champs obligatoires.",
      );
      return;
    }
    const updatedMember: MemberListItem = {
      ...selected,
      full_name: result.data.full_name,
      phone: result.data.phone,
      email: result.data.email,
      date_of_birth: result.data.date_of_birth,
      gender: result.data.gender === "female" ? "female" : "male",
      account_status: result.data.status,
      created_at: result.data.created_at,
    };
    setSelected(updatedMember);
    setMemberProfile(profileDraft(updatedMember));
    setMembers((current) =>
      current.map((member) =>
        member.id === updatedMember.id ? updatedMember : member,
      ),
    );
    setFeedback("Informations du membre mises a jour.");
  }

  async function checkIn() {
    if (!selected || !normalAccessAvailable) return;
    setBusy(true);
    setFeedback(null);
    const result = await api.POST("/api/v1/attendance/check-ins", {
      headers,
      body: {
        member_id: selected.id,
        exceptional_access_reason: null,
      },
    });
    setBusy(false);
    if (result.data) {
      await loadMember(selected);
      setFeedback("Entree enregistree.");
    } else {
      setFeedback("Cette entree ne peut pas etre enregistree.");
    }
  }

  async function recordPayment() {
    if (!selected || !selectedPlan) return;
    setBusy(true);
    setFeedback(null);
    const result = await api.POST("/api/v1/payments/memberships", {
      headers,
      body: {
        idempotency_key: crypto.randomUUID(),
        member_id: selected.id,
        plan_id: selectedPlan.id,
        starts_on: startsOn || null,
        method,
        bank_transfer_reference: null,
      },
    });
    setBusy(false);
    if (result.data) {
      setFeedback("Paiement et abonnement enregistrés.");
      await loadMember(selected);
      await loadMembers(query);
    } else {
      setFeedback(
        "Paiement refusé. Si l’ancien abonnement est expiré, choisissez une date de début.",
      );
    }
  }

  async function updateSubscriptionStatus(
    subscriptionId: string,
    status: Subscription["status"],
    reason = statusReason,
  ) {
    setBusy(true);
    const result = await api.PATCH(
      "/api/v1/subscriptions/{subscription_id}/status",
      {
        headers,
        params: { path: { subscription_id: subscriptionId } },
        body: { status, reason },
      },
    );
    setFeedback(
      result.data
        ? "Statut de l’abonnement mis à jour."
        : "Le statut n’a pas pu être modifié.",
    );
    setBusy(false);
    if (result.data && selected) {
      setEditingSubscriptionId(null);
      setConfirmCancelSubscriptionId(null);
      await loadMember(selected);
      await loadMembers(query);
    }
  }

  async function cancelSubscription(subscription: Subscription) {
    await updateSubscriptionStatus(
      subscription.id,
      "cancelled",
      "Annulation depuis la page Paiements",
    );
  }

  async function updateSubscriptionDates(
    subscriptionId: string,
    startsOnValue: string,
    reason: string,
  ) {
    if (!startsOnValue) return;
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH(
      "/api/v1/subscriptions/{subscription_id}/dates",
      {
        headers,
        params: { path: { subscription_id: subscriptionId } },
        body: { starts_on: startsOnValue, reason },
      },
    );
    setBusy(false);
    if (result.data && selected) {
      await loadMember(selected);
      await loadMembers(query);
      setFeedback("Date de debut et date de fin mises a jour.");
    } else {
      setFeedback("La date de debut n'a pas pu etre modifiee.");
    }
  }

  async function saveSubscriptionChanges(subscription: Subscription) {
    const currentStatus = subscription.status;
    const nextStatus = statusDrafts[subscription.id] ?? currentStatus;
    const nextStartsOn = dateDrafts[subscription.id] ?? subscription.starts_on;
    const statusChanged = nextStatus !== currentStatus;
    const dateChanged = nextStartsOn !== subscription.starts_on;

    if (!statusChanged && !dateChanged) {
      setFeedback("Aucune modification a enregistrer.");
      return;
    }
    if (statusReason.trim().length < 3) {
      setFeedback("Ajoutez un motif avant d'enregistrer les modifications.");
      return;
    }

    if (statusChanged) {
      await updateSubscriptionStatus(
        subscription.id,
        nextStatus,
        statusReason.trim(),
      );
    }
    if (dateChanged && !["cancelled", "expired"].includes(nextStatus)) {
      await updateSubscriptionDates(
        subscription.id,
        nextStartsOn,
        statusReason.trim(),
      );
    }
  }

  async function startSelectedToday() {
    if (!selected?.subscription_id) return;
    await updateSubscriptionDates(
      selected.subscription_id,
      todayInputValue(),
      "Le membre commence son abonnement aujourd'hui",
    );
  }

  async function loadEvents(subscriptionId: string) {
    const result = await api.GET(
      "/api/v1/subscriptions/{subscription_id}/events",
      { headers, params: { path: { subscription_id: subscriptionId } } },
    );
    setEvents((current) => ({
      ...current,
      [subscriptionId]: result.data ?? [],
    }));
  }

  const listDescription =
    mode === "payments"
      ? "Liste classee automatiquement par priorite de renouvellement."
      : mode === "access"
        ? "Membres classes par nom. Choisissez un membre pour enregistrer son entree."
        : "La liste est affichee directement. Filtrez-la ou choisissez un membre pour ouvrir son dossier.";
  const selectedPlan =
    plans.find((plan) => plan.id === planId) ??
    plans.find((plan) => plan.is_active);
  const selectedServiceSubscription = selectedPlan
    ? subscriptions.find(
        (subscription) =>
          subscription.service_type === selectedPlan.service_type &&
          !["suspended", "expired", "cancelled"].includes(
            subscription.effective_status ?? subscription.status,
          ),
      )
    : undefined;
  const paymentAvailable = Boolean(
    selectedPlan && !selectedServiceSubscription,
  );
  const selectedStatus = selected
    ? (selected.effective_status ?? selected.status)
    : null;
  const selectedStartsLater = selected
    ? hasScheduledSubscription(selected)
    : false;
  const normalAccessAvailable =
    !selectedStartsLater &&
    (selectedStatus === "active" || selectedStatus === "expiring_soon");
  const accessGuidance = selectedStartsLater
    ? {
        title: "Abonnement a venir",
        text: `L'abonnement commence le ${formatDate(selected?.starts_on ?? "")}. Si le membre commence maintenant, utilisez le bouton ci-dessous.`,
        className: "border-amber-300/25 bg-amber-300/[0.06] text-amber-100",
      }
    : normalAccessAvailable
      ? {
          title: "Entree possible",
          text: "L'abonnement est valide aujourd'hui. Enregistrez simplement l'entree.",
          className:
            "border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-100",
        }
      : {
          title: "Abonnement non valide",
          text: "Passez par la page Paiements pour creer ou renouveler l'abonnement avant d'enregistrer une entree.",
          className: "border-red-300/20 bg-red-300/[0.05] text-red-100",
        };

  return (
    <div className="space-y-5">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      <div>
        <div
          className={`grid gap-3 ${profileMode ? "lg:grid-cols-[minmax(0,1fr)_220px_220px]" : ""}`}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              aria-label="Rechercher un membre"
              className="pl-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher par nom, telephone ou numero membre"
            />
          </div>
          {profileMode ? (
            <select
              aria-label="Filtrer les membres"
              className={selectClass}
              value={memberFilter}
              onChange={(event) =>
                setMemberFilter(event.target.value as MemberFilter)
              }
            >
              {Object.entries(memberFilterLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : null}
          {profileMode ? (
            <select
              aria-label="Classer les membres"
              className={selectClass}
              value={memberSort}
              onChange={(event) =>
                setMemberSort(event.target.value as MemberSort)
              }
            >
              <option value="priority">Priorite abonnement</option>
              <option value="name">Ordre alphabetique</option>
              <option value="newest">Nouveaux membres</option>
            </select>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <p>{listDescription}</p>
          <p className="font-bold text-gray-400">
            {visibleMembers.length} membre(s) affiche(s)
          </p>
        </div>
      </div>

      {memberListLoading ? (
        <p className="text-sm text-gray-500">Chargement des membres...</p>
      ) : null}

      {visibleMembers.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleMembers.map((member) => (
            <button
              type="button"
              key={member.id}
              onClick={() => loadMember(member)}
              className={`rounded-sm border p-4 text-left transition ${selected?.id === member.id ? "border-primary bg-primary/10" : "border-white/10 bg-black/20 hover:border-primary/50 hover:bg-white/[0.03]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-white">
                    {member.full_name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {member.member_number}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.06em] ${
                    mode === "payments"
                      ? paymentBadgeClass(member)
                      : memberStatusClass(member)
                  }`}
                >
                  {mode === "payments"
                    ? paymentBadgeLabel(member)
                    : memberStatusLabel(member)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 border-t border-white/10 pt-3 text-xs sm:grid-cols-2">
                <div>
                  <p className="uppercase tracking-[0.08em] text-gray-600">
                    Telephone
                  </p>
                  <p className="mt-1 font-bold text-gray-300">{member.phone}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.08em] text-gray-600">
                    Abonnement
                  </p>
                  <p className="mt-1 font-bold text-gray-300">
                    {member.plan_name ?? "Aucun abonnement"}
                  </p>
                  {member.ends_on ? (
                    <p className="mt-1 text-gray-500">
                      Fin prevue : {formatDate(member.ends_on)}
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : !memberListLoading ? (
        <EmptyState text="Aucun membre ne correspond a ce filtre." />
      ) : null}

      {selected ? (
        <div className="space-y-6 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-black text-white">
                {selected.full_name}
              </p>
              <p className="text-sm text-gray-500">{selected.member_number}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${memberStatusClass(selected)}`}
              >
                {memberStatusLabel(selected)}
              </span>
              <Pill>Dossier membre</Pill>
            </div>
          </div>

          {showPayments ? (
            <Card
              className="border-primary/25 bg-primary/[0.035] p-5 sm:p-6"
              data-testid="new-payment-card"
            >
              <div className="border-b border-white/10 pb-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                  Encaissement
                </p>
                <h3 className="mt-2 text-xl font-black uppercase text-white">
                  Nouveau paiement / renouvellement
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Choisissez la categorie, la formule et la date de debut de
                  l&apos;abonnement.
                </p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Formule">
                  <select
                    className={selectClass}
                    value={selectedPlan?.id ?? ""}
                    onChange={(event) => {
                      const nextPlan = plans.find(
                        (plan) => plan.id === event.target.value,
                      );
                      setPlanId(event.target.value);
                      if (nextPlan) setActiveServiceType(nextPlan.service_type);
                    }}
                  >
                    {serviceTypes.map((serviceType) => {
                      const categoryPlans = plans.filter(
                        (plan) =>
                          plan.is_active && plan.service_type === serviceType,
                      );
                      return categoryPlans.length ? (
                        <optgroup
                          key={serviceType}
                          label={serviceTypeLabels[serviceType]}
                        >
                          {categoryPlans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} · {plan.price} {plan.currency}
                            </option>
                          ))}
                        </optgroup>
                      ) : null;
                    })}
                  </select>
                </Field>
                <Field label="Date de debut de l'abonnement">
                  <Input
                    type="date"
                    value={startsOn}
                    onChange={(event) => setStartsOn(event.target.value)}
                  />
                  <span className="block text-[11px] font-normal normal-case tracking-normal text-gray-600">
                    Le calcul de l&apos;abonnement commence a cette date.
                  </span>
                </Field>
                <Field label="Paiement">
                  <select
                    className={selectClass}
                    value={method}
                    onChange={(event) =>
                      setMethod(event.target.value as PaymentMethod)
                    }
                  >
                    <option value="cash">Especes</option>
                    <option value="bank_card">Carte</option>
                  </select>
                </Field>
              </div>
              {paymentAvailable ? (
                <Button
                  className="mt-5"
                  onClick={recordPayment}
                  disabled={busy || !selectedPlan}
                >
                  <CreditCard className="h-4 w-4" /> Enregistrer et generer le
                  recu
                </Button>
              ) : (
                <div className="mt-5 rounded-sm border border-emerald-300/20 bg-emerald-300/[0.04] p-4">
                  <p className="text-sm font-black uppercase text-emerald-200">
                    Abonnement{" "}
                    {selectedPlan
                      ? serviceTypeLabels[selectedPlan.service_type]
                      : ""}{" "}
                    encore valide
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Choisissez une autre categorie, ou attendez que cet
                    abonnement soit expire, suspendu ou annule.
                  </p>
                  {selectedServiceSubscription?.ends_on ? (
                    <p className="mt-2 text-sm font-bold text-emerald-200">
                      Fin prevue :{" "}
                      {formatDate(selectedServiceSubscription.ends_on)}
                    </p>
                  ) : null}
                </div>
              )}
            </Card>
          ) : null}

          {profileMode ? (
            <nav
              aria-label="Sections du dossier membre"
              className="grid gap-2 rounded-sm border border-white/10 bg-black/20 p-2 sm:grid-cols-4"
            >
              {(
                [
                  ["informations", "Informations", UserRound],
                  ["subscriptions", "Abonnements", CalendarDays],
                  ["receipts", "Recus", ReceiptText],
                  ["attendance", "Entrees", Activity],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setProfileTab(value)}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-sm px-3 text-xs font-black uppercase tracking-[0.08em] transition ${
                    profileTab === value
                      ? "bg-primary text-black"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </nav>
          ) : null}

          {profileMode && profileTab === "informations" && memberProfile ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
              <Card className="p-5">
                <h3 className="font-black uppercase text-white">
                  Informations personnelles
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {canEditMemberProfile
                    ? "Modifiez uniquement les informations confirmees avec le membre."
                    : "Consultez les informations confirmees du membre."}
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Nom complet">
                    <Input
                      disabled={!canEditMemberProfile}
                      value={memberProfile.full_name}
                      onChange={(event) =>
                        setMemberProfile((current) =>
                          current
                            ? { ...current, full_name: event.target.value }
                            : current,
                        )
                      }
                    />
                  </Field>
                  <Field label="Telephone">
                    <Input
                      disabled={!canEditMemberProfile}
                      value={memberProfile.phone}
                      onChange={(event) =>
                        setMemberProfile((current) =>
                          current
                            ? { ...current, phone: event.target.value }
                            : current,
                        )
                      }
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      disabled={!canEditMemberProfile}
                      value={memberProfile.email}
                      onChange={(event) =>
                        setMemberProfile((current) =>
                          current
                            ? { ...current, email: event.target.value }
                            : current,
                        )
                      }
                    />
                  </Field>
                  <Field label="Date de naissance">
                    <Input
                      type="date"
                      disabled={!canEditMemberProfile}
                      value={memberProfile.date_of_birth}
                      onChange={(event) =>
                        setMemberProfile((current) =>
                          current
                            ? {
                                ...current,
                                date_of_birth: event.target.value,
                              }
                            : current,
                        )
                      }
                    />
                  </Field>
                  <Field label="Genre">
                    <select
                      className={selectClass}
                      disabled={!canEditMemberProfile}
                      value={memberProfile.gender}
                      onChange={(event) =>
                        setMemberProfile((current) =>
                          current
                            ? {
                                ...current,
                                gender: event.target.value as "female" | "male",
                              }
                            : current,
                        )
                      }
                    >
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                    </select>
                  </Field>
                  {canEditMemberProfile ? (
                    <Field label="Motif de modification">
                      <Input
                        value={profileReason}
                        onChange={(event) =>
                          setProfileReason(event.target.value)
                        }
                      />
                    </Field>
                  ) : null}
                </div>
                {canEditMemberProfile ? (
                  <Button
                    className="mt-5"
                    onClick={updateMemberProfile}
                    disabled={
                      busy ||
                      memberProfile.full_name.trim().length < 2 ||
                      !memberProfile.phone.trim() ||
                      profileReason.trim().length < 3
                    }
                  >
                    <Save className="h-4 w-4" /> Enregistrer les modifications
                  </Button>
                ) : null}
              </Card>
              <Card className="p-5">
                <h3 className="font-black uppercase text-white">
                  Resume du dossier
                </h3>
                <dl className="mt-5 space-y-4 text-sm">
                  <div className="border-b border-white/10 pb-3">
                    <dt className="text-xs uppercase tracking-[0.08em] text-gray-600">
                      Numero membre
                    </dt>
                    <dd className="mt-1 font-bold text-white">
                      {selected.member_number}
                    </dd>
                  </div>
                  <div className="border-b border-white/10 pb-3">
                    <dt className="text-xs uppercase tracking-[0.08em] text-gray-600">
                      Compte
                    </dt>
                    <dd className="mt-1 font-bold text-white">
                      {statusLabels[selected.account_status] ??
                        selected.account_status}
                    </dd>
                  </div>
                  <div className="border-b border-white/10 pb-3">
                    <dt className="text-xs uppercase tracking-[0.08em] text-gray-600">
                      Abonnement actuel
                    </dt>
                    <dd className="mt-1 font-bold text-white">
                      {selected.plan_name ?? "Aucun abonnement"}
                    </dd>
                  </div>
                  <div className="border-b border-white/10 pb-3">
                    <dt className="text-xs uppercase tracking-[0.08em] text-gray-600">
                      Fin prevue
                    </dt>
                    <dd className="mt-1 font-bold text-white">
                      {selected.ends_on
                        ? formatDate(selected.ends_on)
                        : "Non disponible"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.08em] text-gray-600">
                      Inscrit le
                    </dt>
                    <dd className="mt-1 font-bold text-white">
                      {formatDate(selected.created_at)}
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>
          ) : null}

          {showAccess ? (
            <Card className="p-5">
              <h3 className="font-black uppercase text-white">
                Enregistrer une entree
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Le bouton est disponible quand l&apos;abonnement a commence et
                reste valide.
              </p>
              <div
                className={`mt-4 rounded-sm border p-4 ${accessGuidance.className}`}
              >
                <p className="text-xs font-black uppercase tracking-[0.1em]">
                  {accessGuidance.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  {accessGuidance.text}
                </p>
              </div>
              <div className="mt-4">
                {selectedStartsLater ? (
                  <Button onClick={startSelectedToday} disabled={busy}>
                    Commencer l&apos;abonnement aujourd&apos;hui
                  </Button>
                ) : null}
                {normalAccessAvailable ? (
                  <Button onClick={checkIn} disabled={busy}>
                    <Activity className="h-4 w-4" /> Enregistrer l&apos;entree
                  </Button>
                ) : null}
                {!selectedStartsLater && !normalAccessAvailable ? (
                  <p className="text-sm font-bold text-red-200">
                    Entree indisponible tant que l&apos;abonnement n&apos;est
                    pas valide.
                  </p>
                ) : null}
              </div>
            </Card>
          ) : null}

          {showSubscriptions || showReceipts ? (
            <nav
              aria-label="Categories du dossier commercial"
              role="tablist"
              className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-2 md:grid-cols-3"
            >
              {serviceTypes.map((serviceType) => {
                const subscriptionCount = subscriptions.filter(
                  (subscription) => subscription.service_type === serviceType,
                ).length;
                const receiptCount = receipts.filter(
                  (receipt) => receipt.service_type === serviceType,
                ).length;
                return (
                  <button
                    key={serviceType}
                    type="button"
                    role="tab"
                    aria-selected={activeServiceType === serviceType}
                    onClick={() => {
                      setActiveServiceType(serviceType);
                      const firstPlan = plans.find(
                        (plan) =>
                          plan.is_active && plan.service_type === serviceType,
                      );
                      if (firstPlan) setPlanId(firstPlan.id);
                    }}
                    className={`rounded-md border px-4 py-4 text-left transition ${
                      activeServiceType === serviceType
                        ? "border-primary/50 bg-primary/10 text-white"
                        : "border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                    }`}
                  >
                    <span className="block text-sm font-black uppercase tracking-[0.08em]">
                      {serviceTypeLabels[serviceType]}
                    </span>
                    <span className="mt-1 block text-xs font-bold text-gray-500">
                      {subscriptionCount} abonnement
                      {subscriptionCount === 1 ? "" : "s"} · {receiptCount} recu
                      {receiptCount === 1 ? "" : "s"}
                    </span>
                  </button>
                );
              })}
            </nav>
          ) : null}

          {showSubscriptions ? (
            <section>
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                  Dossier commercial
                </p>
                <h3 className="mt-2 text-xl font-black uppercase text-white">
                  Abonnements · {serviceTypeLabels[activeServiceType]}
                </h3>
              </div>
              <div className="grid gap-4">
                {serviceTypes
                  .filter((serviceType) => serviceType === activeServiceType)
                  .map((serviceType) => {
                    const categorySubscriptions = subscriptions.filter(
                      (subscription) =>
                        subscription.service_type === serviceType,
                    );
                    return (
                      <div
                        key={serviceType}
                        data-testid={`subscription-category-${serviceType}`}
                        className="rounded-lg border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-2 pb-3">
                          <h4 className="text-sm font-black uppercase tracking-[0.08em] text-white">
                            {serviceTypeLabels[serviceType]}
                          </h4>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                            {categorySubscriptions.length}
                          </span>
                        </div>
                        <div className="mt-3 space-y-3">
                          {categorySubscriptions.length ? (
                            categorySubscriptions.map((subscription) => (
                              <Card key={subscription.id} className="p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <Pill>
                                      {
                                        serviceTypeLabels[
                                          subscription.service_type
                                        ]
                                      }
                                    </Pill>
                                    <p className="font-black text-white">
                                      {subscription.plan_name}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500">
                                      Abonnement du{" "}
                                      {formatDate(subscription.starts_on)} au{" "}
                                      {formatDate(subscription.ends_on)}
                                    </p>
                                    <Pill className="mt-3">
                                      {statusLabels[
                                        subscription.effective_status ??
                                          subscription.status
                                      ] ?? subscription.status}
                                    </Pill>
                                  </div>
                                  {canManageSubscriptions ? (
                                    <Button
                                      variant="outline"
                                      aria-label={`Modifier l'abonnement ${subscription.plan_name}`}
                                      onClick={() => {
                                        setEditingSubscriptionId((current) =>
                                          current === subscription.id
                                            ? null
                                            : subscription.id,
                                        );
                                        setStatusDrafts((current) => ({
                                          ...current,
                                          [subscription.id]:
                                            subscription.status,
                                        }));
                                        setDateDrafts((current) => ({
                                          ...current,
                                          [subscription.id]:
                                            subscription.starts_on,
                                        }));
                                        setConfirmCancelSubscriptionId(null);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" /> Modifier
                                    </Button>
                                  ) : (
                                    <Link
                                      href={`${session.user.role === "admin" ? "/espace/admin/paiements" : "/espace/reception/paiements"}?membre=${selected?.id ?? subscription.member_id}&categorie=${subscription.service_type}`}
                                      className={buttonStyles({
                                        variant: "outline",
                                      })}
                                    >
                                      <CreditCard className="h-4 w-4" /> Gerer
                                      l&apos;abonnement
                                    </Link>
                                  )}
                                </div>
                                {editingSubscriptionId === subscription.id ? (
                                  <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                                    <Field label="Statut">
                                      <select
                                        aria-label={`Statut de ${subscription.plan_name}`}
                                        className={selectClass}
                                        value={
                                          statusDrafts[subscription.id] ??
                                          subscription.status
                                        }
                                        onChange={(event) =>
                                          setStatusDrafts((current) => ({
                                            ...current,
                                            [subscription.id]: event.target
                                              .value as Subscription["status"],
                                          }))
                                        }
                                        disabled={busy}
                                      >
                                        <option value="active">Actif</option>
                                        <option value="suspended">
                                          Suspendu
                                        </option>
                                        <option value="expired">Expire</option>
                                      </select>
                                    </Field>
                                    <Field label="Motif de modification">
                                      <Input
                                        value={statusReason}
                                        onChange={(event) =>
                                          setStatusReason(event.target.value)
                                        }
                                      />
                                    </Field>
                                    <div className="sm:col-span-2">
                                      <Button
                                        variant="outline"
                                        onClick={() =>
                                          loadEvents(subscription.id)
                                        }
                                      >
                                        <History className="h-4 w-4" />{" "}
                                        Historique
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}
                                {editingSubscriptionId === subscription.id &&
                                !["cancelled", "expired"].includes(
                                  subscription.effective_status ??
                                    subscription.status,
                                ) ? (
                                  <div className="mt-4 border-t border-white/10 pt-4 sm:max-w-sm">
                                    <Field label="Date de debut">
                                      <Input
                                        type="date"
                                        value={
                                          dateDrafts[subscription.id] ??
                                          subscription.starts_on
                                        }
                                        onChange={(event) =>
                                          setDateDrafts((current) => ({
                                            ...current,
                                            [subscription.id]:
                                              event.target.value,
                                          }))
                                        }
                                      />
                                    </Field>
                                  </div>
                                ) : null}
                                {editingSubscriptionId === subscription.id ? (
                                  <div className="mt-4 border-t border-white/10 pt-4">
                                    <Button
                                      onClick={() =>
                                        void saveSubscriptionChanges(
                                          subscription,
                                        )
                                      }
                                      disabled={
                                        busy || statusReason.trim().length < 3
                                      }
                                    >
                                      <Save className="h-4 w-4" /> Enregistrer
                                      les modifications
                                    </Button>
                                  </div>
                                ) : null}
                                {editingSubscriptionId === subscription.id &&
                                (subscription.effective_status ??
                                  subscription.status) !== "cancelled" ? (
                                  <div className="mt-4 border-t border-white/10 pt-4">
                                    {confirmCancelSubscriptionId ===
                                    subscription.id ? (
                                      <div className="rounded-sm border border-red-400/20 bg-red-400/[0.05] p-3">
                                        <p className="text-xs leading-5 text-red-200">
                                          L&apos;abonnement sera annule. Les
                                          recus restent conserves dans
                                          l&apos;historique de caisse.
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          <Button
                                            variant="outline"
                                            onClick={() =>
                                              setConfirmCancelSubscriptionId(
                                                null,
                                              )
                                            }
                                          >
                                            Retour
                                          </Button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void cancelSubscription(
                                                subscription,
                                              )
                                            }
                                            disabled={busy}
                                            className="min-h-11 rounded-sm bg-red-500 px-4 text-xs font-black uppercase tracking-[0.08em] text-white disabled:opacity-50"
                                          >
                                            Confirmer l&apos;annulation
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmCancelSubscriptionId(
                                            subscription.id,
                                          )
                                        }
                                        className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-red-400/25 px-4 text-xs font-black uppercase tracking-[0.08em] text-red-300 transition hover:bg-red-400/10"
                                      >
                                        <Trash2 className="h-4 w-4" /> Annuler
                                      </button>
                                    )}
                                  </div>
                                ) : null}
                                {events[subscription.id] ? (
                                  <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                                    {events[subscription.id].map((event) => (
                                      <p
                                        key={event.id}
                                        className="text-xs text-gray-400"
                                      >
                                        {formatDate(event.created_at)} ·{" "}
                                        {event.event_type} ·{" "}
                                        {statusLabels[event.new_status] ??
                                          event.new_status}
                                      </p>
                                    ))}
                                  </div>
                                ) : null}
                              </Card>
                            ))
                          ) : (
                            <EmptyState
                              text={`Aucun abonnement ${serviceTypeLabels[serviceType]}.`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          ) : null}

          {showReceipts || showAttendance ? (
            <div className="space-y-6">
              {showReceipts ? (
                <section>
                  <div className="mb-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                      Historique de caisse
                    </p>
                    <h3 className="mt-2 text-xl font-black uppercase text-white">
                      Recus · {serviceTypeLabels[activeServiceType]}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Affichage separe pour eviter de melanger les paiements.
                    </p>
                  </div>
                  <div className="grid gap-4">
                    {serviceTypes
                      .filter(
                        (serviceType) => serviceType === activeServiceType,
                      )
                      .map((serviceType) => {
                        const categoryReceipts = receipts.filter(
                          (receipt) => receipt.service_type === serviceType,
                        );
                        return (
                          <div
                            key={serviceType}
                            data-testid={`receipt-category-${serviceType}`}
                            className="rounded-lg border border-white/10 bg-black/20 p-4"
                          >
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-2 pb-3">
                              <h4 className="text-sm font-black uppercase tracking-[0.08em] text-white">
                                {serviceTypeLabels[serviceType]}
                              </h4>
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                                {categoryReceipts.length}
                              </span>
                            </div>
                            <div className="mt-3 space-y-3">
                              {categoryReceipts.length ? (
                                categoryReceipts.map((receipt) => (
                                  <ReceiptSummary
                                    key={receipt.receipt_id}
                                    receipt={receipt}
                                  />
                                ))
                              ) : (
                                <EmptyState
                                  text={`Aucun recu ${serviceTypeLabels[serviceType]}.`}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </section>
              ) : null}
              {showAttendance ? (
                <section>
                  <h3 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-white">
                    Historique des entrees
                  </h3>
                  <p className="mb-3 text-xs leading-5 text-gray-500">
                    Hna kaybano ghir les passages li tsajlo b date w sa3a.
                  </p>
                  <div className="space-y-2">
                    {attendance.length ? (
                      attendance.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 rounded-sm border border-white/10 bg-black/20 p-4"
                        >
                          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-gray-500">
                              Entree enregistree
                            </p>
                            <p className="mt-1 text-sm font-bold text-white">
                              {formatDate(entry.checked_in_at)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {statusLabels[entry.decision] ?? entry.decision}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Abonnement lors du passage :{" "}
                              {statusLabels[
                                entry.subscription_status_at_entry
                              ] ?? entry.subscription_status_at_entry}
                            </p>
                            {entry.exceptional_access_reason ? (
                              <p className="mt-2 text-xs text-primary">
                                Motif : {entry.exceptional_access_reason}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="Aucune entree enregistree." />
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

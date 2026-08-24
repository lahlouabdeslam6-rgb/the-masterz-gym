"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  MessageSquareText,
  ReceiptText,
  ShoppingBag,
  UserRound,
  Waves,
} from "lucide-react";
import { Card, Pill } from "@masterz/ui";
import type { AuthSession } from "@/lib/auth";
import { ReceiptSummary } from "./ApplicationManager";
import { CoachingTrackingPanel } from "./CoachingTrackingPanel";
import { CoachingScheduleManager } from "./CoachingScheduleManager";
import { MemberCoachingAssignmentRequest } from "./CoachingAssignmentRequests";
import { MemberRecoveryPanel } from "./RecoveryManager";
import { MemberNotifications } from "./MemberNotifications";
import { ComplaintCenter } from "./ComplaintCenter";
import { MemberStoreManager } from "./StoreManager";
import {
  type Attendance,
  type Receipt,
  type Subscription,
  type User,
  EmptyState,
  Info,
  Panel,
  formatDate,
  statusLabels,
} from "./dashboard-shared";

type MemberSection =
  | "overview"
  | "notifications"
  | "profile"
  | "subscriptions"
  | "receipts"
  | "attendance"
  | "coaching"
  | "recovery"
  | "store"
  | "complaints";

const memberSections: Array<{
  id: MemberSection;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    description: "Resume de votre espace",
    icon: LayoutDashboard,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alertes importantes",
    icon: Bell,
  },
  {
    id: "profile",
    label: "Mon profil",
    description: "Informations personnelles",
    icon: UserRound,
  },
  {
    id: "subscriptions",
    label: "Abonnements",
    description: "Formules et validite",
    icon: CalendarDays,
  },
  {
    id: "receipts",
    label: "Recus",
    description: "Historique des paiements",
    icon: ReceiptText,
  },
  {
    id: "attendance",
    label: "Presences",
    description: "Passages a la salle",
    icon: CalendarCheck,
  },
  {
    id: "coaching",
    label: "Coaching",
    description: "Objectifs et progression",
    icon: Dumbbell,
  },
  {
    id: "recovery",
    label: "Recovery",
    description: "Seances et passages",
    icon: Waves,
  },
  {
    id: "store",
    label: "Store",
    description: "Produits et reservations",
    icon: ShoppingBag,
  },
  {
    id: "complaints",
    label: "Reclamations",
    description: "Messages avec l'equipe",
    icon: MessageSquareText,
  },
];

export function MemberDashboard({
  session,
  user,
  subscriptions,
  receipts,
  attendance,
}: {
  session: AuthSession;
  user: User;
  subscriptions: Subscription[];
  receipts: Receipt[];
  attendance: Attendance[];
}) {
  const [activeSection, setActiveSection] = useState<MemberSection>("overview");
  const section =
    memberSections.find((item) => item.id === activeSection) ??
    memberSections[0];
  const SectionIcon = section.icon;
  const hasActiveCoaching = subscriptions.some(
    (subscription) =>
      subscription.service_type === "coaching" &&
      ["active", "expiring_soon"].includes(
        subscription.effective_status ?? subscription.status,
      ),
  );

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-lg border border-white/10 bg-[#081119]/95 shadow-2xl lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="border-b border-white/10 bg-primary/[0.07] p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-black">
            <UserRound className="h-5 w-5" />
          </div>
          <p className="mt-4 font-black uppercase text-white">
            {user.full_name}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {user.member_number ?? "Numero membre non attribue"}
          </p>
        </div>

        <nav
          aria-label="Navigation espace membre"
          className="hidden space-y-1 p-3 lg:block"
        >
          {memberSections.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition ${
                  isActive
                    ? "border-primary/35 bg-primary/[0.1] text-white"
                    : "border-transparent text-gray-500 hover:bg-white/[0.04] hover:text-white"
                }`}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-primary" : "text-gray-600"
                  }`}
                />
                <span className="block min-w-0 truncate text-sm font-black">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <label className="block p-4 lg:hidden">
          <span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.14em] text-gray-500">
            Choisir une rubrique
          </span>
          <select
            aria-label="Rubrique espace membre"
            value={activeSection}
            onChange={(event) =>
              setActiveSection(event.target.value as MemberSection)
            }
            className="h-12 w-full rounded-sm border border-white/15 bg-[#050a0f] px-3 text-sm font-bold text-white outline-none focus:border-primary"
          >
            {memberSections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
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
                Espace membre
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
          {activeSection === "overview" ? (
            <MemberOverview
              subscriptions={subscriptions}
              receipts={receipts}
              attendance={attendance}
              onNavigate={setActiveSection}
            />
          ) : null}
          {activeSection === "notifications" ? (
            <Panel
              title="Mes notifications"
              subtitle="Les alertes importantes concernant vos abonnements, vos packs et vos reservations."
            >
              <MemberNotifications session={session} />
            </Panel>
          ) : null}
          {activeSection === "profile" ? <ProfilePanel user={user} /> : null}
          {activeSection === "subscriptions" ? (
            <SubscriptionsPanel subscriptions={subscriptions} />
          ) : null}
          {activeSection === "receipts" ? (
            <ReceiptsPanel receipts={receipts} />
          ) : null}
          {activeSection === "attendance" ? (
            <AttendancePanel attendance={attendance} />
          ) : null}
          {activeSection === "coaching" ? (
            <MemberCoachingAssignmentRequest
              session={session}
              hasActiveCoaching={hasActiveCoaching}
            >
              <Panel
                title="Mes seances coaching"
                subtitle="Choisissez un horaire propose par votre coach et suivez sa confirmation."
              >
                <CoachingScheduleManager session={session} mode="member" />
              </Panel>
              <Panel
                title="Ma progression coaching"
                subtitle="Votre objectif, vos tests et leur historique, sans modifier les donnees saisies par votre coach."
              >
                <CoachingTrackingPanel session={session} memberId={user.id} />
              </Panel>
            </MemberCoachingAssignmentRequest>
          ) : null}
          {activeSection === "recovery" ? (
            <Panel
              title="Mon pack recovery"
              subtitle="Vos seances sauna, bain froid et compression, avec le solde et l'historique des passages."
            >
              <MemberRecoveryPanel session={session} memberId={user.id} />
            </Panel>
          ) : null}
          {activeSection === "store" ? (
            <Panel
              title="Masterz Store"
              subtitle="Consultez les produits disponibles, reservez-les et suivez leur validation par la Reception."
            >
              <MemberStoreManager session={session} />
            </Panel>
          ) : null}
          {activeSection === "complaints" ? (
            <Panel
              title="Mes reclamations"
              subtitle="Ecrivez a la Reception ou a l'Administration et suivez les reponses dans la meme conversation."
            >
              <ComplaintCenter session={session} mode="member" />
            </Panel>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function MemberOverview({
  subscriptions,
  receipts,
  attendance,
  onNavigate,
}: {
  subscriptions: Subscription[];
  receipts: Receipt[];
  attendance: Attendance[];
  onNavigate: (section: MemberSection) => void;
}) {
  const currentSubscriptions = subscriptions.filter((subscription) =>
    ["active", "expiring_soon", "grace_period"].includes(
      subscription.effective_status ?? subscription.status,
    ),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <OverviewCard
          icon={CalendarDays}
          value={currentSubscriptions.length}
          label="Abonnements actifs"
          onClick={() => onNavigate("subscriptions")}
        />
        <OverviewCard
          icon={CreditCard}
          value={receipts.length}
          label="Recus disponibles"
          onClick={() => onNavigate("receipts")}
        />
        <OverviewCard
          icon={CalendarCheck}
          value={attendance.length}
          label="Presences"
          onClick={() => onNavigate("attendance")}
        />
      </div>

      <Panel
        title="Mes services actifs"
        subtitle="Un resume rapide de vos formules actuellement valides."
      >
        {currentSubscriptions.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {currentSubscriptions.map((subscription) => (
              <Card key={subscription.id} className="p-5">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-primary">
                  {subscription.service_type.replaceAll("_", " ")}
                </p>
                <p className="mt-3 text-lg font-black text-white">
                  {subscription.plan_name}
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Du {subscription.starts_on} au {subscription.ends_on}
                </p>
                <Pill className="mt-4">
                  {statusLabels[
                    subscription.effective_status ?? subscription.status
                  ] ?? subscription.status}
                </Pill>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState text="Aucun abonnement actif sur ce compte." />
        )}
      </Panel>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  value,
  label,
  onClick,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="group rounded-lg border border-white/10 bg-[#091119]/90 p-5 text-left shadow-2xl transition hover:-translate-y-0.5 hover:border-primary/40"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4">
        <Icon className="h-6 w-6 text-primary" />
        <span className="text-3xl font-black text-white">{value}</span>
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.1em] text-gray-500 transition group-hover:text-white">
        {label}
      </p>
    </button>
  );
}

function ProfilePanel({ user }: { user: User }) {
  return (
    <Panel
      title="Mon profil"
      subtitle="Vos informations personnelles et votre statut membre."
    >
      <dl className="grid gap-x-8 gap-y-4 text-sm md:grid-cols-2">
        <Info label="Nom" value={user.full_name} />
        <Info label="Telephone" value={user.phone} />
        <Info label="Email" value={user.email ?? "Non renseigne"} />
        <Info
          label="Numero membre"
          value={user.member_number ?? "Non attribue"}
        />
        <Info label="Statut" value={statusLabels[user.status] ?? user.status} />
      </dl>
    </Panel>
  );
}

function SubscriptionsPanel({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  return (
    <Panel title="Mes abonnements" subtitle="Formules, dates et statut actuel.">
      {subscriptions.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-primary">
                    {subscription.service_type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-2 text-lg font-black text-white">
                    {subscription.plan_name}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Du {subscription.starts_on} au {subscription.ends_on}
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary">
                    {subscription.price} {subscription.currency}
                  </p>
                  {subscription.service_type === "recovery" ? (
                    <p className="mt-2 text-sm font-bold text-emerald-200">
                      {subscription.remaining_sessions ?? "-"} /{" "}
                      {subscription.total_sessions ?? "-"} seance(s)
                    </p>
                  ) : null}
                </div>
                <Pill>
                  {statusLabels[
                    subscription.effective_status ?? subscription.status
                  ] ?? subscription.status}
                </Pill>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState text="Aucun abonnement enregistre sur ce compte." />
      )}
    </Panel>
  );
}

function ReceiptsPanel({ receipts }: { receipts: Receipt[] }) {
  return (
    <Panel title="Mes recus" subtitle="Historique de vos paiements.">
      {receipts.length ? (
        <div className="space-y-4">
          {receipts.map((receipt) => (
            <ReceiptSummary key={receipt.receipt_id} receipt={receipt} />
          ))}
        </div>
      ) : (
        <EmptyState text="Aucun recu disponible." />
      )}
    </Panel>
  );
}

function AttendancePanel({ attendance }: { attendance: Attendance[] }) {
  return (
    <Panel
      title="Mes presences"
      subtitle="Historique des passages enregistres a l'accueil."
    >
      {attendance.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {attendance.map((entry) => (
            <Card
              key={entry.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-bold text-white">
                    {formatDate(entry.checked_in_at)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {entry.subscription_status_at_entry}
                  </p>
                </div>
              </div>
              <Pill>{statusLabels[entry.decision] ?? entry.decision}</Pill>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState text="Aucune presence enregistree." />
      )}
    </Panel>
  );
}

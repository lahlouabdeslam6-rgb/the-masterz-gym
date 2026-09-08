"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Camera,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  CreditCard,
  Dumbbell,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquareText,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  UserRound,
  Waves,
} from "lucide-react";
import { Button, Card, Pill, buttonStyles } from "@masterz/ui";
import { updateSessionUser, type AuthSession } from "@/lib/auth";
import {
  type NavigationBadgeKey,
  useNavigationBadges,
} from "@/lib/navigation-badges";
import {
  isCurrentSubscription,
  latestSubscriptionFor,
} from "@/lib/member-subscriptions";
import { MembershipPlansList } from "@/components/MembershipPlansList";
import { ReceiptSummary } from "./ApplicationManager";
import { CoachingTrackingPanel } from "./CoachingTrackingPanel";
import { CoachingScheduleManager } from "./CoachingScheduleManager";
import { CoachingConversationPanel } from "./CoachingConversationPanel";
import { CollectiveClassesManager } from "./CollectiveClassesManager";
import { MemberCoachingAssignmentRequest } from "./CoachingAssignmentRequests";
import { MemberRecoveryPanel } from "./RecoveryManager";
import { MemberNotifications } from "./MemberNotifications";
import { MemberAvatar, MemberPhotoCapture } from "./MemberPhotoCapture";
import { ComplaintCenter } from "./ComplaintCenter";
import { MemberStoreManager } from "./StoreManager";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { AccountNotificationBell } from "./AccountNotificationBell";
import {
  type Attendance,
  type Receipt,
  type Subscription,
  type User,
  DashboardTabs,
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
  | "collective"
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
    id: "collective",
    label: "Cours Salle 2",
    description: "Planning et reservations",
    icon: CalendarRange,
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

const memberBadgeKeys: Partial<Record<MemberSection, NavigationBadgeKey>> = {
  notifications: "notifications",
  coaching: "coaching",
  recovery: "recovery",
  store: "store",
  complaints: "complaints",
};

const memberNavigationGroups: Array<{
  id: "account" | "services" | "support";
  label: string;
  icon: LucideIcon;
  sections: MemberSection[];
}> = [
  {
    id: "account",
    label: "Compte et abonnements",
    icon: UserRound,
    sections: [
      "notifications",
      "profile",
      "subscriptions",
      "receipts",
      "attendance",
    ],
  },
  {
    id: "services",
    label: "Services et suivi",
    icon: Dumbbell,
    sections: ["coaching", "collective", "recovery"],
  },
  {
    id: "support",
    label: "Achats et assistance",
    icon: ShoppingBag,
    sections: ["store", "complaints"],
  },
];

export function MemberDashboard({
  session,
  user,
  subscriptions,
  receipts,
  attendance,
  onLogout,
}: {
  session: AuthSession;
  user: User;
  subscriptions: Subscription[];
  receipts: Receipt[];
  attendance: Attendance[];
  onLogout: () => void;
}) {
  const [activeSection, setActiveSection] = useState<MemberSection>("overview");
  const [coachingView, setCoachingView] = useState<
    "schedule" | "progress" | "messages"
  >("schedule");
  const [openNavigationGroups, setOpenNavigationGroups] = useState(
    () => new Set(memberNavigationGroups.map((group) => group.id)),
  );
  const [currentUser, setCurrentUser] = useState(user);
  const { badges, clearBadge, notifications } = useNavigationBadges(
    session,
    activeSection,
  );
  const openSection = (nextSection: MemberSection) => {
    const badgeKey = memberBadgeKeys[nextSection];
    if (badgeKey) clearBadge(badgeKey);
    const parentGroup = memberNavigationGroups.find((group) =>
      group.sections.includes(nextSection),
    );
    if (parentGroup) {
      setOpenNavigationGroups((current) => {
        const next = new Set(current);
        next.add(parentGroup.id);
        return next;
      });
    }
    setActiveSection(nextSection);
  };
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

  const renderNavigationItem = (
    item: (typeof memberSections)[number],
    nested = false,
  ) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    const badgeKey = memberBadgeKeys[item.id];
    const badgeCount = badgeKey ? badges[badgeKey] : undefined;
    return (
      <button
        key={item.id}
        type="button"
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        className={`flex w-full items-center gap-3 rounded-sm border py-2 text-left transition ${
          nested ? "px-3 pl-7" : "px-3"
        } ${
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
        <span className="block min-w-0 flex-1 truncate text-sm font-black">
          {item.label}
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
  };

  const openNotification = (kind: string) => {
    if (kind.startsWith("collective_class_")) {
      openSection("collective");
    } else if (kind.startsWith("coaching_")) {
      setCoachingView(
        kind === "coaching_message_received" ? "messages" : "schedule",
      );
      openSection("coaching");
    } else if (kind.startsWith("recovery_")) {
      openSection("recovery");
    } else if (kind.startsWith("store_")) {
      openSection("store");
    } else if (kind.startsWith("complaint_")) {
      openSection("complaints");
    } else {
      openSection("subscriptions");
    }
  };

  return (
    <div className="mt-8 grid items-start gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <AccountNotificationBell
        accountLabel="membre"
        notifications={notifications}
        unreadCount={badges.notifications ?? 0}
        testId="member-notification-badge"
        onClear={() => clearBadge("notifications")}
        onOpenNotification={openNotification}
      />
      <aside className="flex overflow-hidden rounded-lg border border-white/10 bg-[#081119]/95 shadow-2xl lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:flex-col">
        <div className="border-b border-white/10 bg-primary/[0.07] p-4">
          <MemberAvatar member={currentUser} className="h-12 w-12" />
          <p className="mt-3 truncate text-sm font-black uppercase text-white">
            {currentUser.full_name}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {currentUser.member_number ?? "Numero membre non attribue"}
          </p>
        </div>

        <nav
          aria-label="Navigation espace membre"
          className="hidden min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2.5 lg:block"
        >
          {renderNavigationItem(memberSections[0])}
          {memberNavigationGroups.map((group) => {
            const GroupIcon = group.icon;
            const isOpen = openNavigationGroups.has(group.id);
            const groupBadgeCount = group.sections.reduce(
              (total, sectionId) => {
                const badgeKey = memberBadgeKeys[sectionId];
                return total + (badgeKey ? (badges[badgeKey] ?? 0) : 0);
              },
              0,
            );
            return (
              <div key={group.id} className="border-t border-white/[0.06] pt-1">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-gray-400 transition hover:bg-white/[0.04] hover:text-white"
                  onClick={() =>
                    setOpenNavigationGroups((current) => {
                      const next = new Set(current);
                      if (next.has(group.id)) next.delete(group.id);
                      else next.add(group.id);
                      return next;
                    })
                  }
                >
                  <GroupIcon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-[0.68rem] font-black uppercase tracking-[0.08em]">
                    {group.label}
                  </span>
                  {groupBadgeCount ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.58rem] font-black text-black">
                      {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                    </span>
                  ) : null}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen ? (
                  <div className="space-y-0.5 pb-1">
                    {group.sections.map((sectionId) => {
                      const item = memberSections.find(
                        (candidate) => candidate.id === sectionId,
                      );
                      return item ? renderNavigationItem(item, true) : null;
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onLogout}
          className={buttonStyles({
            variant: "outline",
            className:
              "mx-3 mb-3 mt-auto hidden w-[calc(100%-1.5rem)] shrink-0 lg:flex",
          })}
        >
          <LogOut className="h-4 w-4" /> Se deconnecter
        </button>

        <label className="block p-4 pb-2 lg:hidden">
          <span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.14em] text-gray-500">
            Choisir une rubrique
          </span>
          <select
            aria-label="Rubrique espace membre"
            value={activeSection}
            onChange={(event) =>
              openSection(event.target.value as MemberSection)
            }
            className="h-12 w-full rounded-sm border border-white/15 bg-[#050a0f] px-3 text-sm font-bold text-white outline-none focus:border-primary"
          >
            {memberSections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {memberBadgeKeys[item.id] && badges[memberBadgeKeys[item.id]!]
                  ? ` (${badges[memberBadgeKeys[item.id]!]})`
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onLogout}
          className={buttonStyles({
            variant: "outline",
            className: "mx-4 mb-4 w-[calc(100%-2rem)] lg:hidden",
          })}
        >
          <LogOut className="h-4 w-4" /> Se deconnecter
        </button>
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
              photoReady={Boolean(
                currentUser.profile_photo_url &&
                currentUser.profile_photo_verified_at,
              )}
              subscriptions={subscriptions}
              receipts={receipts}
              attendance={attendance}
              onNavigate={openSection}
            />
          ) : null}
          {activeSection === "notifications" ? (
            <Panel
              title="Mes notifications"
              subtitle="Les alertes importantes concernant vos abonnements, vos packs et vos reservations."
            >
              <MemberNotifications
                session={session}
                onOpen={openNotification}
              />
            </Panel>
          ) : null}
          {activeSection === "profile" ? (
            <ProfilePanel
              session={session}
              user={currentUser}
              onUpdated={(updated) => {
                setCurrentUser(updated);
                updateSessionUser(updated);
              }}
            />
          ) : null}
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
            <MemberCoachingWorkspace
              session={session}
              memberId={currentUser.id}
              hasActiveCoaching={hasActiveCoaching}
              activeView={coachingView}
              onViewChange={setCoachingView}
            />
          ) : null}
          {activeSection === "collective" ? (
            <Panel
              title="Cours collectifs · Salle 2"
              subtitle="Reservez votre place. Si le cours est complet, votre position dans la liste d'attente apparait immediatement."
            >
              <CollectiveClassesManager session={session} mode="member" />
            </Panel>
          ) : null}
          {activeSection === "recovery" ? (
            <Panel
              title="Mon pack recovery"
              subtitle="Vos seances sauna, bain froid et compression, avec le solde et l'historique des passages."
            >
              <MemberRecoveryPanel
                session={session}
                memberId={currentUser.id}
              />
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

function MemberCoachingWorkspace({
  session,
  memberId,
  hasActiveCoaching,
  activeView,
  onViewChange,
}: {
  session: AuthSession;
  memberId: string;
  hasActiveCoaching: boolean;
  activeView: "schedule" | "progress" | "messages";
  onViewChange: (view: "schedule" | "progress" | "messages") => void;
}) {
  return (
    <MemberCoachingAssignmentRequest
      session={session}
      hasActiveCoaching={hasActiveCoaching}
    >
      <DashboardTabs
        eyebrow="Rubriques coaching"
        ariaLabel="Rubriques coaching membre"
        activeTab={activeView}
        onChange={onViewChange}
        tabs={[
          {
            id: "schedule",
            label: "Mes seances",
            icon: CalendarCheck,
          },
          {
            id: "progress",
            label: "Ma progression",
            icon: TrendingUp,
          },
          {
            id: "messages",
            label: "Messages avec mon coach",
            icon: MessageSquareText,
          },
        ]}
      />

      {activeView === "schedule" ? (
        <Panel
          title="Mes seances coaching"
          subtitle="Choisissez un horaire propose par votre coach et suivez sa confirmation."
        >
          <CoachingScheduleManager session={session} mode="member" />
        </Panel>
      ) : null}

      {activeView === "progress" ? (
        <Panel
          title="Ma progression coaching"
          subtitle="Votre objectif, vos tests et leur historique, sans modifier les donnees saisies par votre coach."
        >
          <CoachingTrackingPanel session={session} memberId={memberId} />
        </Panel>
      ) : null}

      {activeView === "messages" ? (
        <Panel
          title="Conversation avec mon coach"
          subtitle="Envoyez un message, une photo ou un audio a votre coach dans un espace separe."
        >
          <CoachingConversationPanel session={session} />
        </Panel>
      ) : null}
    </MemberCoachingAssignmentRequest>
  );
}

function MemberOverview({
  photoReady,
  subscriptions,
  receipts,
  attendance,
  onNavigate,
}: {
  photoReady: boolean;
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
      {!photoReady ? (
        <section className="rounded-lg border border-amber-300/30 bg-amber-300/[0.06] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">
                Action obligatoire avant votre premiere entree
              </p>
              <h3 className="mt-2 text-xl font-black uppercase text-white">
                Ajoutez une photo claire de votre visage
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Ouvrez la camera ou importez une photo. Un seul visage doit etre
                visible et bien eclaire.
              </p>
            </div>
            <Button type="button" onClick={() => onNavigate("profile")}>
              <Camera className="h-4 w-4" /> Ajouter ma photo
            </Button>
          </div>
        </section>
      ) : null}
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

function ProfilePanel({
  session,
  user,
  onUpdated,
}: {
  session: AuthSession;
  user: User;
  onUpdated: (user: User) => void;
}) {
  return (
    <Panel
      title="Mon profil"
      subtitle="Votre photo de reconnaissance et vos informations personnelles."
    >
      <div className="space-y-5">
        <MemberPhotoCapture
          session={session}
          member={user}
          onUploaded={onUpdated}
        />
        <Card className="p-5">
          <dl className="grid gap-x-8 gap-y-4 text-sm md:grid-cols-2">
            <Info label="Nom" value={user.full_name} />
            <Info label="Telephone" value={user.phone} />
            <Info label="Email" value={user.email ?? "Non renseigne"} />
            <Info
              label="Numero membre"
              value={user.member_number ?? "Non attribue"}
            />
            <Info
              label="Statut"
              value={statusLabels[user.status] ?? user.status}
            />
            <Info
              label="Photo visage"
              value={user.profile_photo_verified_at ? "Validee" : "Obligatoire"}
            />
          </dl>
        </Card>
        <ChangePasswordForm session={session} />
      </div>
    </Panel>
  );
}

function SubscriptionsPanel({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const [activeView, setActiveView] = useState<
    "offers" | "promotions" | "history"
  >("offers");
  const [activeService, setActiveService] = useState<
    "gym" | "coaching" | "recovery" | "martial_arts"
  >("gym");
  const services = [
    {
      id: "gym" as const,
      label: "Salle musculation",
    },
    { id: "coaching" as const, label: "Coaching" },
    { id: "recovery" as const, label: "Recovery" },
    { id: "martial_arts" as const, label: "Arts martiaux" },
  ];

  return (
    <Panel
      title="Mes abonnements"
      subtitle="Consultez les offres disponibles sans melanger vos anciens abonnements."
    >
      <DashboardTabs
        eyebrow="Abonnements membre"
        ariaLabel="Offres et historique des abonnements"
        activeTab={activeView}
        onChange={setActiveView}
        tabs={[
          { id: "offers", label: "Offres disponibles", icon: ListChecks },
          {
            id: "promotions",
            label: "Promotions",
            icon: Bell,
          },
          {
            id: "history",
            label: "Historique des abonnements",
            icon: History,
            badge: subscriptions.length,
          },
        ]}
      />

      {activeView === "offers" ? (
        <div className="mt-6">
          <div className="grid gap-3 md:grid-cols-3">
            {services.map((service) => {
              const latest = latestSubscriptionFor(subscriptions, service.id);
              const current = latest ? isCurrentSubscription(latest) : false;
              const sessionsFinished =
                (latest?.service_type === "recovery" ||
                  latest?.service_type === "martial_arts") &&
                latest.remaining_sessions === 0;
              const serviceStatus = current
                ? "Deja paye"
                : latest
                  ? sessionsFinished
                    ? "Seances terminees"
                    : "A renouveler"
                  : "Disponible";

              return (
                <button
                  type="button"
                  key={service.id}
                  data-testid={`member-service-${service.id}`}
                  aria-pressed={activeService === service.id}
                  onClick={() => setActiveService(service.id)}
                  className={`rounded-sm border p-4 text-left transition ${
                    activeService === service.id
                      ? "border-primary bg-primary/[0.1]"
                      : "border-white/10 bg-black/20 hover:border-primary/40"
                  }`}
                >
                  <span className="block text-[0.65rem] font-black uppercase tracking-[0.14em] text-primary">
                    {service.label}
                  </span>
                  <span
                    className={`mt-2 block text-sm font-black ${
                      current ? "text-emerald-200" : "text-white"
                    }`}
                  >
                    {serviceStatus}
                  </span>
                  {current && latest ? (
                    <span className="mt-1 block text-xs text-gray-500">
                      {latest.plan_name} · jusqu&apos;au {latest.ends_on}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-6 border-t border-white/10 pt-6">
            <MembershipPlansList
              serviceType={activeService}
              onViewSubscription={() => setActiveView("history")}
            />
          </div>
        </div>
      ) : null}

      {activeView === "promotions" ? (
        <div className="mt-6">
          <MembershipPlansList serviceType="gym" promotionsOnly />
        </div>
      ) : null}

      {activeView === "history" ? (
        subscriptions.length ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
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
                    {subscription.service_type === "recovery" ||
                    subscription.service_type === "martial_arts" ? (
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
          <div className="mt-6">
            <EmptyState text="Aucun abonnement enregistre sur ce compte." />
          </div>
        )
      ) : null}
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

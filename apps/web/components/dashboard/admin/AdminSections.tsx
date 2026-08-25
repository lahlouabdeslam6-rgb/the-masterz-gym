"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Dumbbell,
  Footprints,
  Package,
  Settings2,
  ShoppingCart,
  UsersRound,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert, Card, LoadingMessage } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders } from "@/lib/auth";
import {
  AdminPlanManager,
  AdminSettingsManager,
  AdminUserManager,
} from "../AdminManagement";
import { ApplicationManager } from "../ApplicationManager";
import { CoachingManager } from "../CoachingManager";
import { StaffCoachingAssignmentRequests } from "../CoachingAssignmentRequests";
import { CoachingScheduleManager } from "../CoachingScheduleManager";
import { ComplaintCenter } from "../ComplaintCenter";
import { RecoveryManager } from "../RecoveryManager";
import { StaffMemberManager } from "../StaffMemberManager";
import { AdminStoreManager, StaffStoreManager } from "../StoreManager";
import {
  type Application,
  type AuditLog,
  type Plan,
  type Setting,
  type User,
  DashboardTabs,
  EmptyState,
  Panel,
  formatDate,
} from "../dashboard-shared";
import { AdminPage } from "./AdminPage";
import { useAdminSession } from "./AdminShell";

export function AdminUsersSection() {
  const { session } = useAdminSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/users", {
      headers: authorizationHeaders(session.accessToken),
      params: { query: { limit: 500 } },
    });
    setUsers(result.data ?? []);
    setError(result.error ? "Impossible de charger les utilisateurs." : null);
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <AdminPage
      eyebrow="Comptes et roles"
      title="Utilisateurs"
      description="Creez les comptes du personnel ou des membres, puis gerez leurs roles et leurs statuts."
    >
      <PageState loading={loading} error={error}>
        <Panel
          title="Gestion des utilisateurs"
          subtitle={`${users.length} compte(s) enregistre(s).`}
        >
          <AdminUserManager session={session} users={users} onReload={load} />
        </Panel>
      </PageState>
    </AdminPage>
  );
}

export function AdminApplicationsSection() {
  const { session } = useAdminSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/membership-applications", {
      headers: authorizationHeaders(session.accessToken),
    });
    setApplications(result.data ?? []);
    setError(
      result.error ? "Impossible de charger les demandes d'adhesion." : null,
    );
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const pending = applications.filter(
    (application) =>
      application.status === "pending" ||
      application.status === "more_information_required",
  ).length;

  return (
    <AdminPage
      eyebrow="Adhesions"
      title="Demandes"
      description="Traitez les nouvelles inscriptions sans melanger cette file avec les dossiers membres."
    >
      <PageState loading={loading} error={error}>
        <Panel
          title="Demandes d'adhesion"
          subtitle={`${pending} demande(s) a traiter sur ${applications.length}.`}
        >
          <ApplicationManager
            session={session}
            applications={applications}
            onReload={load}
          />
        </Panel>
      </PageState>
    </AdminPage>
  );
}

export function AdminPlansSection() {
  const { session } = useAdminSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/membership-plans", {
      params: { query: { active_only: false } },
    });
    setPlans(result.data ?? []);
    setError(result.error ? "Impossible de charger les formules." : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <AdminPage
      eyebrow="Offres commerciales"
      title="Formules"
      description="Creez et modifiez les abonnements visibles. Les futures offres deux-clubs seront configurees ici sans prix code en dur."
    >
      <PageState loading={loading} error={error}>
        <Panel
          title="Formules d'abonnement"
          subtitle={`${plans.filter((plan) => plan.is_active).length} formule(s) active(s).`}
        >
          <AdminPlanManager session={session} plans={plans} onReload={load} />
        </Panel>
      </PageState>
    </AdminPage>
  );
}

export function AdminMembersSection() {
  const { session } = useAdminSession();
  return (
    <AdminPage
      eyebrow="Base clients"
      title="Membres"
      description="Consultez la liste complete, filtrez les statuts puis ouvrez un dossier membre clairement separe en informations, abonnements, recus et entrees."
    >
      <Panel
        title="Dossier membre"
        subtitle="Les renouvellements urgents apparaissent en premier. Vous pouvez aussi classer la liste par nom ou par date d'inscription."
      >
        <StaffMemberManager session={session} plans={[]} mode="profile" />
      </Panel>
    </AdminPage>
  );
}

export function AdminCoachesSection() {
  const { session } = useAdminSession();
  const [activeView, setActiveView] = useState<
    "requests" | "management" | "schedule"
  >("requests");
  return (
    <AdminPage
      eyebrow="Suivi sportif"
      title="Coachs"
      description="Consultez les coachs, leurs clients et changez l'affectation d'un membre depuis un dossier simple."
    >
      <div className="space-y-6">
        <DashboardTabs
          eyebrow="Rubriques coaching"
          ariaLabel="Rubriques administration coaching"
          activeTab={activeView}
          onChange={setActiveView}
          tabs={[
            {
              id: "requests",
              label: "Demandes clients",
              icon: ClipboardCheck,
            },
            {
              id: "management",
              label: "Coachs et clients",
              icon: UsersRound,
            },
            {
              id: "schedule",
              label: "Planning des seances",
              icon: CalendarDays,
            },
          ]}
        />

        <div className="min-w-0">
          {activeView === "requests" ? (
            <Panel
              title="Demandes de coach"
              subtitle="Validez le choix du membre ou affectez le coach le plus adapte."
            >
              <StaffCoachingAssignmentRequests session={session} />
            </Panel>
          ) : null}
          {activeView === "management" ? (
            <CoachingManager session={session} />
          ) : null}
          {activeView === "schedule" ? (
            <Panel
              title="Planning coaching"
              subtitle="Consultez les horaires de tous les coachs, confirmez les demandes et gerez les conflits."
            >
              <CoachingScheduleManager session={session} mode="staff" />
            </Panel>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}

export function AdminPaymentsSection() {
  const { session } = useAdminSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/membership-plans", {
      params: { query: { active_only: true } },
    });
    setPlans(result.data ?? []);
    setError(
      result.error ? "Impossible de charger les formules de paiement." : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <AdminPage
      eyebrow="Caisse abonnements"
      title="Paiements"
      description="Consultez les renouvellements prioritaires, ouvrez le dossier du membre puis encaissez son abonnement."
    >
      <PageState loading={loading} error={error}>
        <Panel
          title="Paiement membre"
          subtitle="Les abonnements expires ou proches de leur echeance apparaissent en premier."
        >
          <StaffMemberManager session={session} plans={plans} mode="payments" />
        </Panel>
      </PageState>
    </AdminPage>
  );
}

export function AdminAccessSection() {
  const { session } = useAdminSession();
  return (
    <AdminPage
      eyebrow="Accueil salle"
      title="Entrees des membres"
      description="Choisissez le membre puis enregistrez son entree. Si son abonnement commence plus tard, vous pouvez le demarrer aujourd'hui."
    >
      <Panel
        title="Enregistrer une entree"
        subtitle="La date de debut choisie au paiement determine le premier jour d'entree et lance le calcul de l'abonnement."
      >
        <StaffMemberManager session={session} plans={[]} mode="access" />
      </Panel>
    </AdminPage>
  );
}

export function AdminRecoverySection() {
  const { session } = useAdminSession();
  return (
    <AdminPage
      eyebrow="Sauna, bain froid et compression"
      title="Recovery"
      description="Consultez les packs, leur solde de seances et l'historique, puis enregistrez chaque passage sans le melanger avec les entrees salle."
    >
      <RecoveryManager session={session} />
    </AdminPage>
  );
}

export function AdminComplaintsSection() {
  const { session } = useAdminSession();
  return (
    <AdminPage
      eyebrow="Relation membres"
      title="Reclamations"
      description="Consultez toutes les reclamations, repondez au membre et suivez chaque dossier jusqu'a sa resolution."
    >
      <Panel
        title="Suivi des reclamations"
        subtitle="L'Administration voit tous les dossiers, y compris ceux traites par la Reception."
      >
        <ComplaintCenter session={session} mode="staff" />
      </Panel>
    </AdminPage>
  );
}

export function AdminStoreSection() {
  const { session } = useAdminSession();
  const [activeView, setActiveView] = useState<"products" | "operations">(
    "products",
  );
  return (
    <AdminPage
      eyebrow="Catalogue, stock et ventes"
      title="Masterz Store"
      description="Gerez les produits et leur stock, puis suivez les reservations et les ventes realisees a la Reception."
    >
      <div className="space-y-6">
        <DashboardTabs
          eyebrow="Rubriques Store"
          ariaLabel="Rubriques administration Store"
          activeTab={activeView}
          onChange={setActiveView}
          tabs={[
            { id: "products", label: "Produits et stock", icon: Package },
            {
              id: "operations",
              label: "Reservations et caisse",
              icon: ShoppingCart,
            },
          ]}
        />
        {activeView === "products" ? (
          <Panel
            title="Produits"
            subtitle="L'Admin est le seul a pouvoir creer, modifier ou masquer un produit."
          >
            <AdminStoreManager session={session} />
          </Panel>
        ) : null}
        {activeView === "operations" ? (
          <Panel
            title="Reservations et caisse"
            subtitle="Validez les demandes clients ou enregistrez une vente directe."
          >
            <StaffStoreManager session={session} />
          </Panel>
        ) : null}
      </div>
    </AdminPage>
  );
}

export function AdminSettingsSection() {
  const { session } = useAdminSession();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/membership-settings", {
      headers: authorizationHeaders(session.accessToken),
    });
    setSettings(result.data ?? []);
    setError(result.error ? "Impossible de charger les parametres." : null);
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <AdminPage
      eyebrow="Regles metier"
      title="Parametres"
      description="Centralisez ici les delais et regles configurables pour eviter les valeurs cachees dans le code."
    >
      <PageState loading={loading} error={error}>
        <Panel
          title="Parametres d'abonnement"
          subtitle="Chaque modification est appliquee au fonctionnement metier."
        >
          <AdminSettingsManager
            session={session}
            settings={settings}
            onReload={load}
          />
        </Panel>
      </PageState>
    </AdminPage>
  );
}

export function AdminAuditSection() {
  const { session } = useAdminSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeCategory, setActiveCategory] = useState<AuditCategory | "all">(
    "all",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/audit-logs", {
      headers: authorizationHeaders(session.accessToken),
      params: { query: { limit: 100, business_only: true } },
    });
    setLogs(result.data ?? []);
    setError(result.error ? "Impossible de charger le journal d'audit." : null);
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const visibleLogs = logs.filter(
    (log) =>
      activeCategory === "all" || auditCategory(log.action) === activeCategory,
  );

  return (
    <AdminPage
      eyebrow="Tracabilite"
      title="Journal d'audit"
      description="Suivez les demandes, validations, paiements, reservations et autres mouvements reels du club."
    >
      <PageState loading={loading} error={error}>
        <Panel
          title="Historique des mouvements"
          subtitle={`${logs.length} mouvement(s) metier charge(s). Les connexions et deconnexions ne sont pas affichees.`}
        >
          {logs.length ? (
            <div className="space-y-5">
              <div
                className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]"
                role="group"
                aria-label="Filtrer les mouvements"
              >
                <AuditFilterButton
                  active={activeCategory === "all"}
                  label="Tous"
                  count={logs.length}
                  onClick={() => setActiveCategory("all")}
                />
                {auditCategories.map((category) => (
                  <AuditFilterButton
                    key={category.id}
                    active={activeCategory === category.id}
                    label={category.label}
                    count={
                      logs.filter(
                        (log) => auditCategory(log.action) === category.id,
                      ).length
                    }
                    onClick={() => setActiveCategory(category.id)}
                  />
                ))}
              </div>

              {visibleLogs.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {visibleLogs.map((log) => {
                    const category = auditCategoryConfig(log.action);
                    const Icon = category.icon;
                    return (
                      <Card
                        key={log.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 p-4 sm:p-5"
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-primary">
                                {category.label}
                              </p>
                              <h3 className="mt-1 font-black text-white">
                                {auditTitle(log.action)}
                              </h3>
                            </div>
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-gray-400">
                              {auditActor(log.actor_role)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-gray-300">
                            {auditDetail(log)}
                          </p>
                          <p className="mt-3 text-xs text-gray-500">
                            {auditEntity(log.entity_type)} ·{" "}
                            {formatDate(log.created_at)}
                          </p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="Aucun mouvement dans cette rubrique." />
              )}
            </div>
          ) : (
            <EmptyState text="Aucun mouvement metier enregistre." />
          )}
        </Panel>
      </PageState>
    </AdminPage>
  );
}

type AuditCategory =
  | "applications"
  | "payments"
  | "coaching"
  | "recovery"
  | "store"
  | "access"
  | "administration";

const auditCategories: Array<{
  id: AuditCategory;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "applications", label: "Demandes", icon: ClipboardCheck },
  { id: "payments", label: "Paiements", icon: CircleDollarSign },
  { id: "coaching", label: "Coaching", icon: Dumbbell },
  { id: "recovery", label: "Recovery", icon: Waves },
  { id: "store", label: "Store", icon: Package },
  { id: "access", label: "Entrees", icon: Footprints },
  { id: "administration", label: "Gestion", icon: Settings2 },
];

const auditTitles: Record<string, string> = {
  "application.submitted": "Demande d'inscription envoyee",
  "application.approved": "Demande d'inscription acceptee",
  "application.rejected": "Demande d'inscription refusee",
  "application.more_information_required":
    "Informations supplementaires demandees",
  "application.converted_to_member": "Demande transformee en membre",
  "payment.recorded": "Paiement enregistre",
  "subscription.created": "Abonnement cree",
  "subscription.status_changed": "Statut d'abonnement modifie",
  "subscription.lifecycle_status_changed":
    "Abonnement mis a jour automatiquement",
  "subscription.dates_changed": "Date d'abonnement modifiee",
  "membership_plan.created": "Formule creee",
  "membership_plan.updated": "Formule modifiee",
  "coaching.assignment_requested": "Demande de coach envoyee",
  "coaching.assignment_request_decided": "Demande de coach traitee",
  "coaching.availability_created": "Creneau coaching ajoute",
  "coaching.availability_updated": "Creneau coaching modifie",
  "coaching.booking_requested": "Seance coaching reservee",
  "coaching.booking_status_updated": "Reservation coaching mise a jour",
  "coaching.booking_rescheduled": "Seance coaching reprogrammee",
  "coaching.member_assigned": "Coach affecte au membre",
  "coaching.member_reassigned": "Coach du membre change",
  "coaching.assignment_ended": "Affectation coaching terminee",
  "coaching.objective_created": "Objectif coaching ajoute",
  "coaching.objective_updated": "Objectif coaching modifie",
  "coaching.assessment_recorded": "Test coaching enregistre",
  "recovery.visit_recorded": "Passage Recovery enregistre",
  "store.product.created": "Produit Store ajoute",
  "store.product.updated": "Produit Store modifie",
  "store.reservation.created": "Produit reserve par un client",
  "store.reservation.status_updated": "Reservation Store traitee",
  "store.sale.recorded": "Vente Store enregistree",
  "attendance.exceptional_access": "Entree exceptionnelle autorisee",
  "user.created": "Compte cree",
  "user.updated": "Compte modifie",
  "user.deleted": "Compte supprime",
  "user.role_status_changed": "Role ou statut du compte modifie",
  "user.activated": "Compte membre active",
  "member.profile_updated": "Dossier membre modifie",
  "setting.updated": "Parametre d'abonnement modifie",
};

function AuditFilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-between gap-3 rounded-sm border px-4 py-3 text-left text-xs font-black uppercase tracking-[0.1em] transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-white/10 bg-black/20 text-gray-400 hover:border-primary/35 hover:text-white"
      }`}
    >
      {label}
      <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[0.62rem]">
        {count}
      </span>
    </button>
  );
}

function auditCategory(action: string): AuditCategory {
  if (action.startsWith("application.")) return "applications";
  if (
    action.startsWith("payment.") ||
    action.startsWith("subscription.") ||
    action.startsWith("membership_plan.")
  )
    return "payments";
  if (action.startsWith("coaching.")) return "coaching";
  if (action.startsWith("recovery.")) return "recovery";
  if (action.startsWith("store.")) return "store";
  if (action.startsWith("attendance.")) return "access";
  return "administration";
}

function auditCategoryConfig(action: string) {
  return (
    auditCategories.find(
      (category) => category.id === auditCategory(action),
    ) ?? {
      id: "administration" as const,
      label: "Gestion",
      icon: Activity,
    }
  );
}

function auditTitle(action: string) {
  return auditTitles[action] ?? "Mouvement enregistre";
}

function auditActor(role: AuditLog["actor_role"]) {
  if (!role) return "Client / visiteur";
  return (
    {
      admin: "Admin",
      receptionist: "Reception",
      coach: "Coach",
      member: "Membre",
      recovery_client: "Client Recovery",
      cafe_employee: "Healthy Cafe",
    }[role] ?? role
  );
}

function auditEntity(entityType: string) {
  return (
    {
      membership_application: "Demande d'inscription",
      payment: "Paiement",
      receipt: "Recu",
      subscription: "Abonnement",
      membership_plan: "Formule",
      coaching_assignment_request: "Demande de coach",
      coaching_booking: "Reservation coaching",
      coaching_availability: "Creneau coaching",
      coaching_assignment: "Affectation coaching",
      coaching_assessment: "Test coaching",
      coaching_client_profile: "Suivi coaching",
      recovery_visit: "Passage Recovery",
      store_product: "Produit Store",
      store_reservation: "Reservation Store",
      store_sale: "Vente Store",
      attendance: "Entree salle",
      user: "Compte",
      setting: "Parametre",
    }[entityType] ?? "Operation"
  );
}

function auditValue(
  value: Record<string, unknown> | null | undefined,
  key: string,
) {
  const entry = value?.[key];
  return typeof entry === "string" || typeof entry === "number"
    ? String(entry)
    : null;
}

function auditStatus(value: string) {
  return (
    {
      pending: "En attente",
      approved: "Acceptee",
      rejected: "Refusee",
      more_information_required: "Informations demandees",
      ready: "Disponible",
      completed: "Terminee",
      cancelled: "Annulee",
      active: "Actif",
      suspended: "Suspendu",
      expired: "Expire",
      requested: "Demandee",
      confirmed: "Confirmee",
    }[value] ?? value.replaceAll("_", " ")
  );
}

function auditDetail(log: AuditLog) {
  const applicant = auditValue(log.new_value, "applicant_name");
  const plan = auditValue(log.new_value, "plan_name");
  if (applicant) {
    return plan ? `${applicant} · ${plan}` : applicant;
  }

  const previousStatus = auditValue(log.previous_value, "status");
  const newStatus = auditValue(log.new_value, "status");
  if (newStatus) {
    return previousStatus
      ? `${auditStatus(previousStatus)} → ${auditStatus(newStatus)}`
      : `Statut : ${auditStatus(newStatus)}`;
  }

  const previousStock = auditValue(log.previous_value, "stock_quantity");
  const newStock = auditValue(log.new_value, "stock_quantity");
  if (previousStock && newStock) {
    return `Stock : ${previousStock} → ${newStock}`;
  }

  return (
    log.reason || `${auditEntity(log.entity_type)} enregistre dans le systeme.`
  );
}

function PageState({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  if (loading) return <LoadingMessage message="Chargement..." />;
  return (
    <>
      {error ? <Alert type="error" message={error} className="mb-6" /> : null}
      {children}
    </>
  );
}

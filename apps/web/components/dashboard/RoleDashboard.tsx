"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ClipboardCheck,
  Coffee,
  CreditCard,
  FileClock,
  LogOut,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Alert, Card, LoadingMessage, Pill, buttonStyles } from "@masterz/ui";
import { api } from "@/lib/api";
import {
  authorizationHeaders,
  clearSession,
  dashboardPath,
  getSession,
  updateSessionUser,
  type AuthSession,
} from "@/lib/auth";
import {
  AdminPlanManager,
  AdminSettingsManager,
  AdminUserManager,
} from "./AdminManagement";
import { ApplicationManager } from "./ApplicationManager";
import { CoachDashboard } from "./CoachDashboard";
import { MemberDashboard } from "./MemberDashboard";
import { StaffMemberManager } from "./StaffMemberManager";
import {
  type Application,
  type Attendance,
  type AuditLog,
  type Plan,
  type Receipt,
  type Setting,
  type Subscription,
  type User,
  Panel,
  Stat,
  formatDate,
  roleLabels,
  statusLabels,
} from "./dashboard-shared";

export function RoleDashboard() {
  const router = useRouter();
  const params = useParams<{ role: string }>();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/connexion");
      return;
    }
    const correctPath = dashboardPath(current.user.role);
    if (!correctPath.endsWith(`/${params.role}`)) {
      router.replace(correctPath);
      return;
    }
    void loadDashboard(current);
  }, [params.role, router]);

  async function loadDashboard(current: AuthSession, silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    const headers = authorizationHeaders(current.accessToken);
    try {
      const meResult = await api.GET("/api/v1/users/me", { headers });
      if (!meResult.data) throw new Error("session");
      updateSessionUser(meResult.data);
      const refreshed = { ...current, user: meResult.data };
      setSession(refreshed);

      if (meResult.data.role === "admin") {
        const [
          usersResult,
          applicationsResult,
          plansResult,
          settingsResult,
          auditResult,
        ] = await Promise.all([
          api.GET("/api/v1/users", {
            headers,
            params: { query: { limit: 500 } },
          }),
          api.GET("/api/v1/membership-applications", { headers }),
          api.GET("/api/v1/membership-plans", {
            params: { query: { active_only: false } },
          }),
          api.GET("/api/v1/membership-settings", { headers }),
          api.GET("/api/v1/audit-logs", {
            headers,
            params: { query: { limit: 100 } },
          }),
        ]);
        setUsers(usersResult.data ?? []);
        setApplications(applicationsResult.data ?? []);
        setPlans(plansResult.data ?? []);
        setSettings(settingsResult.data ?? []);
        setAuditLogs(auditResult.data ?? []);
      } else if (meResult.data.role === "receptionist") {
        const [applicationsResult, plansResult] = await Promise.all([
          api.GET("/api/v1/membership-applications", { headers }),
          api.GET("/api/v1/membership-plans", {
            params: { query: { active_only: true } },
          }),
        ]);
        setApplications(applicationsResult.data ?? []);
        setPlans(plansResult.data ?? []);
      } else if (meResult.data.role === "member") {
        const [subscriptionResult, receiptResult, attendanceResult] =
          await Promise.all([
            api.GET("/api/v1/members/{member_id}/subscriptions", {
              headers,
              params: { path: { member_id: meResult.data.id } },
            }),
            api.GET("/api/v1/payments/members/{member_id}/receipts", {
              headers,
              params: { path: { member_id: meResult.data.id } },
            }),
            api.GET("/api/v1/attendance/members/{member_id}", {
              headers,
              params: {
                path: { member_id: meResult.data.id },
                query: { limit: 200 },
              },
            }),
          ]);
        setSubscriptions(subscriptionResult.data ?? []);
        setReceipts(receiptResult.data ?? []);
        setAttendance(attendanceResult.data ?? []);
      }
    } catch {
      clearSession();
      setError("Votre session a expiré. Veuillez vous reconnecter.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function logout() {
    if (session)
      await api.POST("/api/v1/auth/logout", {
        headers: authorizationHeaders(session.accessToken),
        body: { refresh_token: session.refreshToken },
      });
    clearSession();
    router.push("/connexion");
  }

  if (loading || !session)
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background">
        <LoadingMessage message="Chargement de votre espace…" />
      </div>
    );
  const reload = () => loadDashboard(session, true);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,212,255,0.11),transparent_28%),#050a0f] px-5 py-10 sm:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        {error ? <Alert type="error" message={error} className="mb-6" /> : null}
        <div className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Pill>{roleLabels[session.user.role]}</Pill>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-[-0.04em] text-white sm:text-5xl">
              Bonjour, {session.user.full_name.split(" ")[0]}.
            </h1>
            <p className="mt-3 text-sm text-gray-400">
              Compte {statusLabels[session.user.status] ?? session.user.status}{" "}
              · {session.user.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className={buttonStyles({ variant: "outline" })}
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
        {session.user.role === "admin" ? (
          <AdminSpace
            session={session}
            users={users}
            applications={applications}
            plans={plans}
            settings={settings}
            auditLogs={auditLogs}
            reload={reload}
          />
        ) : null}
        {session.user.role === "receptionist" ? (
          <ReceptionSpace
            session={session}
            applications={applications}
            plans={plans}
            reload={reload}
          />
        ) : null}
        {session.user.role === "member" ? (
          <MemberDashboard
            session={session}
            user={session.user}
            subscriptions={subscriptions}
            receipts={receipts}
            attendance={attendance}
          />
        ) : null}
        {session.user.role === "coach" ? (
          <CoachDashboard session={session} />
        ) : null}
        {session.user.role === "recovery_client" ? (
          <FutureRoleDashboard role="recovery" />
        ) : null}
        {session.user.role === "cafe_employee" ? (
          <FutureRoleDashboard role="cafe" />
        ) : null}
      </div>
    </div>
  );
}

function AdminSpace({
  session,
  users,
  applications,
  plans,
  settings,
  auditLogs,
  reload,
}: {
  session: AuthSession;
  users: User[];
  applications: Application[];
  plans: Plan[];
  settings: Setting[];
  auditLogs: AuditLog[];
  reload: () => Promise<void>;
}) {
  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={UsersRound} value={users.length} label="Utilisateurs" />
        <Stat
          icon={ClipboardCheck}
          value={
            applications.filter((item) => item.status === "pending").length
          }
          label="Demandes en attente"
        />
        <Stat
          icon={CreditCard}
          value={plans.filter((plan) => plan.is_active).length}
          label="Formules actives"
        />
        <Stat
          icon={FileClock}
          value={auditLogs.length}
          label="Actions d’audit"
        />
      </div>
      <Panel
        title="Gestion des utilisateurs"
        subtitle="Créer les comptes, attribuer les rôles et gérer leur statut."
      >
        <AdminUserManager session={session} users={users} onReload={reload} />
      </Panel>
      <Panel
        title="Formules d’abonnement"
        subtitle="Créer, modifier, activer ou masquer les offres."
      >
        <AdminPlanManager session={session} plans={plans} onReload={reload} />
      </Panel>
      <Panel
        title="Paramètres métier"
        subtitle="Délais de grâce, expiration proche et fenêtre anti-doublon."
      >
        <AdminSettingsManager
          session={session}
          settings={settings}
          onReload={reload}
        />
      </Panel>
      <Panel
        title="Demandes d’adhésion"
        subtitle="Approuver, demander des informations, refuser ou encaisser."
      >
        <ApplicationManager
          session={session}
          applications={applications}
          onReload={reload}
        />
      </Panel>
      <Panel
        title="Membres, paiements et accès"
        subtitle="Recherche, abonnements, renouvellements, reçus, présences et historique."
      >
        <StaffMemberManager session={session} plans={plans} />
      </Panel>
      <Panel
        title="Journal d’audit"
        subtitle="Traçabilité des opérations sensibles."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {auditLogs.map((log) => (
            <Card key={log.id} className="p-4">
              <p className="text-sm font-bold text-white">{log.action}</p>
              <p className="mt-1 text-xs text-gray-500">
                {log.entity_type} · {formatDate(log.created_at)}
              </p>
              {log.reason ? (
                <p className="mt-2 text-xs text-gray-400">{log.reason}</p>
              ) : null}
            </Card>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ReceptionSpace({
  session,
  applications,
  plans,
  reload,
}: {
  session: AuthSession;
  applications: Application[];
  plans: Plan[];
  reload: () => Promise<void>;
}) {
  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={ClipboardCheck}
          value={
            applications.filter((item) => item.status === "pending").length
          }
          label="Demandes en attente"
        />
        <Stat
          icon={CreditCard}
          value={plans.length}
          label="Formules disponibles"
        />
        <Stat icon={Activity} value="Live" label="Contrôle d’accès" />
      </div>
      <Panel
        title="Demandes et encaissement"
        subtitle="Traiter la demande, encaisser et générer le reçu."
      >
        <ApplicationManager
          session={session}
          applications={applications}
          onReload={reload}
        />
      </Panel>
      <Panel
        title="Accueil membre"
        subtitle="Recherche, check-in, abonnements, renouvellements, reçus et présences."
      >
        <StaffMemberManager session={session} plans={plans} />
      </Panel>
    </div>
  );
}

function FutureRoleDashboard({ role }: { role: "recovery" | "cafe" }) {
  const content = {
    recovery: {
      icon: Sparkles,
      title: "Espace recovery",
      text: "Les packs, réservations et consommations demandent encore le module backend Recovery.",
      items: ["Planning recovery", "Packs clients", "Historique"],
    },
    cafe: {
      icon: Coffee,
      title: "Espace café",
      text: "Produits, stock et commandes seront activés avec le module backend Healthy Café.",
      items: ["Catalogue", "Stock", "Commandes"],
    },
  }[role];
  const Icon = content.icon;
  return (
    <div className="mt-8">
      <Panel title={content.title} subtitle={content.text}>
        <div className="grid gap-4 sm:grid-cols-3">
          {content.items.map((item) => (
            <Card key={item} className="p-6">
              <Icon className="h-7 w-7 text-primary" />
              <p className="mt-5 font-black uppercase tracking-[0.08em] text-white">
                {item}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Module métier à connecter
              </p>
            </Card>
          ))}
        </div>
      </Panel>
    </div>
  );
}

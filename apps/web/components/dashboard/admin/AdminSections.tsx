"use client";

import { useCallback, useEffect, useState } from "react";
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
  return (
    <AdminPage
      eyebrow="Suivi sportif"
      title="Coachs"
      description="Consultez les coachs, leurs clients et changez l'affectation d'un membre depuis un dossier simple."
    >
      <div className="space-y-7">
        <CoachingManager session={session} />
        <Panel
          title="Planning coaching"
          subtitle="Consultez les horaires de tous les coachs, confirmez les demandes et gerez les conflits."
        >
          <CoachingScheduleManager session={session} mode="staff" />
        </Panel>
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
  return (
    <AdminPage
      eyebrow="Catalogue, stock et ventes"
      title="Masterz Store"
      description="Gerez les produits et leur stock, puis suivez les reservations et les ventes realisees a la Reception."
    >
      <div className="space-y-7">
        <Panel
          title="Produits"
          subtitle="L'Admin est le seul a pouvoir creer, modifier ou masquer un produit."
        >
          <AdminStoreManager session={session} />
        </Panel>
        <Panel
          title="Reservations et caisse"
          subtitle="Validez les demandes clients ou enregistrez une vente directe."
        >
          <StaffStoreManager session={session} />
        </Panel>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/audit-logs", {
      headers: authorizationHeaders(session.accessToken),
      params: { query: { limit: 100 } },
    });
    setLogs(result.data ?? []);
    setError(result.error ? "Impossible de charger le journal d'audit." : null);
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <AdminPage
      eyebrow="Tracabilite"
      title="Journal d'audit"
      description="Consultez les operations sensibles realisees dans l'application."
    >
      <PageState loading={loading} error={error}>
        <Panel
          title="Dernieres actions"
          subtitle={`${logs.length} action(s) chargee(s).`}
        >
          {logs.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {logs.map((log) => (
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
          ) : (
            <EmptyState text="Aucune action d'audit." />
          )}
        </Panel>
      </PageState>
    </AdminPage>
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

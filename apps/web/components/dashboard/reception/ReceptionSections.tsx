"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Alert, Card, LoadingMessage } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders } from "@/lib/auth";
import { ApplicationManager } from "../ApplicationManager";
import { ComplaintCenter } from "../ComplaintCenter";
import { CoachingScheduleManager } from "../CoachingScheduleManager";
import { StaffCoachingAssignmentRequests } from "../CoachingAssignmentRequests";
import { StaffMemberManager } from "../StaffMemberManager";
import { RecoveryManager } from "../RecoveryManager";
import { StaffStoreManager } from "../StoreManager";
import {
  type Application,
  type Plan,
  DashboardTabs,
  Panel,
  Stat,
} from "../dashboard-shared";
import { ReceptionPage } from "./ReceptionPage";
import { useReceptionClub, useReceptionSession } from "./ReceptionShell";
import { ClubBadge, SALLE_1_ID } from "../ClubSwitcher";

const shortcuts = [
  {
    label: "Traiter les demandes",
    text: "Valider les inscriptions payees.",
    href: "/espace/reception/demandes",
    icon: ClipboardCheck,
  },
  {
    label: "Ouvrir un membre",
    text: "Consulter son dossier complet.",
    href: "/espace/reception/membres",
    icon: UsersRound,
  },
  {
    label: "Encaisser un paiement",
    text: "Creer un abonnement et un recu.",
    href: "/espace/reception/paiements",
    icon: BadgeDollarSign,
  },
  {
    label: "Enregistrer une entree",
    text: "Choisir le membre et confirmer son entree.",
    href: "/espace/reception/acces",
    icon: ShieldCheck,
  },
];

export function ReceptionOverview() {
  const session = useReceptionSession();
  const club = useReceptionClub();
  const [applications, setApplications] = useState<Application[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const headers = authorizationHeaders(session.accessToken);
    const [applicationsResult, plansResult] = await Promise.all([
      api.GET("/api/v1/membership-applications", {
        headers,
        params: { query: { club_id: club.id } },
      }),
      api.GET("/api/v1/membership-plans", {
        params: { query: { active_only: true, club_id: club.id } },
      }),
    ]);
    setApplications(applicationsResult.data ?? []);
    setPlans(plansResult.data ?? []);
    setError(
      applicationsResult.error || plansResult.error
        ? "Impossible de charger tous les indicateurs."
        : null,
    );
    setLoading(false);
  }, [club.id, session.accessToken]);

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
    <ReceptionPage
      eyebrow="Accueil et caisse"
      title={`Bonjour, ${session.user.full_name.split(" ")[0]}.`}
      description="Chaque travail de la reception a maintenant sa propre page pour aller vite sans melanger les dossiers."
    >
      {error ? <Alert type="error" message={error} className="mb-6" /> : null}
      <div className="mb-6">
        <ClubBadge clubId={club.id} />
      </div>
      {loading ? (
        <LoadingMessage message="Chargement des indicateurs..." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              icon={ClipboardCheck}
              value={pending}
              label="Demandes a traiter"
            />
            <Stat
              icon={CreditCard}
              value={plans.filter((plan) => plan.service_type === "gym").length}
              label={club.id === SALLE_1_ID ? "Formules salle" : "Pass 4 Fit"}
            />
            {club.id === SALLE_1_ID ? (
              <Stat
                icon={CreditCard}
                value={
                  plans.filter((plan) => plan.service_type === "coaching")
                    .length
                }
                label="Formules coaching"
              />
            ) : (
              <Stat
                icon={CreditCard}
                value={
                  plans.filter((plan) => plan.service_type === "martial_arts")
                    .length
                }
                label="Arts martiaux"
              />
            )}
            {club.id === SALLE_1_ID ? (
              <Stat
                icon={CreditCard}
                value={
                  plans.filter((plan) => plan.service_type === "recovery")
                    .length
                }
                label="Formules recovery"
              />
            ) : null}
          </div>

          <section className="mt-8">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-white">
              Actions rapides
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {shortcuts.map(({ label, text, href, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Card className="group flex h-full items-center gap-5 p-5 transition hover:border-primary/45 hover:bg-primary/[0.04]">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <strong className="block text-white group-hover:text-primary">
                        {label}
                      </strong>
                      <span className="mt-1 block text-xs text-gray-500">
                        {text}
                      </span>
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </ReceptionPage>
  );
}

export function ReceptionApplicationsSection() {
  const session = useReceptionSession();
  const club = useReceptionClub();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/membership-applications", {
      headers: authorizationHeaders(session.accessToken),
      params: { query: { club_id: club.id } },
    });
    setApplications(result.data ?? []);
    setError(result.error ? "Impossible de charger les demandes." : null);
    setLoading(false);
  }, [club.id, session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <ReceptionPage
      eyebrow="Nouvelles inscriptions"
      title="Demandes"
      description="Validez ici les demandes apres confirmation du paiement, puis indiquez la date de debut choisie avec le client."
    >
      <div className="mb-6">
        <ClubBadge clubId={club.id} />
      </div>
      <PageState loading={loading} error={error}>
        <Panel
          title="Demandes d'adhesion"
          subtitle={`${applications.length} demande(s) enregistree(s).`}
        >
          <ApplicationManager
            session={session}
            applications={applications}
            onReload={load}
          />
        </Panel>
      </PageState>
    </ReceptionPage>
  );
}

export function ReceptionMembersSection() {
  const session = useReceptionSession();
  const club = useReceptionClub();
  return (
    <ReceptionPage
      eyebrow="Base clients"
      title="Membres"
      description="Choisissez un membre dans la liste, puis consultez ses informations, ses abonnements, ses recus et ses entrees."
    >
      <Panel
        title="Dossier membre"
        subtitle="La liste complete apparait avant la recherche."
      >
        <StaffMemberManager
          session={session}
          plans={[]}
          mode="profile"
          clubId={club.id}
        />
      </Panel>
    </ReceptionPage>
  );
}

export function ReceptionPaymentsSection() {
  const session = useReceptionSession();
  const club = useReceptionClub();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/membership-plans", {
      params: { query: { active_only: true, club_id: club.id } },
    });
    setPlans(result.data ?? []);
    setError(result.error ? "Impossible de charger les formules." : null);
    setLoading(false);
  }, [club.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <ReceptionPage
      eyebrow="Caisse"
      title="Paiements"
      description="Choisissez le membre, le type d'offre, le montant et la date de debut avant de generer le recu."
    >
      <PageState loading={loading} error={error}>
        <Panel
          title="Paiement membre"
          subtitle={
            club.id === SALLE_1_ID
              ? "Les offres salle, coaching et recovery sont classees par categorie."
              : "Les offres Pass 4 Fit et Arts martiaux sont classees par categorie."
          }
        >
          <StaffMemberManager
            session={session}
            plans={plans}
            mode="payments"
            clubId={club.id}
          />
        </Panel>
      </PageState>
    </ReceptionPage>
  );
}

export function ReceptionAccessSection() {
  const session = useReceptionSession();
  const club = useReceptionClub();
  return (
    <ReceptionPage
      eyebrow="Accueil salle"
      title="Entrees"
      description="Selectionnez le membre puis enregistrez son passage. La duree de l'abonnement part de la date choisie au paiement."
    >
      <Panel
        title="Enregistrer une entree"
        subtitle="Cette page ne contient ni paiement ni modification de formule."
      >
        <StaffMemberManager
          session={session}
          plans={[]}
          mode="access"
          clubId={club.id}
        />
      </Panel>
    </ReceptionPage>
  );
}

export function ReceptionRecoverySection() {
  const session = useReceptionSession();
  const club = useReceptionClub();
  if (club.id !== SALLE_1_ID) {
    return (
      <ReceptionPage
        eyebrow="Service Salle 1"
        title="Recovery"
        description="Le Recovery est gere exclusivement par la Reception de la Salle 1."
      >
        <Alert
          type="info"
          message="Ce service n'est pas disponible dans la Salle 2."
        />
      </ReceptionPage>
    );
  }
  return (
    <ReceptionPage
      eyebrow="Sauna, bain froid et compression"
      title="Recovery"
      description="Choisissez un client, verifiez ses seances restantes puis enregistrez son passage. Un passage retire une seule seance."
    >
      <RecoveryManager session={session} />
    </ReceptionPage>
  );
}

export function ReceptionCoachingSection() {
  const session = useReceptionSession();
  const club = useReceptionClub();
  const [activeView, setActiveView] = useState<"requests" | "schedule">(
    "requests",
  );
  if (club.id !== SALLE_1_ID) {
    return (
      <ReceptionPage
        eyebrow="Service Salle 1"
        title="Coaching personnel"
        description="Le coaching personnel reste gere par la Reception de la Salle 1."
      >
        <Alert
          type="info"
          message="Les cours collectifs de la Salle 2 seront geres dans leur espace dedie."
        />
      </ReceptionPage>
    );
  }
  return (
    <ReceptionPage
      eyebrow="Planning des coachs"
      title="Coaching"
      description="Consultez les demandes, confirmez les seances et aidez les clients a changer leur horaire."
    >
      <div className="space-y-6">
        <DashboardTabs
          eyebrow="Taches coaching"
          ariaLabel="Rubriques coaching reception"
          activeTab={activeView}
          onChange={setActiveView}
          tabs={[
            {
              id: "requests",
              label: "Demandes de coach",
              icon: ClipboardCheck,
            },
            {
              id: "schedule",
              label: "Reservations",
              icon: CalendarDays,
            },
          ]}
        />

        <div className="min-w-0">
          {activeView === "requests" ? (
            <Panel
              title="Demandes de coach"
              subtitle="Confirmez le choix du membre ou selectionnez le coach adapte a son besoin."
            >
              <StaffCoachingAssignmentRequests session={session} />
            </Panel>
          ) : null}
          {activeView === "schedule" ? (
            <Panel
              title="Reservations coaching"
              subtitle="En cas de double reservation, le systeme vous avertit avant toute confirmation."
            >
              <CoachingScheduleManager session={session} mode="staff" />
            </Panel>
          ) : null}
        </div>
      </div>
    </ReceptionPage>
  );
}

export function ReceptionComplaintsSection() {
  const session = useReceptionSession();
  return (
    <ReceptionPage
      eyebrow="Relation membres"
      title="Reclamations"
      description="Repondez aux reclamations liees a l'accueil, aux paiements, aux abonnements et au Recovery."
    >
      <Panel
        title="Reclamations de la Reception"
        subtitle="Les dossiers de coaching, de compte ou de comportement sont diriges vers l'Administration."
      >
        <ComplaintCenter session={session} mode="staff" />
      </Panel>
    </ReceptionPage>
  );
}

export function ReceptionStoreSection() {
  const session = useReceptionSession();
  const club = useReceptionClub();
  if (club.id !== SALLE_1_ID) {
    return (
      <ReceptionPage
        eyebrow="Service Salle 1"
        title="Masterz Store"
        description="Le Store est gere exclusivement dans la Salle 1."
      >
        <Alert
          type="info"
          message="Aucune caisse Store n'est affectee a la Reception de la Salle 2."
        />
      </ReceptionPage>
    );
  }
  return (
    <ReceptionPage
      eyebrow="Reservations et ventes"
      title="Masterz Store"
      description="Validez les produits reserves par les membres et enregistrez les achats realises directement a l'accueil."
    >
      <Panel
        title="Caisse Store"
        subtitle="Le stock est mis a jour automatiquement apres validation ou vente."
      >
        <StaffStoreManager session={session} />
      </Panel>
    </ReceptionPage>
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

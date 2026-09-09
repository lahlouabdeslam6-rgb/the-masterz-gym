"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  UsersRound,
} from "lucide-react";
import { Alert, LoadingMessage } from "@masterz/ui";
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
} from "../dashboard-shared";
import { ReceptionPage } from "./ReceptionPage";
import { useReceptionClub, useReceptionSession } from "./ReceptionShell";
import { ClubBadge, SALLE_1_ID } from "../ClubSwitcher";
import {
  ActivityChart,
  activityDays,
  OverviewAction,
  OverviewGuide,
  OverviewHeading,
  OverviewMetric,
  overviewSurface,
} from "../OverviewKit";

const shortcuts = [
  {
    label: "Traiter les demandes",
    text: "Examiner les inscriptions de votre salle.",
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
];

export function ReceptionOverview() {
  const session = useReceptionSession();
  const club = useReceptionClub();
  const [applications, setApplications] = useState<Application[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referenceTime, setReferenceTime] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
      setReferenceTime(new Date());
    } catch {
      setError("Impossible de charger tous les indicateurs.");
    } finally {
      setLoading(false);
    }
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
  const awaitingPayment = applications.filter(
    (item) => item.status === "approved",
  ).length;
  const converted = applications.filter(
    (item) => item.status === "converted_to_member",
  ).length;
  const distribution = [
    { label: "À examiner", count: pending, color: "bg-primary" },
    {
      label: "En attente de paiement",
      count: awaitingPayment,
      color: "bg-amber-300",
    },
    { label: "Membres créés", count: converted, color: "bg-emerald-300" },
    {
      label: "Refusées",
      count: applications.filter((item) => item.status === "rejected").length,
      color: "bg-gray-500",
    },
  ];

  return (
    <ReceptionPage
      eyebrow="Accueil et caisse"
      title={`Bonjour, ${session.user.full_name.split(" ")[0]}.`}
      description="Les priorités de votre salle, de la demande d’inscription au reçu de paiement."
    >
      {error ? <Alert type="error" message={error} className="mb-6" /> : null}
      <div className="mb-6">
        <ClubBadge clubId={club.id} />
      </div>
      {loading ? (
        <LoadingMessage message="Chargement des indicateurs..." />
      ) : (
        <div className="space-y-6">
          <OverviewHeading
            eyebrow={`Votre poste d’accueil · ${club.label}`}
            title="Un accueil fluide, des dossiers à jour."
            description="Commencez par les demandes à examiner, puis finalisez les inscriptions approuvées."
          />
          <div className="grid gap-3 md:grid-cols-3">
            {shortcuts.map((item) => (
              <OverviewAction
                key={item.href}
                title={item.label}
                description={item.text}
                href={item.href}
                icon={item.icon}
                featured={item.href.endsWith("demandes")}
              />
            ))}
          </div>
          {error ? (
            <p className="rounded-xl border border-white/10 p-5 text-sm text-gray-400">
              Les indicateurs sont temporairement indisponibles. Vos pages de
              travail restent accessibles.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <OverviewMetric
                  icon={ClipboardCheck}
                  value={pending}
                  label="Demandes à traiter"
                  detail="Nouvelles ou à compléter"
                />
                <OverviewMetric
                  icon={BadgeDollarSign}
                  value={awaitingPayment}
                  label="À encaisser"
                  detail="Inscriptions approuvées, non finalisées"
                />
                <OverviewMetric
                  icon={UsersRound}
                  value={converted}
                  label="Inscriptions finalisées"
                  detail="Comptes créés depuis les demandes"
                />
                <OverviewMetric
                  icon={CreditCard}
                  value={plans.length}
                  label="Formules disponibles"
                  detail={`Offres actives · ${club.label}`}
                />
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <ActivityChart
                  title="Les nouvelles demandes"
                  description={`${club.label} · Créées au cours des 7 derniers jours`}
                  data={activityDays(
                    applications.map((item) => item.created_at),
                    referenceTime,
                  )}
                  emptyText="Aucune nouvelle demande sur cette période."
                />
                <section
                  className={overviewSurface}
                  aria-label="Suivi des inscriptions"
                >
                  <h3 className="text-lg font-semibold text-white">
                    Où en sont les inscriptions ?
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    {applications.length} dossier(s) · {club.label} uniquement
                  </p>
                  <ul className="mt-6 space-y-5">
                    {distribution.map((item) => (
                      <li key={item.label}>
                        <div className="mb-2 flex justify-between gap-3 text-xs text-gray-300">
                          <span>{item.label}</span>
                          <span className="font-semibold tabular-nums text-white">
                            {item.count}
                          </span>
                        </div>
                        <div
                          className="h-1.5 overflow-hidden rounded-full bg-white/[.06]"
                          aria-hidden="true"
                        >
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{
                              width: `${(item.count / Math.max(1, applications.length)) * 100}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}
          <OverviewGuide
            steps={[
              {
                title: "Examiner la demande",
                text: "Vérifiez le dossier et la formule choisie. Demandez un complément si nécessaire.",
              },
              {
                title: "Valider et encaisser",
                text: "Après approbation, confirmez la formule, la date de début et le paiement avec le client.",
              },
              {
                title: "Remettre le reçu",
                text: "Le paiement finalise l’inscription. Retrouvez ensuite le membre et ses renouvellements dans son dossier.",
              },
            ]}
          />
        </div>
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

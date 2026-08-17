"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  ClipboardCheck,
  CreditCard,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Alert, Card, LoadingMessage } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders } from "@/lib/auth";
import { ApplicationManager } from "../ApplicationManager";
import { StaffMemberManager } from "../StaffMemberManager";
import { type Application, type Plan, Panel, Stat } from "../dashboard-shared";
import { ReceptionPage } from "./ReceptionPage";
import { useReceptionSession } from "./ReceptionShell";

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
  const [applications, setApplications] = useState<Application[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const headers = authorizationHeaders(session.accessToken);
    const [applicationsResult, plansResult] = await Promise.all([
      api.GET("/api/v1/membership-applications", { headers }),
      api.GET("/api/v1/membership-plans", {
        params: { query: { active_only: true } },
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
    <ReceptionPage
      eyebrow="Accueil et caisse"
      title={`Bonjour, ${session.user.full_name.split(" ")[0]}.`}
      description="Chaque travail de la reception a maintenant sa propre page pour aller vite sans melanger les dossiers."
    >
      {error ? <Alert type="error" message={error} className="mb-6" /> : null}
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
              label="Formules salle"
            />
            <Stat
              icon={CreditCard}
              value={
                plans.filter((plan) => plan.service_type === "coaching").length
              }
              label="Formules coaching"
            />
            <Stat
              icon={CreditCard}
              value={
                plans.filter((plan) => plan.service_type === "recovery").length
              }
              label="Formules recovery"
            />
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
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/membership-applications", {
      headers: authorizationHeaders(session.accessToken),
    });
    setApplications(result.data ?? []);
    setError(result.error ? "Impossible de charger les demandes." : null);
    setLoading(false);
  }, [session.accessToken]);

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
        <StaffMemberManager session={session} plans={[]} mode="profile" />
      </Panel>
    </ReceptionPage>
  );
}

export function ReceptionPaymentsSection() {
  const session = useReceptionSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/membership-plans", {
      params: { query: { active_only: true } },
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
    <ReceptionPage
      eyebrow="Caisse"
      title="Paiements"
      description="Choisissez le membre, le type d'offre, le montant et la date de debut avant de generer le recu."
    >
      <PageState loading={loading} error={error}>
        <Panel
          title="Paiement membre"
          subtitle="Les offres salle, coaching et recovery sont classees par categorie."
        >
          <StaffMemberManager session={session} plans={plans} mode="payments" />
        </Panel>
      </PageState>
    </ReceptionPage>
  );
}

export function ReceptionAccessSection() {
  const session = useReceptionSession();
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
        <StaffMemberManager session={session} plans={[]} mode="access" />
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

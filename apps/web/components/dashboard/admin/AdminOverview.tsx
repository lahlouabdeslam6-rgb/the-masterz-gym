"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  FileClock,
  Layers3,
  PackageOpen,
  Settings2,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";
import { Alert, Card, LoadingMessage } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders } from "@/lib/auth";
import {
  type Application,
  type AuditLog,
  type Plan,
  type User,
  Stat,
} from "../dashboard-shared";
import { AdminPage } from "./AdminPage";
import { useAdminSession } from "./AdminShell";

const shortcuts = [
  {
    label: "Gerer les membres",
    href: "/espace/admin/membres",
    icon: UsersRound,
  },
  {
    label: "Traiter les demandes",
    href: "/espace/admin/demandes",
    icon: ClipboardCheck,
  },
  {
    label: "Enregistrer un paiement",
    href: "/espace/admin/paiements",
    icon: BadgeDollarSign,
  },
  {
    label: "Controler un acces",
    href: "/espace/admin/acces",
    icon: ShieldCheck,
  },
  {
    label: "Modifier les formules",
    href: "/espace/admin/formules",
    icon: CreditCard,
  },
  {
    label: "Ouvrir les parametres",
    href: "/espace/admin/parametres",
    icon: Settings2,
  },
];

const futureModules = [
  {
    title: "Coaching",
    text: "Coachs, clients attribues, tests et progression.",
    icon: Dumbbell,
  },
  {
    title: "Recovery",
    text: "Packs sauna, bain froid et compression.",
    icon: Layers3,
  },
  {
    title: "Boutique",
    text: "Catalogue, reservations, ventes et stock.",
    icon: Store,
  },
  {
    title: "Deux clubs",
    text: "Cours, acces croise et offres configurables.",
    icon: PackageOpen,
  },
];

export function AdminOverview() {
  const { session } = useAdminSession();
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const headers = authorizationHeaders(session.accessToken);
    const [usersResult, applicationsResult, plansResult, auditResult] =
      await Promise.all([
        api.GET("/api/v1/users", {
          headers,
          params: { query: { limit: 500 } },
        }),
        api.GET("/api/v1/membership-applications", { headers }),
        api.GET("/api/v1/membership-plans", {
          params: { query: { active_only: false } },
        }),
        api.GET("/api/v1/audit-logs", {
          headers,
          params: { query: { limit: 100 } },
        }),
      ]);

    if (
      usersResult.error ||
      applicationsResult.error ||
      plansResult.error ||
      auditResult.error
    ) {
      setError("Impossible de charger toutes les donnees du tableau de bord.");
    }
    setUsers(usersResult.data ?? []);
    setApplications(applicationsResult.data ?? []);
    setPlans(plansResult.data ?? []);
    setAuditLogs(auditResult.data ?? []);
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <AdminPage
      eyebrow="Pilotage global"
      title={`Bonjour, ${session.user.full_name.split(" ")[0]}.`}
      description="Une vue rapide de la salle. Chaque operation detaillee se trouve maintenant dans sa propre page."
    >
      {error ? <Alert type="error" message={error} className="mb-6" /> : null}
      {loading ? (
        <LoadingMessage message="Chargement des indicateurs..." />
      ) : (
        <>
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
              label="Actions tracees"
            />
          </div>

          <section className="mt-8">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-white">
              Actions rapides
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shortcuts.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-4 rounded-lg border border-white/10 bg-[#091119]/90 p-5 transition hover:border-primary/50 hover:bg-primary/[0.05]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-bold text-white group-hover:text-primary">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-9 border-t border-white/10 pt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-white">
                  Prochaines parties
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Elles seront developpees une par une apres cette structure.
                </p>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Roadmap validee
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {futureModules.map(({ title, text, icon: Icon }) => (
                <Card key={title} className="p-5">
                  <Icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 font-black uppercase text-white">
                    {title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-gray-500">{text}</p>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </AdminPage>
  );
}

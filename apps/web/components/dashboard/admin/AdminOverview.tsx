"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeDollarSign,
  CalendarCheck2,
  ClipboardCheck,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UsersRound,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Card, LoadingMessage } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders } from "@/lib/auth";
import { AdminPage } from "./AdminPage";
import { useAdminSession } from "./AdminShell";

type Dashboard = components["schemas"]["AdminDashboardRead"];
type MonthlyPoint = components["schemas"]["DashboardMonthlyPoint"];

const periods = [3, 6, 12] as const;

const serviceLabels = {
  gym: "Salle musculation",
  coaching: "Coaching",
  recovery: "Recovery",
  martial_arts: "Arts martiaux",
} as const;

const paymentLabels = {
  cash: "Especes",
  bank_card: "Carte",
  bank_transfer: "Virement",
} as const;

const statusLabels = {
  active: "Actifs",
  expiring_soon: "Bientot expires",
  grace_period: "Periode de grace",
  suspended: "Suspendus",
  expired: "Expires",
  cancelled: "Annules",
  sessions_exhausted: "Seances epuisees",
  service_completed: "Services termines",
} as const;

const statusColors = {
  active: "#52e8bd",
  expiring_soon: "#ffd166",
  grace_period: "#f59e0b",
  suspended: "#8b9bb1",
  expired: "#ef476f",
  cancelled: "#5f6b7a",
  sessions_exhausted: "#f97316",
  service_completed: "#8b5cf6",
} as const;

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
    label: "Controler les entrees",
    href: "/espace/admin/acces",
    icon: ShieldCheck,
  },
];

export function AdminOverview() {
  const { session } = useAdminSession();
  const [period, setPeriod] = useState<(typeof periods)[number]>(6);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api.GET("/api/v1/admin/analytics/dashboard", {
      headers: authorizationHeaders(session.accessToken),
      params: { query: { months: period } },
    });
    setDashboard(result.data ?? null);
    setError(
      result.error
        ? "Les statistiques n'ont pas pu etre chargees. Reessayez dans un instant."
        : null,
    );
    setLoading(false);
  }, [period, session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <AdminPage
      eyebrow="Pilotage et performance"
      title="Tableau de bord"
      description="Suivez les membres, les abonnements et les encaissements avec des indicateurs simples bases sur les donnees reelles de la salle."
    >
      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-white/10 bg-[#081119]/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Periode analysee
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Les montants comptent les paiements valides, meme termines, et
            excluent les abonnements annules.
          </p>
        </div>
        <div
          className="grid grid-cols-3 gap-1 rounded-sm border border-white/10 bg-black/30 p-1"
          aria-label="Choisir la periode du tableau de bord"
        >
          {periods.map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => setPeriod(months)}
              className={`min-w-20 rounded-sm px-4 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
                period === months
                  ? "bg-primary text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {months} mois
            </button>
          ))}
        </div>
      </div>

      {error ? <Alert type="error" message={error} className="mb-6" /> : null}
      {loading ? (
        <LoadingMessage message="Calcul des indicateurs..." />
      ) : dashboard ? (
        <DashboardContent dashboard={dashboard} />
      ) : null}
    </AdminPage>
  );
}

function DashboardContent({ dashboard }: { dashboard: Dashboard }) {
  const { metrics } = dashboard;
  const currency = dashboard.currency;
  const delta = metrics.revenue_change_percent;

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={BadgeDollarSign}
          label={`Revenu sur ${dashboard.period_months} mois`}
          value={formatMoney(metrics.revenue, currency)}
          detail={
            delta === null
              ? "Premiere periode mesuree"
              : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs periode precedente`
          }
          tone={delta !== null && delta < 0 ? "warning" : "positive"}
        />
        <KpiCard
          icon={UserCheck}
          label="Membres actifs"
          value={metrics.active_member_count}
          detail={`${metrics.member_count} membres au total`}
        />
        <KpiCard
          icon={CreditCard}
          label="Abonnements actifs"
          value={metrics.active_subscriptions}
          detail={`${metrics.expiring_subscriptions} arrivent bientot a terme`}
          tone={metrics.expiring_subscriptions ? "warning" : "neutral"}
        />
        <KpiCard
          icon={CalendarCheck2}
          label="Activite de la salle"
          value={metrics.check_ins}
          detail={`${metrics.payment_count} paiements enregistres`}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden p-5 sm:p-7">
          <SectionHeading
            eyebrow="Evolution financiere"
            title="Revenu par mois"
            detail={formatMoney(metrics.revenue, currency)}
          />
          <RevenueChart points={dashboard.monthly} currency={currency} />
        </Card>

        <Card className="p-5 sm:p-7">
          <SectionHeading
            eyebrow="Portefeuille clients"
            title="Etat des abonnements"
            detail={`${metrics.active_subscriptions} actifs`}
          />
          <SubscriptionDonut items={dashboard.subscription_statuses} />
        </Card>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-7">
          <SectionHeading
            eyebrow="Repartition du chiffre"
            title="Revenu par activite"
            detail={`${metrics.payment_count} paiements`}
          />
          <BarList
            items={dashboard.service_revenue.map((item) => ({
              key: item.service_type,
              label: serviceLabels[item.service_type],
              value: Number(item.amount),
              displayValue: formatMoney(item.amount, currency),
              note: `${item.payments} paiement(s)`,
            }))}
          />
        </Card>

        <Card className="p-5 sm:p-7">
          <SectionHeading
            eyebrow="Encaissements"
            title="Modes de paiement"
            detail={`${metrics.pending_applications} demande(s) en attente`}
          />
          <BarList
            items={dashboard.payment_methods.map((item) => ({
              key: item.method,
              label: paymentLabels[item.method],
              value: Number(item.amount),
              displayValue: formatMoney(item.amount, currency),
              note: `${item.payments} operation(s)`,
            }))}
          />
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Card className="p-5 sm:p-7">
          <SectionHeading
            eyebrow="Croissance"
            title="Nouveaux membres"
            detail={`${dashboard.monthly.reduce((sum, point) => sum + point.new_members, 0)} sur la periode`}
          />
          <MemberGrowth points={dashboard.monthly} />
        </Card>

        <Card className="p-5 sm:p-7">
          <SectionHeading
            eyebrow="Navigation rapide"
            title="Actions essentielles"
            detail="Acces direct"
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {shortcuts.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between gap-4 rounded-sm border border-white/10 bg-black/20 p-4 transition hover:border-primary/50 hover:bg-primary/[0.06]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-black text-white">{label}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-gray-600 transition group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
  detail: string;
  tone?: "neutral" | "positive" | "warning";
}) {
  const detailColor =
    tone === "positive"
      ? "text-[#52e8bd]"
      : tone === "warning"
        ? "text-[#ffd166]"
        : "text-gray-500";
  return (
    <Card data-testid="admin-kpi-card" className="relative overflow-hidden p-5">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/[0.06] blur-xl" />
      <div className="relative min-w-0 pr-14">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-gray-500">
          {label}
        </p>
        <p className="mt-4 break-words text-3xl font-black leading-none tracking-tight text-white">
          {value}
        </p>
      </div>
      <span className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-sm bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className={`relative mt-4 text-xs font-bold ${detailColor}`}>
        {detail}
      </p>
    </Card>
  );
}

function SectionHeading({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">
        {detail}
      </p>
    </div>
  );
}

function RevenueChart({
  points,
  currency,
}: {
  points: MonthlyPoint[];
  currency: string | null;
}) {
  const chart = useMemo(() => {
    const width = 720;
    const baseline = 185;
    const values = points.map((point) => Number(point.revenue));
    const maximum = Math.max(...values, 1);
    const coordinates = values.map((value, index) => ({
      x: points.length <= 1 ? width / 2 : (index / (points.length - 1)) * width,
      y: baseline - (value / maximum) * 135,
    }));
    const line = coordinates
      .map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`)
      .join(" ");
    const area = coordinates.length
      ? `${line} L${coordinates.at(-1)!.x},${baseline} L${coordinates[0].x},${baseline} Z`
      : "";
    return { width, baseline, coordinates, line, area, maximum };
  }, [points]);

  return (
    <div className="mt-7">
      <div className="rounded-sm border border-white/[0.07] bg-black/20 px-3 pt-5">
        <svg
          viewBox={`-18 0 ${chart.width + 36} 230`}
          className="h-auto min-h-56 w-full overflow-visible"
          role="img"
          aria-label="Evolution du revenu mensuel"
        >
          <defs>
            <linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[50, 95, 140, 185].map((y) => (
            <line
              key={y}
              x1="0"
              x2={chart.width}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 7"
            />
          ))}
          {chart.area ? (
            <path d={chart.area} fill="url(#revenue-area)" />
          ) : null}
          {chart.line ? (
            <path
              d={chart.line}
              fill="none"
              stroke="#00d4ff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {chart.coordinates.map((coordinate, index) => (
            <g key={points[index].month}>
              <circle
                cx={coordinate.x}
                cy={coordinate.y}
                r="6"
                fill="#071018"
                stroke="#52e8bd"
                strokeWidth="3"
              />
              <text
                x={coordinate.x}
                y="215"
                textAnchor="middle"
                fill="#78879a"
                fontSize="12"
                fontWeight="700"
              >
                {formatMonth(points[index].month)}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
        <span>Pic mensuel</span>
        <strong className="text-white">
          {formatMoney(chart.maximum, currency)}
        </strong>
      </div>
    </div>
  );
}

function SubscriptionDonut({
  items,
}: {
  items: Dashboard["subscription_statuses"];
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let cursor = 0;
  const segments = items
    .filter((item) => item.count > 0)
    .map((item) => {
      const start = cursor;
      cursor += total ? (item.count / total) * 100 : 0;
      return `${statusColors[item.status]} ${start}% ${cursor}%`;
    });
  const background = total
    ? `conic-gradient(${segments.join(", ")})`
    : "rgba(255,255,255,0.06)";

  return (
    <div className="mt-7">
      <div
        className="mx-auto grid h-44 w-44 place-items-center rounded-full p-5"
        style={{ background }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-[#091119] text-center shadow-inner">
          <div>
            <p className="text-4xl font-black text-white">{total}</p>
            <p className="mt-1 text-[0.6rem] font-black uppercase tracking-[0.16em] text-gray-500">
              Abonnements
            </p>
          </div>
        </div>
      </div>
      <div className="mt-7 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.status}
            className="flex items-center justify-between gap-3 rounded-sm border border-white/[0.07] bg-black/20 px-3 py-2"
          >
            <span className="flex min-w-0 items-center gap-2 text-xs text-gray-400">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: statusColors[item.status] }}
              />
              <span className="truncate">{statusLabels[item.status]}</span>
            </span>
            <strong className="text-sm text-white">{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarList({
  items,
}: {
  items: Array<{
    key: string;
    label: string;
    value: number;
    displayValue: string;
    note: string;
  }>;
}) {
  const maximum = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="mt-7 space-y-5">
      {items.map((item) => (
        <div key={item.key}>
          <div className="mb-2 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-white">{item.label}</p>
              <p className="mt-1 text-xs text-gray-600">{item.note}</p>
            </div>
            <p className="text-sm font-black text-primary">
              {item.displayValue}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#52e8bd] transition-all duration-500"
              style={{ width: `${(item.value / maximum) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberGrowth({ points }: { points: MonthlyPoint[] }) {
  const maximum = Math.max(...points.map((point) => point.new_members), 1);
  return (
    <div className="mt-7 flex h-48 items-end gap-3 rounded-sm border border-white/[0.07] bg-black/20 p-5">
      {points.map((point) => (
        <div
          key={point.month}
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
        >
          <span className="text-xs font-black text-white">
            {point.new_members}
          </span>
          <div
            className="min-h-1 w-full max-w-12 rounded-t-sm bg-gradient-to-t from-primary/50 to-primary"
            style={{
              height: `${Math.max((point.new_members / maximum) * 100, 3)}%`,
            }}
          />
          <span className="text-[0.6rem] font-bold uppercase text-gray-600">
            {formatMonth(point.month)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatMoney(value: string | number, currency: string | null) {
  const amount = Number(value);
  if (!currency) {
    return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 2 }).format(
      amount,
    );
  }
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-MA", { month: "short" })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(".", "");
}

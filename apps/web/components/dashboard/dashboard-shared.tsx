import { ChevronRight, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { components } from "@masterz/api-client";
import { Card } from "@masterz/ui";

export type User = components["schemas"]["UserRead"];
export type Application = components["schemas"]["ApplicationRead"];
export type Plan = components["schemas"]["MembershipPlanRead"];
export type Setting = components["schemas"]["SettingRead"];
export type Subscription = components["schemas"]["SubscriptionRead"];
export type SubscriptionEvent = components["schemas"]["SubscriptionEventRead"];
export type Receipt = components["schemas"]["PrintableReceiptData"];
export type Attendance = components["schemas"]["AttendanceRead"];
export type AuditLog = components["schemas"]["AuditLogRead"];
export type MemberSearch = components["schemas"]["MemberSearchResult"];
export type MemberSubscriptionSummary =
  components["schemas"]["MemberSubscriptionSummary"];
export type CoachSummary = components["schemas"]["CoachSummary"];
export type CoachingAssignment =
  components["schemas"]["CoachMemberAssignmentRead"];
export type CoachingTracking = components["schemas"]["CoachingTrackingRead"];
export type CoachingAssessment =
  components["schemas"]["CoachingAssessmentRead"];
export type CoachingTestType = components["schemas"]["CoachingTestType"];

export const roleLabels: Record<User["role"], string> = {
  admin: "Administration",
  receptionist: "Réception",
  coach: "Coaching",
  member: "Membre",
  recovery_client: "Recovery",
  cafe_employee: "Healthy Café",
};

export const statusLabels: Record<string, string> = {
  active: "Actif",
  pending_activation: "À activer",
  suspended: "Suspendu",
  disabled: "Désactivé",
  pending: "En attente",
  more_information_required: "Informations requises",
  approved: "Approuvée",
  rejected: "Refusée",
  converted_to_member: "Convertie",
  expiring_soon: "Expire bientôt",
  grace_period: "Période de grâce",
  expired: "Expiré",
  cancelled: "Annulé",
  allowed: "Accès autorisé",
  allowed_with_warning: "Autorisé avec alerte",
  exceptional_access: "Accès exceptionnel",
  denied: "Accès refusé",
  none: "Sans abonnement",
};

export function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-white/10 bg-[#091119]/90 p-5 shadow-2xl sm:p-7 ${className}`}
    >
      <h2 className="font-display text-2xl font-black uppercase tracking-[-0.03em] text-white">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-gray-500">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function DashboardTabs<T extends string>({
  eyebrow,
  ariaLabel,
  activeTab,
  tabs,
  onChange,
}: {
  eyebrow: string;
  ariaLabel: string;
  activeTab: T;
  tabs: Array<{
    id: T;
    label: string;
    icon: LucideIcon;
    badge?: string | number;
  }>;
  onChange: (tab: T) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#081119]/95 p-3 shadow-xl sm:p-4">
      <p className="px-2 pb-3 text-[0.65rem] font-black uppercase tracking-[0.18em] text-gray-500">
        {eyebrow}
      </p>
      <nav
        aria-label={ariaLabel}
        className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]"
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              onClick={() => onChange(tab.id)}
              className={`group grid min-h-24 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-sm border px-5 py-4 text-left transition ${
                active
                  ? "border-primary/70 bg-primary/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(0,212,255,0.08)]"
                  : "border-white/10 bg-black/20 text-gray-400 hover:border-primary/35 hover:bg-primary/[0.05] hover:text-white"
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-sm ${
                  active
                    ? "bg-primary text-black"
                    : "bg-white/[0.04] text-primary"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.62rem] font-black uppercase tracking-[0.14em] text-gray-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-1 block font-black text-current">
                  {tab.label}
                </span>
              </span>
              {tab.badge !== undefined ? (
                <span
                  className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-black ${
                    active
                      ? "bg-primary text-black"
                      : "bg-white/[0.05] text-gray-400"
                  }`}
                >
                  {tab.badge}
                </span>
              ) : (
                <ChevronRight
                  className={`h-4 w-4 transition group-hover:translate-x-0.5 ${
                    active ? "text-primary" : "text-gray-600"
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>
    </section>
  );
}

export function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
}) {
  return (
    <Card className="p-5">
      <Icon className="h-6 w-6 text-primary" />
      <p className="mt-5 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>
    </Card>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-sm border border-dashed border-white/15 p-8 text-center">
      <UserRound className="mx-auto h-7 w-7 text-gray-600" />
      <p className="mt-3 text-sm text-gray-500">{text}</p>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2 text-xs font-black uppercase tracking-[0.12em] text-gray-400">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const selectClass =
  "h-12 w-full rounded-sm border border-white/15 bg-[#050a0f] px-3 text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
export const textareaClass =
  "w-full rounded-sm border border-white/15 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-bold text-white">{value}</dd>
    </div>
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value));
}

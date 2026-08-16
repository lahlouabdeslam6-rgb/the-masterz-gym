import { UserRound } from "lucide-react";
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

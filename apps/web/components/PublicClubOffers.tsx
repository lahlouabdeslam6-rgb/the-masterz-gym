"use client";

import { useState } from "react";
import {
  Activity,
  Check,
  Dumbbell,
  HeartPulse,
  Shield,
  UsersRound,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { MembershipPlansList } from "@/components/MembershipPlansList";
import { publicClubs, SALLE_1_ID, SALLE_2_ID } from "@/lib/clubs";

type ServiceType = components["schemas"]["MembershipPlanRead"]["service_type"];

const serviceTabs: Array<{
  id: ServiceType;
  label: string;
  icon: typeof Dumbbell;
}> = [
  { id: "gym", label: "Abonnement salle", icon: Dumbbell },
  { id: "coaching", label: "Coaching", icon: Activity },
  { id: "recovery", label: "Recovery", icon: HeartPulse },
  { id: "martial_arts", label: "Arts martiaux", icon: Shield },
];

export function PublicClubOffers({
  initialClubId = SALLE_1_ID,
}: {
  initialClubId?: string;
}) {
  const [clubId, setClubId] = useState<string>(
    initialClubId === SALLE_2_ID ? SALLE_2_ID : SALLE_1_ID,
  );
  const [serviceType, setServiceType] = useState<ServiceType>("gym");
  const visibleServiceTabs = serviceTabs
    .filter((tab) =>
      clubId === SALLE_2_ID
        ? tab.id === "gym" || tab.id === "martial_arts"
        : tab.id !== "martial_arts",
    )
    .map((tab) =>
      clubId === SALLE_2_ID && tab.id === "gym"
        ? { ...tab, label: "Pass 4 Fit" }
        : tab,
    );

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-[0.65rem] font-bold text-primary">
          01
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          Choisissez votre club
        </p>
      </div>
      <div className="mb-7 grid gap-3 sm:grid-cols-2">
        {publicClubs.map((club, index) => {
          const active = club.id === clubId;
          const Icon = index === 0 ? Dumbbell : UsersRound;
          return (
            <button
              key={club.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setClubId(club.id);
                setServiceType("gym");
              }}
              className={`group relative flex min-h-28 items-center gap-4 overflow-hidden rounded-2xl border p-5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-6 ${
                active
                  ? "border-primary/55 bg-[linear-gradient(120deg,rgba(0,212,255,0.12),rgba(7,16,24,0.95))] shadow-[inset_0_1px_0_rgba(0,212,255,0.1),0_8px_32px_rgba(0,0,0,0.12)]"
                  : "border-white/10 bg-[#071018] hover:border-primary/35 hover:bg-primary/[0.04]"
              }`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition ${active ? "border-primary/25 bg-primary/15 text-primary" : "border-white/10 bg-white/[0.03] text-gray-400 group-hover:text-primary"}`}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`mb-1.5 block text-[0.6rem] font-bold uppercase tracking-[0.18em] ${active ? "text-primary" : "text-gray-400"}`}
                >
                  {club.internalName}
                </span>
                <span className="block text-sm font-bold text-white sm:text-base">
                  {club.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-gray-400">
                  {index === 0
                    ? "Musculation, cardio & accompagnement"
                    : "Fitness, cours collectifs & arts martiaux"}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active ? "border-primary bg-primary text-[#031116]" : "border-white/20 bg-black/10"}`}
              >
                {active ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-[0.65rem] font-bold text-primary">
          02
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          Choisissez votre activité
        </p>
      </div>
      <div
        className={`mb-7 grid gap-3 ${clubId === SALLE_2_ID ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
        role="tablist"
        aria-label="Categories d'abonnement"
      >
        {visibleServiceTabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === serviceType;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-label={tab.label}
              aria-selected={active}
              onClick={() => setServiceType(tab.id)}
              className={`relative flex flex-col gap-3 rounded-2xl border p-5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 motion-safe:hover:-translate-y-0.5 ${
                active
                  ? "border-primary/50 bg-primary/[0.07] shadow-[inset_0_1px_0_rgba(0,212,255,0.12)]"
                  : "border-white/10 bg-[#071018] hover:border-primary/30 hover:bg-primary/[0.03]"
              }`}
            >
              <span className="flex w-full items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-primary/15 text-primary" : "bg-white/5 text-gray-400"}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span
                  className={`flex-1 text-sm font-semibold ${active ? "text-primary" : "text-gray-200"}`}
                >
                  {tab.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-primary bg-primary text-[#031116]" : "border-white/15"}`}
                >
                  {active ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : null}
                </span>
              </span>
              {clubId === SALLE_2_ID ? (
                <span className="text-sm leading-6 text-gray-400">
                  {tab.id === "gym"
                    ? "Un seul abonnement pour le fitness, le CrossFit, la musculation et les cours collectifs."
                    : "Un abonnement par séances, distinct du Pass 4 Fit. L’accès à la musculation est inclus uniquement pendant votre cours."}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <MembershipPlansList
        key={`${clubId}-${serviceType}`}
        clubId={clubId}
        serviceType={serviceType}
        showPromotions
      />
    </div>
  );
}

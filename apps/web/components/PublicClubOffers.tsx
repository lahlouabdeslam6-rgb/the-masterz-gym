"use client";

import { useState } from "react";
import {
  Activity,
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
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {publicClubs.map((club, index) => {
          const active = club.id === clubId;
          const Icon = index === 0 ? Dumbbell : UsersRound;
          return (
            <button
              key={club.id}
              type="button"
              onClick={() => {
                setClubId(club.id);
                setServiceType("gym");
              }}
              className={`flex min-h-24 items-center gap-4 border px-5 py-4 text-left transition ${
                active
                  ? "border-primary bg-primary/[0.1]"
                  : "border-white/10 bg-black/20 hover:border-primary/35"
              }`}
            >
              <Icon className="h-6 w-6 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-black uppercase text-white">
                  {club.name}
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  {club.signature}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {clubId === SALLE_2_ID ? (
        <div className="mb-8 grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-2">
          <div className="bg-[#071018] p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Pass 4 Fit
            </p>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Fitness, CrossFit, musculation et cours collectifs dans une meme
              formule.
            </p>
          </div>
          <div className="bg-[#071018] p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">
              Arts martiaux
            </p>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Formules par seances, separees du Pass 4 Fit. La musculation est
              accessible uniquement pendant le creneau du cours.
            </p>
          </div>
        </div>
      ) : null}
      <div
        className="mb-8 grid gap-2 rounded-lg border border-white/10 bg-black/20 p-2 sm:grid-cols-3"
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
              aria-selected={active}
              onClick={() => setServiceType(tab.id)}
              className={`flex min-h-14 items-center justify-center gap-3 border px-4 text-xs font-black uppercase tracking-[0.08em] transition ${
                active
                  ? "border-primary bg-primary/[0.12] text-primary"
                  : "border-transparent text-gray-500 hover:border-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
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

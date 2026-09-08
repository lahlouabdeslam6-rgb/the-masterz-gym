"use client";

import { Building2, Check } from "lucide-react";
import type { components } from "@masterz/api-client";

export type Club = components["schemas"]["ClubRead"];

export const SALLE_1_ID = "11111111-1111-4111-8111-111111111111";
export const SALLE_2_ID = "22222222-2222-4222-8222-222222222222";

export const defaultClubs: Club[] = [
  {
    id: SALLE_1_ID,
    name: "Morocco Master Gym",
    label: "Salle 1",
    slug: "salle-1",
    address: null,
    is_active: true,
  },
  {
    id: SALLE_2_ID,
    name: "Morocco Master Gym",
    label: "Salle 2",
    slug: "salle-2",
    address: null,
    is_active: true,
  },
];

export function clubLabel(clubId: string | null | undefined) {
  return clubId === SALLE_2_ID ? "Salle 2" : "Salle 1";
}

export function ClubBadge({ clubId }: { clubId: string | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em] text-primary">
      <Building2 className="h-3.5 w-3.5" /> {clubLabel(clubId)}
    </span>
  );
}

export function ClubSwitcher({
  clubs = defaultClubs,
  selectedClubId,
  onChange,
  title = "Choisir la salle",
}: {
  clubs?: Club[];
  selectedClubId: string;
  onChange: (clubId: string) => void;
  title?: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#081119]/95 p-3 sm:p-4">
      <p className="px-1 pb-3 text-[0.65rem] font-black uppercase tracking-[0.18em] text-gray-500">
        {title}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {clubs.map((club) => {
          const active = selectedClubId === club.id;
          return (
            <button
              key={club.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(club.id)}
              className={`flex min-h-24 items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? "border-primary/50 bg-[linear-gradient(120deg,rgba(0,212,255,.12),rgba(7,16,24,.95))] text-white shadow-[inset_0_1px_0_rgba(0,212,255,.12)]"
                  : "border-white/10 bg-black/20 text-gray-400 hover:border-primary/35 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    active
                      ? "border-primary/25 bg-primary/15 text-primary"
                      : "border-white/10 bg-white/5 text-gray-400"
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                </span>
                <span>
                  <strong className="block text-sm font-semibold">
                    {club.label}
                  </strong>
                  <span className="mt-1 block text-xs font-normal leading-5 text-gray-400">
                    {club.id === SALLE_1_ID
                      ? "Musculation & accompagnement"
                      : "Cours collectifs"}
                  </span>
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active ? "border-primary bg-primary text-[#031116]" : "border-white/20"}`}
              >
                {active ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

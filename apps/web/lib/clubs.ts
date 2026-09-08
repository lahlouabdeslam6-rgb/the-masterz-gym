export const SALLE_1_ID = "11111111-1111-4111-8111-111111111111";
export const SALLE_2_ID = "22222222-2222-4222-8222-222222222222";

export const publicClubs = [
  {
    id: SALLE_1_ID,
    query: "salle-1",
    slug: "masterz-gym",
    name: "The Masterz Gym",
    internalName: "Salle 1",
    signature: "Strength & Performance",
    description:
      "Musculation, cardio, coaching personnel et recovery dans un parcours complet.",
    href: "/clubs/masterz-gym",
    accent: "cyan" as const,
  },
  {
    id: SALLE_2_ID,
    query: "salle-2",
    slug: "masterz-4-fit",
    name: "The Masterz Gym 4 Fit",
    internalName: "Salle 2",
    signature: "Cours collectifs & Energy",
    description:
      "Fitness, CrossFit, musculation et cours collectifs portes par l energie du groupe.",
    href: "/clubs/masterz-4-fit",
    accent: "orange" as const,
  },
] as const;

export type PublicClub = (typeof publicClubs)[number];

export function publicClubForId(clubId?: string | null) {
  return publicClubs.find((club) => club.id === clubId) ?? publicClubs[0];
}

export function publicClubForQuery(query?: string | null) {
  return publicClubs.find((club) => club.query === query) ?? publicClubs[0];
}

export function registrationHref(clubId: string, planId?: string) {
  const club = publicClubForId(clubId);
  const params = new URLSearchParams({ club: club.query });
  if (planId) params.set("plan", planId);
  return `/inscription?${params.toString()}`;
}

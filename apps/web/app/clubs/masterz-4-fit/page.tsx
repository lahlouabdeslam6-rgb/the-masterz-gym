import Link from "next/link";
import {
  ArrowUpRight,
  BicepsFlexed,
  CircleDot,
  Flame,
  Footprints,
  TimerReset,
  UsersRound,
  Zap,
} from "lucide-react";
import { SectionTitle, buttonStyles } from "@masterz/ui";
import { MembershipPlansList } from "@/components/MembershipPlansList";
import { SectionShell } from "@/components/SectionShell";
import { SALLE_2_ID } from "@/lib/clubs";

const groupClasses = [
  { icon: Zap, name: "Grit" },
  { icon: TimerReset, name: "Circuit training" },
  { icon: BicepsFlexed, name: "Masterz Pump" },
  { icon: Footprints, name: "Masterz Cardio" },
  { icon: Flame, name: "Masterz Fit Boxing" },
  { icon: CircleDot, name: "CrossFit" },
] as const;

const martialArts = [
  "Boxe anglaise junior",
  "Boxe anglaise senior",
  "Kick-boxing",
  "Karate olympique senior",
] as const;

export default function MasterzFourFitClubPage() {
  return (
    <div className="bg-[#05090d]">
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#071019]">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_20%,rgba(255,112,20,.28),transparent_30%),radial-gradient(circle_at_64%_80%,rgba(0,212,255,.19),transparent_36%)]" />
        <div className="absolute -right-24 top-8 -z-10 h-[420px] w-[420px] rotate-12 border-[68px] border-orange-400/[0.08]" />
        <div className="mx-auto grid min-h-[540px] max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-orange-300">
              Salle 2 · Cours collectifs & Energy
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-black uppercase leading-[0.88] tracking-[-0.05em] text-white sm:text-6xl">
              The Masterz Gym <span className="text-primary">4 Fit</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-gray-300">
              Fitness, CrossFit, musculation et cours collectifs dans un club
              pense pour bouger ensemble et progresser avec energie.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#offres-club"
                className={buttonStyles({ size: "lg" })}
              >
                Voir les offres <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/inscription?club=salle-2"
                className={buttonStyles({ variant: "outline", size: "lg" })}
              >
                Choisir ce club
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {groupClasses.slice(0, 4).map(({ icon: Icon, name }, index) => (
              <div
                key={name}
                className={`min-h-36 border p-5 ${index === 0 ? "border-orange-300/45 bg-orange-300/10" : "border-white/10 bg-black/20"}`}
              >
                <Icon className="h-6 w-6 text-primary" />
                <p className="mt-10 text-sm font-black uppercase text-white">
                  {name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionShell>
        <SectionTitle
          eyebrow="Cours collectifs"
          title="Une programmation qui garde le groupe en mouvement."
          subtitle="Le planning, les coachs, les capacites et les listes d attente restent pilotes par l Admin."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groupClasses.map(({ icon: Icon, name }) => (
            <article
              key={name}
              className="flex items-center gap-4 border border-white/10 bg-[#081018] p-5"
            >
              <span className="flex h-11 w-11 items-center justify-center bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="text-sm font-black uppercase tracking-[0.06em] text-white">
                {name}
              </h2>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell tone="surface">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <UsersRound className="h-8 w-8 text-orange-300" />
            <p className="mt-7 text-[0.68rem] font-black uppercase tracking-[0.2em] text-orange-300">
              Arts martiaux
            </p>
            <h2 className="mt-3 font-display text-4xl font-black uppercase leading-[0.92] text-white">
              Des parcours dedies, payes separement.
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-400">
              Les membres suivent le planning de leur discipline. Les formules
              actives et leurs conditions sont affichees ci-dessous sans prix
              code en dur.
            </p>
          </div>
          <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2">
            {martialArts.map((name, index) => (
              <div key={name} className="bg-[#071018] p-6">
                <span className="text-[0.62rem] font-black text-primary">
                  0{index + 1}
                </span>
                <p className="mt-4 text-lg font-black uppercase text-white">
                  {name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell id="offres-club" tone="blue">
        <SectionTitle
          eyebrow="Formules Salle 2"
          title="Deux acces. Deux droits bien separes."
          subtitle="Choisissez Pass 4 Fit pour le club et les cours collectifs, ou une formule Arts martiaux par seances."
        />
        <div className="space-y-14">
          <section aria-labelledby="pass-4-fit-title">
            <div className="mb-6 border-l-2 border-primary pl-5">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-primary">
                Acces principal
              </p>
              <h2
                id="pass-4-fit-title"
                className="mt-2 text-2xl font-black uppercase text-white"
              >
                Pass 4 Fit
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                Fitness, CrossFit, musculation et cours collectifs. Les arts
                martiaux ne sont pas inclus.
              </p>
            </div>
            <MembershipPlansList
              clubId={SALLE_2_ID}
              serviceType="gym"
              showPromotions
            />
          </section>

          <section aria-labelledby="martial-arts-title">
            <div className="mb-6 border-l-2 border-orange-300 pl-5">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-orange-300">
                Acces par seances
              </p>
              <h2
                id="martial-arts-title"
                className="mt-2 text-2xl font-black uppercase text-white"
              >
                Arts martiaux
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                Chaque formule couvre uniquement la discipline payee. La zone
                musculation est accessible pendant le creneau du cours, sans
                acces general au Pass 4 Fit.
              </p>
            </div>
            <MembershipPlansList
              clubId={SALLE_2_ID}
              serviceType="martial_arts"
              showPromotions
            />
          </section>
        </div>
      </SectionShell>
    </div>
  );
}

import Link from "next/link";
import {
  ArrowUpRight,
  Dumbbell,
  HeartPulse,
  Medal,
  ShieldCheck,
} from "lucide-react";
import { SectionTitle, buttonStyles } from "@masterz/ui";
import { ClubMediaShowcase } from "@/components/ClubMediaShowcase";
import { MembershipPlansList } from "@/components/MembershipPlansList";
import { SectionShell } from "@/components/SectionShell";
import { SALLE_1_ID } from "@/lib/clubs";

const universes = [
  {
    icon: Dumbbell,
    title: "Musculation & cardio",
    text: "Un espace construit pour la force, la condition physique et la regularite.",
  },
  {
    icon: Medal,
    title: "Coaching personnel",
    text: "Objectifs, tests, analyse corporelle et suivi avec votre coach.",
  },
  {
    icon: HeartPulse,
    title: "Recovery",
    text: "Sauna, bain froid et compression dans un pack dedie.",
  },
] as const;

export default function MasterzGymClubPage() {
  return (
    <div className="bg-[#05090d]">
      <section className="relative isolate min-h-[520px] overflow-hidden border-b border-white/10">
        <video
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 -z-30 h-full w-full object-cover opacity-55"
        >
          <source src="/media/masterz-club-01.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,#020507_5%,rgba(2,5,7,.92)_45%,rgba(2,5,7,.34)_100%)]" />
        <div className="mx-auto flex min-h-[520px] max-w-7xl items-center px-5 py-14 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-primary">
              Salle 1 · Strength & Performance
            </p>
            <h1 className="mt-4 font-display text-4xl font-black uppercase leading-[0.9] tracking-[-0.05em] text-white sm:text-6xl">
              The Masterz Gym
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-gray-300">
              Le club historique pour construire votre force, structurer votre
              progression et recuperer avec methode.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#offres-club"
                className={buttonStyles({ size: "lg" })}
              >
                Voir les offres <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/inscription?club=salle-1"
                className={buttonStyles({ variant: "outline", size: "lg" })}
              >
                Choisir ce club
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SectionShell>
        <SectionTitle
          eyebrow="Votre parcours Salle 1"
          title="Entrainement, suivi et recuperation."
          subtitle="Chaque univers garde sa propre formule et son propre suivi dans votre espace membre."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {universes.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="border border-white/10 bg-[#081018] p-6"
            >
              <Icon className="h-7 w-7 text-primary" />
              <h2 className="mt-8 font-display text-2xl font-black uppercase text-white">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-500">{text}</p>
              <p className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-gray-300">
                <ShieldCheck className="h-4 w-4 text-primary" /> Gestion separee
              </p>
            </article>
          ))}
        </div>
        <div className="mt-12">
          <ClubMediaShowcase />
        </div>
      </SectionShell>

      <SectionShell id="offres-club" tone="blue">
        <SectionTitle
          eyebrow="Formules Salle 1"
          title="Choisissez votre point de depart."
          subtitle="Prix et promotions sont synchronises avec la gestion Admin."
        />
        <MembershipPlansList clubId={SALLE_1_ID} showPromotions />
      </SectionShell>
    </div>
  );
}

import Link from "next/link";
import {
  ArrowUpRight,
  Bike,
  Dumbbell,
  Gauge,
  Move3d,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Pill, SectionTitle, buttonStyles } from "@masterz/ui";
import { ClubMediaShowcase } from "@/components/ClubMediaShowcase";
import { FinalCTA } from "@/components/FinalCTA";
import { PageHero } from "@/components/PageHero";
import { SectionShell } from "@/components/SectionShell";

const zones = [
  {
    icon: Dumbbell,
    title: "Force libre",
    text: "Un espace lisible pour construire vos mouvements fondamentaux.",
  },
  {
    icon: Gauge,
    title: "Machines guidées",
    text: "Travaillez avec contrôle, du premier repère à la dernière répétition.",
  },
  {
    icon: Bike,
    title: "Cardio",
    text: "Développez votre endurance et modulez précisément votre intensité.",
  },
  {
    icon: Move3d,
    title: "Fonctionnel",
    text: "Bougez dans plusieurs plans et transférez votre force au quotidien.",
  },
];

export default function LaSallePage() {
  return (
    <>
      <PageHero
        eyebrow="La salle"
        title="Un terrain conçu pour progresser."
        description="Des zones distinctes, une circulation claire et une ambiance qui vous place immédiatement dans votre séance."
        image="/media/masterz-hero.png"
      />
      <SectionShell tone="surface">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <ClubMediaShowcase compact />
          <div>
            <SectionTitle
              eyebrow="Dans le club"
              title="L’énergie réelle de Masterz."
              subtitle="Découvrez l’ambiance, les équipements et le rythme de la salle à travers les images du club."
              align="left"
            />
            <div className="flex flex-wrap gap-2">
              <Pill>
                <ShieldCheck className="h-4 w-4 text-primary" /> Salle mixte
              </Pill>
              <Pill>
                <Sparkles className="h-4 w-4 text-primary" /> Expérience premium
              </Pill>
            </div>
            <Link
              href="/inscription"
              className={buttonStyles({ className: "mt-8" })}
            >
              Rejoindre le club <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SectionShell>
      <SectionShell>
        <SectionTitle
          eyebrow="Les zones"
          title="Chaque espace a un rôle précis."
          subtitle="Passez d’un objectif à l’autre sans perdre votre rythme ni votre concentration."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {zones.map(({ icon: Icon, title, text }, index) => (
            <article
              key={title}
              className="min-h-64 rounded-lg border border-white/10 bg-[#080e13] p-6 transition hover:border-primary/35"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-7 w-7 text-primary" />
                <span className="font-display text-3xl font-black text-white/10">
                  0{index + 1}
                </span>
              </div>
              <h2 className="mt-14 font-display text-2xl font-black uppercase text-white">
                {title}
              </h2>
              <p className="mt-4 text-sm leading-6 text-gray-500">{text}</p>
            </article>
          ))}
        </div>
      </SectionShell>
      <FinalCTA
        title="Venez ressentir la différence sur place."
        description="L’équipe vous fait découvrir les espaces et vous aide à identifier le parcours adapté à votre objectif."
      />
    </>
  );
}

import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardCheck,
  Dumbbell,
  Radar,
  Route,
  ShieldCheck,
} from "lucide-react";
import { Pill, SectionTitle, buttonStyles } from "@masterz/ui";
import { FinalCTA } from "@/components/FinalCTA";
import { PageHero } from "@/components/PageHero";
import { SectionShell } from "@/components/SectionShell";

const method = [
  {
    icon: Radar,
    title: "Bilan",
    text: "Définir le point de départ, les contraintes et l’objectif prioritaire.",
  },
  {
    icon: Route,
    title: "Plan",
    text: "Construire une progression compréhensible, adaptée et réaliste.",
  },
  {
    icon: Dumbbell,
    title: "Exécution",
    text: "Améliorer la technique, la qualité de l’effort et la confiance.",
  },
  {
    icon: ClipboardCheck,
    title: "Suivi",
    text: "Lire les retours du terrain et ajuster le parcours au bon moment.",
  },
];

export default function CoachingPage() {
  return (
    <>
      <PageHero
        eyebrow="Coaching"
        title="Votre potentiel mérite une vraie méthode."
        description="Un accompagnement structuré pour mieux bouger, mieux vous entraîner et progresser avec des repères clairs."
        image="/media/masterz-hero.png"
      />
      <SectionShell>
        <SectionTitle
          eyebrow="La méthode"
          title="Quatre étapes. Une direction claire."
          subtitle="Le coaching Masterz transforme un objectif général en décisions concrètes, séance après séance."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {method.map(({ icon: Icon, title, text }, index) => (
            <article
              key={title}
              className="rounded-lg border border-white/10 bg-[#080e13] p-6"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-7 w-7 text-primary" />
                <span className="font-display text-3xl font-black text-white/10">
                  0{index + 1}
                </span>
              </div>
              <h2 className="mt-12 font-display text-2xl font-black uppercase text-white">
                {title}
              </h2>
              <p className="mt-4 text-sm leading-6 text-gray-500">{text}</p>
            </article>
          ))}
        </div>
      </SectionShell>
      <SectionShell tone="surface">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Pill>
              <ShieldCheck className="h-4 w-4 text-primary" /> Accompagnement
              sur mesure
            </Pill>
            <h2 className="mt-7 font-display text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white md:text-5xl">
              Le bon coach, c’est d’abord le bon cadre.
            </h2>
          </div>
          <div>
            <p className="text-base leading-8 text-gray-400">
              Les profils et disponibilités évoluent. L’accueil vous oriente
              vers l’accompagnement le plus cohérent avec votre pratique, votre
              niveau et votre agenda.
            </p>
            <Link
              href="/contact"
              className={buttonStyles({ className: "mt-7" })}
            >
              Parler à l’équipe <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SectionShell>
      <FinalCTA
        title="Ne laissez plus votre progression au hasard."
        description="Présentez votre objectif à l’équipe et construisez un parcours de coaching cohérent."
      />
    </>
  );
}

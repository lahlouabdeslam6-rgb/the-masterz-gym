import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardCheck,
  Dumbbell,
  Radar,
  Route,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { Pill, SectionTitle, buttonStyles } from "@masterz/ui";
import { FinalCTA } from "@/components/FinalCTA";
import { MembershipPlansList } from "@/components/MembershipPlansList";
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
        description="Un accompagnement structuré avec analyse corporelle, tests et suivi pour progresser avec des repères clairs."
        image="/media/masterz-hero.png"
        compact
        align="center"
      />
      <SectionShell tone="blue" className="!py-10 sm:!py-12 lg:!py-14">
        <SectionTitle
          eyebrow="Formules coaching"
          title="Choisissez votre accompagnement."
          subtitle="Chaque formule coaching active inclut l’analyse corporelle dans le parcours de suivi."
          className="!mb-8"
        />
        <MembershipPlansList serviceType="coaching" />
      </SectionShell>
      <SectionShell>
        <div
          id="analyse-corporelle"
          className="mb-10 grid items-center gap-5 rounded-lg border border-primary/25 bg-primary/[0.06] p-6 sm:grid-cols-[auto_1fr] sm:p-8"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <ScanLine className="h-7 w-7" />
          </span>
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-primary">
              Inclus avec le coaching
            </p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase text-white sm:text-3xl">
              Analyse corporelle et suivi des résultats
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
              Le membre qui dispose d’un abonnement coaching actif profite de
              l’analyse corporelle dans le même parcours, sans créer une offre
              séparée.
            </p>
          </div>
        </div>
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

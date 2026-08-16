import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Droplets,
  Gauge,
  ScanLine,
  TrendingUp,
} from "lucide-react";
import { SectionTitle, buttonStyles } from "@masterz/ui";
import { FinalCTA } from "@/components/FinalCTA";
import { PageHero } from "@/components/PageHero";
import { SectionShell } from "@/components/SectionShell";

const metrics = [
  {
    icon: Gauge,
    title: "Repères globaux",
    text: "Situez votre point de départ avec des indicateurs lisibles.",
  },
  {
    icon: Activity,
    title: "Masse musculaire",
    text: "Observez l’évolution de votre développement musculaire.",
  },
  {
    icon: TrendingUp,
    title: "Composition",
    text: "Mettez vos changements en perspective au fil du parcours.",
  },
  {
    icon: Droplets,
    title: "Hydratation",
    text: "Intégrez l’équilibre hydrique à la lecture de votre forme.",
  },
];

export default function AnalyseCorporellePage() {
  return (
    <>
      <PageHero
        eyebrow="Analyse corporelle"
        title="Des données utiles. Des décisions plus justes."
        description="Comprenez votre composition corporelle et donnez à votre progression des repères concrets."
      />
      <SectionShell>
        <SectionTitle
          eyebrow="Vos indicateurs"
          title="Voyez plus loin que le chiffre sur la balance."
          subtitle="L’analyse rassemble plusieurs informations pour construire une lecture plus complète de votre évolution."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(({ icon: Icon, title, text }, index) => (
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
      <SectionShell tone="blue">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative flex min-h-80 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-black/25">
            <div className="absolute h-60 w-60 rounded-full border border-primary/20" />
            <div className="absolute h-44 w-44 rounded-full border border-primary/35" />
            <div className="absolute h-28 w-28 rounded-full bg-primary/10" />
            <ScanLine className="relative h-16 w-16 text-primary" />
          </div>
          <div>
            <SectionTitle
              eyebrow="Le rendez-vous"
              title="Mesurer, comprendre, ajuster."
              subtitle="L’équipe vous accompagne dans la lecture des résultats. L’analyse ne remplace pas un avis médical et s’inscrit dans votre suivi sportif."
              align="left"
            />
            <Link href="/contact" className={buttonStyles()}>
              Planifier avec l’accueil <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SectionShell>
      <FinalCTA
        title="Donnez un point de départ clair à votre objectif."
        description="Contactez l’équipe pour connaître les modalités et les disponibilités de l’analyse corporelle."
      />
    </>
  );
}

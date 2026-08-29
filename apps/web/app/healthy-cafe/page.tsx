import Link from "next/link";
import {
  ArrowUpRight,
  Beef,
  Coffee,
  CupSoda,
  Leaf,
  Sparkles,
} from "lucide-react";
import { Pill, buttonStyles } from "@masterz/ui";
import { FinalCTA } from "@/components/FinalCTA";
import { PageHero } from "@/components/PageHero";
import { SectionShell } from "@/components/SectionShell";

const categories = [
  {
    icon: CupSoda,
    title: "Shakes protéinés",
    text: "Des options pratiques pour compléter votre routine après la séance.",
  },
  {
    icon: Leaf,
    title: "Jus & smoothies",
    text: "Des compositions fraîches pensées autour de l’énergie et de l’hydratation.",
  },
  {
    icon: Beef,
    title: "Healthy food",
    text: "Des choix équilibrés pour les journées qui ne s’arrêtent pas à l’entraînement.",
  },
  {
    icon: Coffee,
    title: "Pause café",
    text: "Un point de rencontre simple, directement au cœur du club.",
  },
];

export default function HealthyCafePage() {
  return (
    <>
      <PageHero
        eyebrow="Healthy Café"
        title="Rechargez. Récupérez. Recommencez."
        description="Une pause nutrition pensée pour rester aligné avec votre rythme et vos objectifs."
      />
      <SectionShell tone="surface">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(({ icon: Icon, title, text }, index) => (
            <article
              key={title}
              className="min-h-64 rounded-lg border border-white/10 bg-black/20 p-6"
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
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <Pill>
              <Sparkles className="h-4 w-4 text-primary" /> Au cœur du club
            </Pill>
            <h2 className="mt-7 font-display text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white md:text-5xl">
              Votre séance continue dans vos choix.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-400">
              Passez au comptoir pour découvrir la carte du moment, les
              ingrédients disponibles et les options adaptées à votre journée.
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
              Carte & tarifs
            </p>
            <p className="mt-4 text-sm leading-7 text-gray-300">
              Disponibles sur place auprès de l’équipe Healthy Café.
            </p>
            <Link
              href="/contact"
              className={buttonStyles({
                variant: "outline",
                className: "mt-7",
              })}
            >
              Une question ? <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SectionShell>
      <FinalCTA
        title="Faites de votre routine un ensemble cohérent."
        description="Entraînement, récupération et nutrition se retrouvent dans une même expérience Masterz."
      />
    </>
  );
}

import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  BatteryCharging,
  Flame,
  Snowflake,
  Waves,
} from "lucide-react";
import { Pill, SectionTitle, buttonStyles } from "@masterz/ui";
import { FinalCTA } from "@/components/FinalCTA";
import { MembershipPlansList } from "@/components/MembershipPlansList";
import { PageHero } from "@/components/PageHero";
import { SectionShell } from "@/components/SectionShell";

const cycle = [
  {
    icon: Flame,
    title: "Sauna",
    text: "Une première phase de chaleur pour relâcher et amorcer le retour au calme.",
  },
  {
    icon: Snowflake,
    title: "Bain froid",
    text: "Un contraste tonique pour vivre la récupération comme une vraie discipline.",
  },
  {
    icon: Waves,
    title: "Compression",
    text: "Une dernière étape consacrée au confort et à la sensation de légèreté.",
  },
];

export default function RecoveryPage() {
  return (
    <>
      <PageHero
        eyebrow="Recovery"
        title="La récupération fait partie de l’entraînement."
        description="Chaleur, froid et compression : un cycle complet pensé pour mieux redescendre après l’effort."
        compact
        align="center"
      />
      <SectionShell tone="blue" className="!py-10 sm:!py-12 lg:!py-14">
        <MembershipPlansList serviceType="recovery" />
      </SectionShell>
      <SectionShell>
        <SectionTitle
          eyebrow="Le cycle"
          title="Trois temps. Une récupération maîtrisée."
          subtitle="Chaque étape prépare la suivante pour créer une expérience fluide et cohérente."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {cycle.map(({ icon: Icon, title, text }, index) => (
            <article
              key={title}
              className="relative min-h-80 rounded-lg border border-white/10 bg-black/25 p-7"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="font-display text-5xl font-black text-white/[0.06]">
                  0{index + 1}
                </span>
              </div>
              <h2 className="mt-16 font-display text-3xl font-black uppercase text-white">
                {title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-gray-400">{text}</p>
              {index < cycle.length - 1 ? (
                <ArrowDown className="absolute -bottom-3 left-1/2 z-10 h-6 w-6 -translate-x-1/2 rounded-full bg-primary p-1 text-black lg:-right-3 lg:bottom-auto lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:rotate-[-90deg]" />
              ) : null}
            </article>
          ))}
        </div>
      </SectionShell>
      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <BatteryCharging className="h-10 w-10 text-primary" />
            <h2 className="mt-6 font-display text-4xl font-black uppercase leading-[0.92] text-white">
              Choisissez le format avec l’équipe.
            </h2>
          </div>
          <div>
            <Pill>Disponibilités à l’accueil</Pill>
            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-400">
              Les formats, créneaux et tarifs sont confirmés par l’équipe selon
              les disponibilités. Aucune réservation n’est ouverte en ligne pour
              le moment.
            </p>
            <Link
              href="/contact"
              className={buttonStyles({
                variant: "outline",
                className: "mt-7",
              })}
            >
              Demander les informations <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SectionShell>
      <FinalCTA
        title="Accordez à votre corps la récupération qu’il mérite."
        description="Contactez l’accueil pour connaître les formats disponibles et organiser votre cycle."
      />
    </>
  );
}

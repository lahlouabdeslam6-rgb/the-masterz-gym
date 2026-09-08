import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Users,
} from "lucide-react";
import { Pill, buttonStyles } from "@masterz/ui";

const badges = [
  { label: "2 clubs", icon: Sparkles },
  { label: "Musculation", icon: Dumbbell },
  { label: "Cours collectifs", icon: Users },
  { label: "Coaching & Recovery", icon: HeartPulse },
];

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[560px] overflow-hidden border-b border-white/10 bg-black sm:min-h-[590px] lg:min-h-[620px]">
      <Image
        src="/media/masterz-hero.png"
        alt="Athlète dans un espace d’entraînement premium"
        fill
        priority
        sizes="100vw"
        className="-z-30 object-cover object-[64%_center] sm:object-center"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,#020406_0%,rgba(2,4,6,.97)_28%,rgba(2,4,6,.68)_48%,rgba(2,4,6,.08)_82%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#030609_0%,transparent_20%,rgba(3,6,9,.08)_100%)]" />

      <div className="mx-auto flex min-h-[560px] max-w-7xl items-center px-5 py-12 sm:min-h-[590px] sm:px-8 lg:min-h-[620px]">
        <div className="max-w-[620px] pb-2 pt-4 lg:max-w-[680px]">
          <p className="mb-4 flex items-center gap-3 text-[0.68rem] font-black uppercase tracking-[0.26em] text-primary sm:text-xs">
            <span className="h-px w-8 bg-primary" /> The Masterz · Kénitra
          </p>
          <h1 className="max-w-[590px] font-display text-[2.55rem] font-black uppercase leading-[0.9] tracking-[-0.05em] text-white sm:text-[3.05rem] md:text-[3.5rem] lg:text-[3.8rem]">
            Deux clubs.
            <span className="mt-1.5 block text-primary">
              Une seule ambition.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-sm font-medium leading-6 text-gray-300 sm:text-base sm:leading-7">
            Force et performance dans le premier club. Energie et cours
            collectifs dans le second. Choisissez votre univers Masterz.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="#clubs" className={buttonStyles({ size: "lg" })}>
              Choisir mon club <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="#offres"
              className={buttonStyles({ variant: "outline", size: "lg" })}
            >
              Voir les offres
            </Link>
          </div>

          <div className="mt-7 flex max-w-xl flex-wrap gap-2">
            {badges.map(({ label, icon: Icon }) => (
              <Pill key={label}>
                <Icon className="h-3.5 w-3.5 text-primary" /> {label}
              </Pill>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

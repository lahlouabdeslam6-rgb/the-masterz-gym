import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Users,
} from "lucide-react";
import { Pill, buttonStyles } from "@masterz/ui";

const badges = [
  { label: "Horaires étendus", icon: Sparkles },
  { label: "Salle mixte", icon: Users },
  { label: "Coaching", icon: Dumbbell },
  { label: "Recovery", icon: HeartPulse },
];

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[670px] overflow-hidden border-b border-white/10 bg-black lg:min-h-[720px]">
      <Image
        src="/media/masterz-hero.png"
        alt="Athlète dans un espace d’entraînement premium"
        fill
        priority
        sizes="100vw"
        className="-z-30 object-cover object-[67%_center] sm:object-center"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,#020406_0%,rgba(2,4,6,.96)_33%,rgba(2,4,6,.58)_58%,rgba(2,4,6,.16)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#030609_0%,transparent_26%,rgba(3,6,9,.15)_100%)]" />
      <div className="absolute inset-y-0 left-[54%] hidden w-px bg-gradient-to-b from-transparent via-primary/35 to-transparent lg:block" />

      <div className="mx-auto flex min-h-[670px] max-w-7xl items-center px-5 py-16 sm:px-8 lg:min-h-[720px]">
        <div className="max-w-3xl">
          <p className="mb-5 flex items-center gap-3 text-xs font-black uppercase tracking-[0.28em] text-primary">
            <span className="h-px w-8 bg-primary" /> The Masterz Gym · Kénitra
          </p>
          <h1 className="font-display text-[3.25rem] font-black uppercase leading-[0.84] tracking-[-0.055em] text-white sm:text-[4.25rem] md:text-[5rem] lg:text-[5.6rem] 2xl:text-[6.3rem]">
            Élève ton niveau.
            <span className="mt-2 block text-primary">
              Maîtrise tes limites.
            </span>
          </h1>
          <p className="mt-7 max-w-2xl text-base font-medium leading-7 text-gray-300 sm:text-lg md:text-xl">
            Un seul lieu pour développer votre force, structurer votre
            progression et accélérer votre récupération.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/inscription" className={buttonStyles({ size: "lg" })}>
              S’inscrire <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/la-salle"
              className={buttonStyles({ variant: "outline", size: "lg" })}
            >
              Découvrir la salle
            </Link>
          </div>

          <div className="mt-9 flex max-w-2xl flex-wrap gap-2.5">
            {badges.map(({ label, icon: Icon }) => (
              <Pill key={label}>
                <Icon className="h-3.5 w-3.5 text-primary" /> {label}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      <Link
        href="#experience"
        aria-label="Découvrir la suite"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.2em] text-gray-500 transition hover:text-primary md:flex"
      >
        Explorer <ArrowDown className="h-4 w-4" />
      </Link>
    </section>
  );
}

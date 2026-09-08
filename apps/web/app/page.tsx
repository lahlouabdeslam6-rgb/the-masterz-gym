import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Beef,
  Clock3,
  Coffee,
  Dumbbell,
  HeartPulse,
  MapPin,
  Medal,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  Waves,
} from "lucide-react";
import { Card, CardContent, SectionTitle, buttonStyles } from "@masterz/ui";
import { ClubMediaShowcase } from "@/components/ClubMediaShowcase";
import { FinalCTA } from "@/components/FinalCTA";
import { PublicClubChooser } from "@/components/PublicClubChooser";
import { PublicClubOffers } from "@/components/PublicClubOffers";
import { SectionShell } from "@/components/SectionShell";
import { HeroSection } from "@/components/sections/HeroSection";

const services = [
  {
    icon: Dumbbell,
    title: "Musculation & cardio",
    description:
      "Des zones pensées pour construire votre force, votre endurance et votre régularité.",
    href: "/la-salle",
    code: "01",
  },
  {
    icon: Target,
    title: "Coaching",
    description:
      "Coaching, analyse corporelle, tests et suivi réunis dans le même parcours.",
    href: "/coaching",
    code: "02",
  },
  {
    icon: HeartPulse,
    title: "Recovery",
    description:
      "Un cycle dédié à la récupération pour mieux enchaîner vos entraînements.",
    href: "/recovery",
    code: "03",
  },
  {
    icon: Coffee,
    title: "Healthy Café",
    description:
      "Une pause nutrition pensée pour accompagner votre rythme avant ou après la séance.",
    href: "/healthy-cafe",
    code: "04",
  },
];

const recoverySteps = [
  {
    icon: Waves,
    number: "01",
    title: "Chaleur",
    text: "Relâcher les tensions et préparer le corps à récupérer.",
  },
  {
    icon: BatteryCharging,
    number: "02",
    title: "Froid",
    text: "Créer un contraste tonique après l’effort.",
  },
  {
    icon: Activity,
    number: "03",
    title: "Compression",
    text: "Terminer le cycle avec une sensation de jambes plus légères.",
  },
];

export default function HomePage() {
  return (
    <div className="w-full">
      <HeroSection />
      <PublicClubChooser />

      <SectionShell
        id="offres"
        tone="blue"
        className="scroll-mt-28 !py-12 sm:!py-14 lg:!py-16"
      >
        <SectionTitle
          eyebrow="Offres par club"
          title="Choisissez d abord votre club."
          subtitle="Les formules et promotions affichees viennent directement de la gestion Admin du club selectionne."
          className="!mb-8"
        />
        <PublicClubOffers />
      </SectionShell>

      <SectionShell id="experience" tone="surface">
        <div className="grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20">
          <div>
            <SectionTitle
              eyebrow="L’expérience Masterz"
              title="Plus qu’une salle. Un écosystème de performance."
              subtitle="Chaque espace a une fonction : vous entraîner avec intensité, suivre votre évolution et récupérer avec méthode. Le tout dans une ambiance exigeante, propre et accessible."
              align="left"
            />
            <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-3">
              {[
                { value: "Mixte", label: "Un espace pour tous" },
                { value: "360°", label: "Train · Track · Recover" },
                { value: "Kénitra", label: "Votre club local" },
              ].map((item) => (
                <div key={item.value} className="bg-[#071018] p-5">
                  <p className="font-display text-2xl font-black uppercase text-primary">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
            <Link
              href="/la-salle"
              className={buttonStyles({
                variant: "outline",
                className: "mt-8",
              })}
            >
              Entrer dans la salle <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <ClubMediaShowcase />
        </div>
      </SectionShell>

      <SectionShell>
        <SectionTitle
          eyebrow="Tout au même endroit"
          title="Un parcours complet autour de votre objectif."
          subtitle="Des services complémentaires, réunis pour transformer l’effort en progression durable."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.map(({ icon: Icon, ...service }) => (
            <Link
              key={service.href}
              href={service.href}
              className="group relative min-h-[285px] overflow-hidden rounded-lg border border-white/10 bg-[#080e13] p-7 transition duration-300 hover:-translate-y-1 hover:border-primary/50"
            >
              <div className="absolute right-0 top-0 h-32 w-32 bg-[radial-gradient(circle_at_top_right,rgba(0,212,255,.16),transparent_65%)]" />
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-sm border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="font-display text-5xl font-black text-white/[0.045]">
                  {service.code}
                </span>
              </div>
              <h3 className="mt-10 font-display text-2xl font-black uppercase tracking-[-0.03em] text-white sm:text-3xl">
                {service.title}
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400">
                {service.description}
              </p>
              <span className="mt-7 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-primary">
                Découvrir{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid gap-5">
          <SpotlightCard
            eyebrow="Coaching"
            title="La bonne méthode change tout."
            text="Technique, intensité, régularité : le coaching remet chaque variable à sa place pour vous faire avancer avec confiance."
            href="/coaching"
            icon={<Medal className="h-8 w-8" />}
          >
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {["Bilan", "Analyse corporelle", "Plan", "Suivi"].map(
                (item, index) => (
                  <div key={item} className="border-t border-primary/30 pt-3">
                    <span className="text-[0.62rem] font-black text-primary">
                      0{index + 1}
                    </span>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-gray-300">
                      {item}
                    </p>
                  </div>
                ),
              )}
            </div>
          </SpotlightCard>
        </div>
      </SectionShell>

      <SectionShell tone="surface">
        <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
          <div>
            <SectionTitle
              eyebrow="Recovery"
              title="Entraînez-vous fort. Récupérez intelligemment."
              subtitle="Le cycle Recovery complète votre séance avec une succession cohérente d’expériences dédiées au retour au calme."
              align="left"
            />
            <Link
              href="/recovery"
              className={buttonStyles({ variant: "outline" })}
            >
              Découvrir le cycle <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {recoverySteps.map(({ icon: Icon, number, title, text }) => (
              <div
                key={number}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border border-white/10 bg-black/25 p-5 transition hover:border-primary/30"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-black uppercase text-white">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
                </div>
                <span className="font-display text-3xl font-black text-white/10">
                  {number}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="relative overflow-hidden rounded-lg border border-primary/20 bg-[linear-gradient(135deg,#07131d,#09203a)] p-7 sm:p-10">
            <Beef className="h-10 w-10 text-primary" />
            <p className="mt-10 text-xs font-black uppercase tracking-[0.24em] text-primary">
              Healthy Café
            </p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-black uppercase leading-[0.95] tracking-[-0.035em] text-white sm:text-4xl">
              Le bon choix, avant comme après la séance.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-gray-300">
              Des options pensées pour l’énergie, l’hydratation et la
              récupération, préparées au cœur du club.
            </p>
            <Link
              href="/healthy-cafe"
              className={buttonStyles({ className: "mt-8" })}
            >
              Voir l’univers café <ArrowUpRight className="h-4 w-4" />
            </Link>
            <div className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full border-[45px] border-primary/[0.07]" />
          </article>
          <article className="rounded-lg border border-white/10 bg-[#080e13] p-7 sm:p-10">
            <Sparkles className="h-10 w-10 text-primary" />
            <p className="mt-10 text-xs font-black uppercase tracking-[0.24em] text-primary">
              Standard Masterz
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase leading-[0.95] tracking-[-0.035em] text-white">
              Une expérience tenue dans le détail.
            </h2>
            <ul className="mt-7 space-y-4 text-sm text-gray-300">
              {[
                "Des espaces lisibles et structurés",
                "Un accompagnement humain",
                "Une logique complète de progression",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />{" "}
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </SectionShell>

      <SectionShell tone="blue">
        <div className="grid items-center gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
          <div>
            <div className="flex gap-1 text-primary" aria-label="Cinq étoiles">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="h-5 w-5 fill-current" />
              ))}
            </div>
            <h2 className="mt-6 font-display text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white md:text-5xl">
              La confiance se gagne à chaque séance.
            </h2>
            <p className="mt-5 text-sm leading-7 text-gray-400">
              Équipement, accueil, propreté et accompagnement : l’expérience est
              évaluée dans son ensemble, pas seulement sur la séance du jour.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Salle mixte",
                text: "Un cadre exigeant et accueillant.",
              },
              {
                icon: ShieldCheck,
                title: "Équipe présente",
                text: "Des repères quand vous en avez besoin.",
              },
              {
                icon: Sparkles,
                title: "Club soigné",
                text: "Le confort fait partie de la performance.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <Card key={title} className="bg-black/20">
                <CardContent className="p-6">
                  <Icon className="h-7 w-7 text-primary" />
                  <h3 className="mt-8 font-display text-xl font-black uppercase text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-gray-500">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#080e13] p-7 sm:p-10">
            <Clock3 className="h-8 w-8 text-primary" />
            <p className="mt-8 text-xs font-black uppercase tracking-[0.24em] text-primary">
              Horaires
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase text-white sm:text-4xl">
              Votre séance, à votre rythme.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-gray-400">
              La salle propose des plages d’accès étendues. Les horaires du jour
              sont confirmés par l’accueil et sur les canaux officiels du club.
            </p>
            <a
              href="tel:+212764536280"
              className={buttonStyles({
                variant: "outline",
                className: "mt-8",
              })}
            >
              <Phone className="h-4 w-4" /> Confirmer les horaires
            </a>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_75%_20%,rgba(0,212,255,.18),transparent_35%),#071018] p-7 sm:p-10">
            <MapPin className="h-8 w-8 text-primary" />
            <p className="mt-8 text-xs font-black uppercase tracking-[0.24em] text-primary">
              Kénitra
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase text-white sm:text-4xl">
              Retrouvez-nous sur place.
            </h2>
            <p className="mt-5 text-sm leading-7 text-gray-400">
              Av. Said Daoudi, Kénitra, Maroc. L’équipe vous accueille pour
              découvrir les espaces et choisir votre formule.
            </p>
            <Link
              href="/contact"
              className={buttonStyles({ className: "mt-8" })}
            >
              Contact & itinéraire <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SectionShell>

      <FinalCTA />
    </div>
  );
}

function SpotlightCard({
  eyebrow,
  title,
  text,
  href,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="relative overflow-hidden rounded-lg border border-white/10 bg-[#080e13] p-7 sm:p-9">
      <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-primary/25 bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-10 text-xs font-black uppercase tracking-[0.24em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl font-black uppercase leading-[0.95] tracking-[-0.035em] text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-5 max-w-xl text-sm leading-7 text-gray-400">{text}</p>
      {children}
      <Link
        href={href}
        className="mt-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-primary"
      >
        En savoir plus <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

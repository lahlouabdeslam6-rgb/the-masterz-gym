import { CheckCircle2, ShieldCheck, UserRoundCheck } from "lucide-react";
import { MembershipPlansList } from "@/components/MembershipPlansList";
import { PageHero } from "@/components/PageHero";
import { SectionShell } from "@/components/SectionShell";
import { FinalCTA } from "@/components/FinalCTA";

export default function AbonnementsPage() {
  return (
    <>
      <PageHero
        eyebrow="Abonnements"
        title="Votre formule. Votre rythme. Votre progression."
        description="Comparez les abonnements actifs et transmettez votre demande d’adhésion en quelques étapes."
      />
      <SectionShell tone="blue">
        <MembershipPlansList />
      </SectionShell>
      <SectionShell>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: CheckCircle2,
              title: "Choisissez",
              text: "Sélectionnez l’offre active qui correspond à votre horizon.",
            },
            {
              icon: UserRoundCheck,
              title: "Transmettez",
              text: "Complétez votre demande avec vos informations et votre objectif.",
            },
            {
              icon: ShieldCheck,
              title: "Validez",
              text: "L’équipe vérifie votre demande et finalise l’adhésion à l’accueil.",
            },
          ].map(({ icon: Icon, title, text }, index) => (
            <article
              key={title}
              className="rounded-lg border border-white/10 bg-[#080e13] p-7"
            >
              <span className="text-xs font-black text-primary">
                0{index + 1}
              </span>
              <Icon className="mt-8 h-7 w-7 text-primary" />
              <h2 className="mt-5 font-display text-2xl font-black uppercase text-white">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-500">{text}</p>
            </article>
          ))}
        </div>
      </SectionShell>
      <FinalCTA
        title="Prêt à rejoindre l’équipe Masterz ?"
        description="Choisissez une formule ci-dessus ou contactez-nous pour être orienté avant votre demande."
      />
    </>
  );
}

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonStyles } from "@masterz/ui";
import { FinalCTA } from "@/components/FinalCTA";
import { PageHero } from "@/components/PageHero";
import { PublicStoreCatalog } from "@/components/PublicStoreCatalog";
import { SectionShell } from "@/components/SectionShell";

export default function StorePage() {
  return (
    <>
      <PageHero
        eyebrow="Masterz Store"
        title="Votre performance continue hors de la salle."
        description="Decouvrez les produits selectionnes par Masterz Gym. Consultez les prix et la disponibilite avant de reserver depuis votre espace membre."
      />
      <SectionShell tone="blue">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
              Catalogue public
            </p>
            <h2 className="mt-3 font-display text-4xl font-black uppercase text-white md:text-5xl">
              Produits disponibles
            </h2>
          </div>
          <Link
            href="/inscription"
            className={buttonStyles({ variant: "outline" })}
          >
            Devenir membre <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <PublicStoreCatalog />
      </SectionShell>
      <FinalCTA
        title="Un produit vous interesse ?"
        description="Connectez-vous pour envoyer votre reservation. La Reception vous confirmera sa disponibilite avant le retrait."
      />
    </>
  );
}

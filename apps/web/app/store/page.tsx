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
        description="Découvrez les produits Masterz, leurs prix et leur disponibilité avant de réserver."
      />
      <SectionShell tone="blue" className="!pt-10 sm:!pt-12">
        <PublicStoreCatalog />
      </SectionShell>
      <FinalCTA
        title="Un produit vous interesse ?"
        description="Connectez-vous pour envoyer votre reservation. La Reception vous confirmera sa disponibilite avant le retrait."
      />
    </>
  );
}

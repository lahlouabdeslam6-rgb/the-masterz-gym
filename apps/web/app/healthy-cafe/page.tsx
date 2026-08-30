import { HealthyCafeMenu } from "@/components/HealthyCafeMenu";
import { PageHero } from "@/components/PageHero";
import { SectionShell } from "@/components/SectionShell";

export default function HealthyCafePage() {
  return (
    <>
      <PageHero
        eyebrow="Healthy Cafe"
        title="La carte du club."
        description="Decouvrez les repas disponibles et leurs prix, publies directement par l'equipe Masterz Gym."
      />
      <SectionShell tone="blue">
        <HealthyCafeMenu />
      </SectionShell>
    </>
  );
}

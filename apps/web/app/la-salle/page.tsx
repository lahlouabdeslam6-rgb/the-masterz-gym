import { SectionTitle } from "@masterz/ui";

export default function LaSallePage() {
  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-background">
      <div className="mx-auto max-w-5xl">
        <SectionTitle title="La Salle" subtitle="L'excellence à chaque entraînement." />
        <div className="mt-16 h-96 bg-surface rounded-xl flex items-center justify-center border border-border">
           <span className="text-gray-500 uppercase tracking-widest text-sm">Vidéo Présentation (Placeholder)</span>
        </div>
        <div className="mt-16 prose prose-invert mx-auto">
          <p className="text-lg text-gray-300 text-center">
            The Masterz Gym est un espace mixte de 1500m² pensé pour la performance et le dépassement de soi.
            Équipé des meilleures machines au monde, notre espace est divisé en plusieurs zones pour 
            répondre à tous vos besoins : musculation libre, machines guidées, cardio-training, et zone fonctionnelle.
          </p>
        </div>
      </div>
    </div>
  );
}

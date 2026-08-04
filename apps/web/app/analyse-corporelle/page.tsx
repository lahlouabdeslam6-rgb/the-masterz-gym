import { SectionTitle, Card, CardContent } from "@masterz/ui";
import { Activity, Scale, Droplet, TrendingUp } from "lucide-react";

export default function AnalyseCorporellePage() {
  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-background">
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="Analyse Corporelle" subtitle="Suivez votre évolution de près (masse musculaire, graisse, hydratation) pour des décisions d&apos;entraînement ciblées." />
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="bg-surface border-border text-center">
            <CardContent className="pt-8 pb-8 flex flex-col items-center">
              <Scale className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Poids & IMC</h3>
              <p className="text-gray-400 text-sm">Suivi précis de votre poids global.</p>
            </CardContent>
          </Card>
          <Card className="bg-surface border-border text-center">
            <CardContent className="pt-8 pb-8 flex flex-col items-center">
              <Activity className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Masse Musculaire</h3>
              <p className="text-gray-400 text-sm">Analysez votre développement musculaire.</p>
            </CardContent>
          </Card>
          <Card className="bg-surface border-border text-center">
            <CardContent className="pt-8 pb-8 flex flex-col items-center">
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Masse Grasse</h3>
              <p className="text-gray-400 text-sm">Ciblez la perte de graisse efficacement.</p>
            </CardContent>
          </Card>
          <Card className="bg-surface border-border text-center">
            <CardContent className="pt-8 pb-8 flex flex-col items-center">
              <Droplet className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Hydratation</h3>
              <p className="text-gray-400 text-sm">Optimisez vos niveaux d&apos;eau corporelle.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

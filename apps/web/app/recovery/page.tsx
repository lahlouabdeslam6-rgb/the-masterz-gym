import { SectionTitle, Card, CardContent, Button } from "@masterz/ui";
import { recoveryPacks } from "@/lib/mock-data";

export default function RecoveryPage() {
  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-background">
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="Recovery" subtitle="Sauna, Bain glacé, Massage par compression. Le cycle complet." />
        
        {/* Cycle Visuel */}
        <div className="mt-16 mb-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="bg-surface p-8 rounded-xl border border-border relative">
            <h3 className="text-2xl font-bold text-white mb-4">1. Sauna</h3>
            <p className="text-gray-400">Éliminez les toxines et préparez vos muscles à la récupération.</p>
          </div>
          <div className="bg-surface p-8 rounded-xl border border-border relative">
            <h3 className="text-2xl font-bold text-white mb-4">2. Bain glacé</h3>
            <p className="text-gray-400">Réduisez l&apos;inflammation et accélérez la récupération musculaire.</p>
          </div>
          <div className="bg-surface p-8 rounded-xl border border-border relative">
            <h3 className="text-2xl font-bold text-white mb-4">3. Compression</h3>
            <p className="text-gray-400">Améliorez la circulation sanguine pour des jambes légères.</p>
          </div>
        </div>

        <h3 className="text-3xl font-bold text-white mb-8 text-center">Nos Packs Recovery</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recoveryPacks.map((pack) => (
            <Card key={pack.id} className="bg-surface border-border flex flex-col">
              <CardContent className="pt-6 flex-1 flex flex-col items-center text-center">
                <h4 className="text-xl font-bold text-white mb-2">{pack.name}</h4>
                <p className="text-3xl font-black text-primary mb-4">{pack.price} <span className="text-lg text-gray-400">MAD</span></p>
                <p className="text-sm text-gray-400 mb-8 flex-1">{pack.description}</p>
                <Button className="w-full" variant="outline">Réserver (Bientôt)</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

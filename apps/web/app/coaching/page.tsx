import { SectionTitle, Card, CardContent, Button } from "@masterz/ui";
import { coaches } from "@/lib/mock-data";
import { Clock } from "lucide-react";

export default function CoachingPage() {
  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-background">
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="Coaching Personnel" subtitle="Profitez de l&apos;expertise de nos coachs certifiés pour atteindre vos objectifs plus rapidement. Que ce soit pour une remise en forme, une préparation physique ou apprendre à s&apos;entraîner correctement." />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {coaches.map((coach) => (
            <Card key={coach.id} className="bg-surface border-border overflow-hidden">
              <div className="h-64 bg-black flex items-center justify-center border-b border-border">
                <span className="text-gray-500 uppercase tracking-widest text-xs">Photo {coach.name}</span>
              </div>
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold text-white">{coach.name}</h3>
                <p className="text-primary font-medium mt-1 mb-4">{coach.specialty}</p>
                <p className="text-gray-400 text-sm">{coach.bio}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 bg-surface p-8 rounded-xl border border-border flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-start space-x-4">
            <Clock className="h-8 w-8 text-primary mt-1" />
            <div>
              <h3 className="text-xl font-bold text-white">Séances d&apos;une heure</h3>
              <p className="text-gray-400 max-w-md mt-2">Profitez d&apos;une heure de coaching intensif, entièrement dédiée à vous.</p>
            </div>
          </div>
          <Button variant="primary" className="mt-6 md:mt-0">Découvrir les coachs</Button>
        </div>
      </div>
    </div>
  );
}

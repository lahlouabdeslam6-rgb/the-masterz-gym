import { SectionTitle, Button, Input, Label } from "@masterz/ui";
import { MapPin, Phone, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-background">
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="Nous Contacter" subtitle="Une question ? Besoin d&apos;informations ? Notre équipe est à votre écoute." />
        
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Infos */}
          <div className="space-y-8">
            <div className="bg-surface p-8 rounded-xl border border-border flex items-start space-x-6">
              <MapPin className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Adresse</h3>
                <p className="text-gray-400">Av. Said Daoudi, Kénitra, Maroc</p>
              </div>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-border flex items-start space-x-6">
              <Phone className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Téléphone / WhatsApp</h3>
                <p className="text-gray-400">07 64 53 62 80</p>
              </div>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-border flex items-start space-x-6">
              <Clock className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Horaires</h3>
                <p className="text-gray-400">Lundi - Vendredi : 06:00 - 00:00<br/>Samedi : 08:00 - 20:00<br/>Dimanche : 10:00 - 16:00</p>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="bg-surface p-8 rounded-xl border border-border">
            <h3 className="text-2xl font-bold text-white mb-6">Envoyez-nous un message</h3>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" placeholder="Votre nom" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="votre@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <textarea 
                  id="message" 
                  rows={4}
                  className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Comment pouvons-nous vous aider ?"
                ></textarea>
              </div>
              <Button variant="primary" className="w-full">Envoyer le message</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

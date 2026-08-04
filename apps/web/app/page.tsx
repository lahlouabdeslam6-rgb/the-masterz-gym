import React from "react";
import Link from "next/link";
import { HeroSection } from "@/components/sections/HeroSection";
import { MembershipPlansList } from "@/components/MembershipPlansList";
import { SectionTitle, Card, CardContent, CardHeader, CardTitle, Button } from "@masterz/ui";
import { Dumbbell, Activity, Heart, Clock, MapPin } from "lucide-react";
import { reviews } from "@/lib/mock-data";

// ---- SECTIONS ----

function AboutSection() {
  return (
    <section className="py-24 px-6 bg-surface">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          title="Plus qu&apos;une salle de sport"
          subtitle="Découvrez une ambiance unique où se mêlent effort, technologie et détente, dans la salle la plus moderne de Kénitra."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
          <Card className="bg-background border-border">
            <CardHeader>
              <Dumbbell className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Équipement Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Des machines de dernière génération pour la musculation et le cardio, adaptées à tous les niveaux.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background border-border">
            <CardHeader>
              <Activity className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Analyse Corporelle</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Suivez votre évolution de près (masse musculaire, graisse, hydratation) pour des décisions d&apos;entraînement ciblées.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background border-border">
            <CardHeader>
              <Heart className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Recovery & Bien-être</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Sauna, bains glacés et bottes de compression pour récupérer comme un athlète de haut niveau.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function AtmosphereSection() {
  return (
    <section className="py-24 px-6 bg-background">
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="L&apos;Atmosphère The Masterz" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-64 bg-surface rounded-xl flex items-center justify-center text-gray-500 uppercase tracking-widest text-xs border border-border">Musculation</div>
          <div className="h-64 bg-surface rounded-xl flex items-center justify-center text-gray-500 uppercase tracking-widest text-xs border border-border">Cardio</div>
          <div className="h-64 bg-surface rounded-xl flex items-center justify-center text-gray-500 uppercase tracking-widest text-xs border border-border">Recovery</div>
          <div className="h-64 bg-surface rounded-xl flex items-center justify-center text-gray-500 uppercase tracking-widest text-xs border border-border">Réception</div>
          <div className="h-64 bg-surface rounded-xl flex items-center justify-center text-gray-500 uppercase tracking-widest text-xs border border-border">Machines</div>
          <div className="h-64 bg-surface rounded-xl flex items-center justify-center text-gray-500 uppercase tracking-widest text-xs border border-border">Ambiance</div>
        </div>
      </div>
    </section>
  );
}

function PlansSection() {
  return (
    <section className="py-24 px-6 bg-surface">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          title="Nos Formules"
          subtitle="Des abonnements flexibles pour répondre à vos objectifs sportifs."
        />
        <div className="mt-16">
          <MembershipPlansList />
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="py-24 px-6 bg-background">
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="Ils nous font confiance" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((review) => (
            <Card key={review.id} className="bg-surface border-border">
              <CardContent className="pt-6">
                <div className="flex text-yellow-400 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <p className="text-gray-300 italic">&quot;{review.text}&quot;</p>
                <p className="text-sm text-gray-500 mt-4">{review.date}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-32 px-6 bg-primary text-black text-center">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-4xl md:text-5xl font-black uppercase mb-8">Prêt à commencer votre transformation ?</h2>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Link href="/inscription">
            <Button size="lg" className="w-full sm:w-auto bg-black text-white hover:bg-gray-900 border-none">
              S&apos;inscrire maintenant
            </Button>
          </Link>
          <Link href="/abonnements">
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-black text-black hover:bg-black hover:text-white">
              Découvrir les abonnements
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---- MAIN PAGE COMPONENT ----

function ServicesSection() {
  const services = [
    { title: "Musculation et cardio", desc: "Des équipements dernière génération pour sculpter votre corps.", link: "/la-salle" },
    { title: "Coaching personnel", desc: "Un accompagnement sur-mesure avec nos experts.", link: "/coaching" },
    { title: "Analyse corporelle", desc: "Mesurez vos progrès avec précision.", link: "/analyse-corporelle" },
    { title: "Cycle de récupération", desc: "Sauna, bain glacé et compression pour récupérer plus vite.", link: "/recovery" },
    { title: "Healthy Café", desc: "Boissons et repas adaptés à vos besoins nutritionnels.", link: "/healthy-cafe" },
  ];

  return (
    <section className="py-24 px-6 bg-background">
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="Nos Services" subtitle="Une gamme complète pour atteindre vos objectifs" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
          {services.map((s, i) => (
            <Card key={i} className="bg-surface border-border flex flex-col hover:border-primary transition-colors group">
              <div className="h-48 bg-background flex items-center justify-center rounded-t-xl overflow-hidden border-b border-border">
                <span className="text-gray-600 text-xs uppercase tracking-widest group-hover:text-primary transition-colors">Visuel {s.title}</span>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-gray-400 mb-6 flex-1">{s.desc}</p>
                <Link href={s.link} className="text-primary font-semibold hover:underline flex items-center">
                  En savoir plus <span className="ml-2">→</span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactAndHoursSection() {
  // Simple check if gym is open today
  let isOpen = false;
  if (typeof window !== "undefined") {
    const hour = new Date().getHours();
    const day = new Date().getDay(); // 0 = Sunday
    if (day >= 1 && day <= 5) isOpen = hour >= 6 && hour < 24;
    else if (day === 6) isOpen = hour >= 8 && hour < 20;
    else if (day === 0) isOpen = hour >= 10 && hour < 16;
  }

  return (
    <section className="py-24 px-6 bg-surface">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <SectionTitle title="Horaires d&apos;ouverture" className="text-left mb-8" />
            <div className="bg-background rounded-xl p-8 border border-border">
              <div className="mb-6 flex items-center space-x-3">
                <Clock className="h-6 w-6 text-primary" />
                <span className="text-lg font-medium">Statut Actuel : </span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${isOpen ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {isOpen ? "OUVERT" : "FERMÉ"}
                </span>
              </div>
              <ul className="space-y-4 text-gray-300">
                <li className="flex justify-between border-b border-border pb-4">
                  <span className="font-medium">Lundi - Vendredi</span>
                  <span>06:00 - 00:00</span>
                </li>
                <li className="flex justify-between border-b border-border pb-4">
                  <span className="font-medium">Samedi</span>
                  <span>08:00 - 20:00</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium">Dimanche</span>
                  <span>10:00 - 16:00</span>
                </li>
              </ul>
            </div>
          </div>
          <div>
            <SectionTitle title="Localisation & Contact" className="text-left mb-8" />
            <div className="h-64 bg-background rounded-xl flex items-center justify-center border border-border mb-8">
               <span className="text-gray-600 text-xs uppercase tracking-widest">Carte Interactive Placeholder</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
                <span className="text-gray-300">Av. Said Daoudi, Kénitra, Maroc</span>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline" className="flex-1">
                  Itinéraire
                </Button>
                <Link href="/contact" className="flex-1">
                  <Button variant="primary" className="w-full">
                    Nous contacter
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {

  return (
    <div className="w-full">
      <HeroSection />
      <AboutSection />
      <AtmosphereSection />
      <ServicesSection />
      <PlansSection />
      <TrustSection />
      <ContactAndHoursSection />
      <FinalCTA />
    </div>
  );
}

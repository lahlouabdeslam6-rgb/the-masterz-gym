import React from "react";
import Link from "next/link";
import { Button } from "@masterz/ui";

export function HeroSection() {
  return (
    <section className="relative flex h-screen min-h-[600px] w-full items-center justify-center overflow-hidden">
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <div className="h-full w-full bg-surface">
          {/* Placeholder for real video/image: /media/hero-bg.mp4 or .jpg */}
          <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a]">
             <span className="text-gray-600 opacity-50 uppercase tracking-widest text-sm">Media Placeholder</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center text-center px-4">
        <span className="mb-4 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-primary">
          WE ARE THE MASTERZ
        </span>
        <h1 className="mb-6 max-w-4xl text-5xl font-black uppercase leading-tight tracking-tighter text-white md:text-7xl lg:text-8xl">
          Dépassez Vos <span className="text-primary">Limites</span>
        </h1>
        <p className="mb-10 max-w-2xl text-lg font-medium text-gray-300 md:text-xl">
          Une expérience complète dédiée à votre force, votre performance et votre récupération.
        </p>
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          <Link href="/la-salle">
            <Button size="lg" variant="primary" className="w-full sm:w-auto">
              Découvrir la salle
            </Button>
          </Link>
          <Link href="/abonnements">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-white border-white hover:bg-white hover:text-black">
              Voir les abonnements
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

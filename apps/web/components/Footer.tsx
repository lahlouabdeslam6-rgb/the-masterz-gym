import React from "react";
import Link from "next/link";
import { Dumbbell, Instagram, Facebook, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background pt-16 text-gray-400">
      <div className="mx-auto max-w-7xl px-6 pb-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Brand */}
          <div className="flex flex-col space-y-6">
            <Link href="/" className="flex items-center space-x-2 text-white">
              <Dumbbell className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold uppercase tracking-wider">
                The Masterz Gym
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              Une expérience complète dédiée à votre force, votre performance et votre récupération à Kénitra.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-6 font-semibold uppercase text-white">Navigation</h4>
            <ul className="flex flex-col space-y-3 text-sm">
              <li>
                <Link href="/la-salle" className="hover:text-primary transition-colors">La salle</Link>
              </li>
              <li>
                <Link href="/abonnements" className="hover:text-primary transition-colors">Abonnements</Link>
              </li>
              <li>
                <Link href="/coaching" className="hover:text-primary transition-colors">Coaching</Link>
              </li>
              <li>
                <Link href="/recovery" className="hover:text-primary transition-colors">Recovery</Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="mb-6 font-semibold uppercase text-white">Informations</h4>
            <ul className="flex flex-col space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 flex-shrink-0 text-primary" />
                <span>Av. Said Daoudi, Kénitra, Maroc</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 flex-shrink-0 text-primary" />
                <span>07 64 53 62 80</span>
              </li>
            </ul>
          </div>

          {/* Horaires */}
          <div>
            <h4 className="mb-6 font-semibold uppercase text-white">Horaires</h4>
            <ul className="flex flex-col space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span>Lundi - Vendredi</span>
                <span className="text-white">06:00 - 00:00</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Samedi</span>
                <span className="text-white">08:00 - 20:00</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Dimanche</span>
                <span className="text-white">10:00 - 16:00</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-16 flex flex-col items-center justify-between border-t border-border pt-8 text-xs md:flex-row">
          <p>© {new Date().getFullYear()} The Masterz Gym. Tous droits réservés.</p>
          <div className="mt-4 flex space-x-6 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a>
            <a href="#" className="hover:text-white transition-colors">CGV</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

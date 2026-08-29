import Link from "next/link";
import {
  ArrowUpRight,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { contactLinks } from "@/lib/contact-links";
import { BrandLogo } from "./BrandLogo";

const exploreLinks = [
  ["La salle", "/la-salle"],
  ["Abonnements", "/abonnements"],
  ["Coaching", "/coaching"],
  ["Recovery", "/recovery"],
  ["Store", "/store"],
];

const memberLinks = [
  ["Analyse corporelle (Coaching)", "/coaching#analyse-corporelle"],
  ["Healthy Café", "/healthy-cafe"],
  ["Activation membre", "/activation-membre"],
  ["Connexion", "/connexion"],
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#04070a] pt-16 text-gray-400">
      <div className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr]">
          <div className="flex flex-col items-start space-y-6">
            <BrandLogo />
            <p className="max-w-sm text-sm leading-7">
              Une expérience fitness complète dédiée à la force, la performance
              et la récupération à Kénitra.
            </p>
            <a
              href="https://wa.me/212764536280"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-primary transition hover:text-white"
            >
              <MessageCircle className="h-5 w-5" /> Écrire sur WhatsApp
            </a>
          </div>

          <FooterLinks title="Explorer" links={exploreLinks} />
          <FooterLinks title="Votre parcours" links={memberLinks} />

          <div>
            <h4 className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-white">
              Nous trouver
            </h4>
            <div className="space-y-4 text-sm leading-6">
              <a
                href={contactLinks.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 transition hover:text-primary"
              >
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> Av.
                Said Daoudi, Kénitra, Maroc
              </a>
              <a
                href="tel:+212764536280"
                className="flex items-center gap-3 transition hover:text-primary"
              >
                <Phone className="h-5 w-5 text-primary" /> 07 64 53 62 80
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 font-bold uppercase tracking-[0.1em] text-primary"
              >
                Contact <ArrowUpRight className="h-4 w-4" />
              </Link>
              <div className="flex items-center gap-3 pt-1">
                <FooterSocialLink
                  href={contactLinks.instagram}
                  label="Instagram Masterz Gym"
                  icon={Instagram}
                />
                <FooterSocialLink
                  href={contactLinks.facebook}
                  label="Facebook Masterz Gym"
                  icon={Facebook}
                />
                <FooterSocialLink
                  href={contactLinks.email}
                  label="Email Masterz Gym"
                  icon={Mail}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-7 text-xs text-gray-500 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} The Masterz Gym. Tous droits réservés.
          </p>
          <p>Kénitra · Maroc</p>
        </div>
      </div>
    </footer>
  );
}

function FooterSocialLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Instagram;
}) {
  const isEmail = href.startsWith("mailto:");

  return (
    <a
      href={href}
      target={isEmail ? undefined : "_blank"}
      rel={isEmail ? undefined : "noopener noreferrer"}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-gray-400 transition hover:border-primary hover:bg-primary/10 hover:text-primary"
    >
      <Icon className="h-5 w-5" />
    </a>
  );
}

function FooterLinks({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h4 className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-white">
        {title}
      </h4>
      <ul className="space-y-3 text-sm">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="transition hover:text-primary">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

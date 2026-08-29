import {
  Clock3,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";
import { SectionShell } from "@/components/SectionShell";
import { contactLinks } from "@/lib/contact-links";

const details = [
  {
    icon: MapPin,
    title: "Adresse",
    content: "Av. Said Daoudi, Kénitra, Maroc",
  },
  {
    icon: Phone,
    title: "Téléphone",
    content: "07 64 53 62 80",
    href: "tel:+212764536280",
  },
  {
    icon: Clock3,
    title: "Horaires",
    content: "Confirmés par l’accueil et les canaux officiels",
  },
];

const socialLinks = [
  {
    icon: Instagram,
    label: "Instagram",
    href: contactLinks.instagram,
  },
  {
    icon: Facebook,
    label: "Facebook",
    href: contactLinks.facebook,
  },
  {
    icon: Mail,
    label: "Email",
    href: contactLinks.email,
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Parlons de votre prochaine étape."
        description="Une question sur la salle, une formule ou un service ? L’équipe Masterz vous répond directement."
      />
      <SectionShell>
        <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            {details.map(({ icon: Icon, title, content, href }) => (
              <article
                key={title}
                className="flex gap-5 rounded-lg border border-white/10 bg-[#080e13] p-6"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white">
                    {title}
                  </h2>
                  {href ? (
                    <a
                      href={href}
                      className="mt-2 block text-sm leading-6 text-gray-400 transition hover:text-primary"
                    >
                      {content}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {content}
                    </p>
                  )}
                </div>
              </article>
            ))}
            <a
              href="https://wa.me/212764536280"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-[#20bd7a]/30 bg-[#16a66a]/10 p-6 text-sm font-black uppercase tracking-[0.1em] text-[#5de0a4]"
            >
              <span className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5" /> Ouvrir WhatsApp
              </span>
              <span>↗</span>
            </a>
            <div className="grid grid-cols-3 gap-3">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={
                    href.startsWith("mailto:")
                      ? undefined
                      : "noopener noreferrer"
                  }
                  aria-label={`Ouvrir ${label}`}
                  className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-[#080e13] text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  <Icon className="h-6 w-6 text-primary" />
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-primary/20 bg-[linear-gradient(145deg,#09141d,#07101a)] p-6 sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
              Message direct
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-[-0.035em] text-white sm:text-4xl">
              Comment pouvons-nous vous aider ?
            </h2>
            <p className="mt-4 text-sm leading-6 text-gray-400">
              Remplissez ces deux champs : votre message s’ouvrira directement
              dans WhatsApp.
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-primary/20 bg-[#080e13]">
          <div className="grid lg:grid-cols-[0.34fr_0.66fr]">
            <div className="flex flex-col justify-center p-7 sm:p-9">
              <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-primary text-[#031017]">
                <MapPin className="h-6 w-6" />
              </span>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-primary">
                The Masterz Gym
              </p>
              <h2 className="mt-3 font-display text-3xl font-black uppercase text-white">
                Trouvez-nous facilement.
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Av. Said Daoudi, Kénitra. Cliquez sur la carte pour ouvrir
                l’itinéraire dans Google Maps.
              </p>
              <a
                href={contactLinks.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-primary hover:text-white"
              >
                Ouvrir dans Google Maps <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="relative min-h-80 border-t border-white/10 lg:border-l lg:border-t-0">
              <iframe
                title="Carte The Masterz Gym"
                src={contactLinks.googleMapsEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="pointer-events-none absolute inset-0 h-full w-full border-0 grayscale-[0.2]"
              />
              <a
                href={contactLinks.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ouvrir The Masterz Gym dans Google Maps"
                className="absolute inset-0 z-10"
              />
            </div>
          </div>
        </div>
      </SectionShell>
    </>
  );
}

import { Clock3, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";
import { SectionShell } from "@/components/SectionShell";

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
      </SectionShell>
    </>
  );
}

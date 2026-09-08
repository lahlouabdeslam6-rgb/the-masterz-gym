import Link from "next/link";
import {
  ArrowUpRight,
  Dumbbell,
  Flame,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { buttonStyles } from "@masterz/ui";
import { publicClubs } from "@/lib/clubs";

const clubDetails = [
  {
    icon: Dumbbell,
    features: ["Musculation & cardio", "Coaching personnel", "Recovery"],
    media: true,
  },
  {
    icon: UsersRound,
    features: ["Fitness & CrossFit", "Cours collectifs", "Arts martiaux"],
    media: false,
  },
] as const;

export function PublicClubChooser() {
  return (
    <section
      id="clubs"
      className="scroll-mt-28 border-b border-white/10 bg-[#05090d] py-14 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto mb-9 max-w-3xl text-center">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.25em] text-primary">
            Les clubs Masterz
          </p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase leading-[0.94] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
            Choisissez l experience qui vous ressemble.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
            Deux clubs complementaires, une seule equipe et un parcours clair
            des la premiere visite.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {publicClubs.map((club, index) => {
            const detail = clubDetails[index];
            const Icon = detail.icon;
            return (
              <article
                key={club.id}
                className="group relative isolate min-h-[470px] overflow-hidden border border-white/10 bg-[#08121a] p-7 transition duration-300 hover:-translate-y-1 hover:border-primary/45 sm:p-9"
              >
                {detail.media ? (
                  <>
                    <video
                      aria-hidden="true"
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 -z-30 h-full w-full object-cover opacity-45"
                    >
                      <source
                        src="/media/masterz-club-01.mp4"
                        type="video/mp4"
                      />
                    </video>
                    <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,#04080c_0%,rgba(4,8,12,.9)_52%,rgba(4,8,12,.45)_100%)]" />
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_85%_15%,rgba(255,122,24,.28),transparent_34%),radial-gradient(circle_at_75%_70%,rgba(0,212,255,.18),transparent_38%),#071019]" />
                    <div className="absolute -right-16 top-12 -z-20 h-64 w-64 rotate-12 border-[46px] border-orange-400/10" />
                    <Flame className="absolute bottom-8 right-8 -z-10 h-40 w-40 text-orange-400/[0.08]" />
                  </>
                )}

                <div className="flex items-start justify-between gap-5">
                  <span className="flex h-14 w-14 items-center justify-center border border-primary/30 bg-primary/10 text-primary">
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className="border border-white/15 bg-black/30 px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.14em] text-gray-300">
                    {club.internalName}
                  </span>
                </div>

                <div className="mt-20 max-w-xl">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-primary">
                    {club.signature}
                  </p>
                  <h3 className="mt-3 font-display text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white sm:text-5xl">
                    {club.name}
                  </h3>
                  <ul className="mt-6 grid gap-2 text-sm text-gray-300 sm:grid-cols-3">
                    {detail.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={club.href} className={buttonStyles()}>
                      Decouvrir le club <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/inscription?club=${club.query}`}
                      className={buttonStyles({ variant: "outline" })}
                    >
                      Choisir ce club
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

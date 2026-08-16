import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonStyles } from "@masterz/ui";

export function FinalCTA({
  eyebrow = "Passez à l’action",
  title = "Votre prochaine version commence ici.",
  description = "Rejoignez un environnement conçu pour entraîner, progresser et récupérer avec méthode.",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden border-y border-primary/20 bg-primary px-5 py-16 text-[#031116] sm:px-8 lg:py-20">
      <div className="absolute -right-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border-[40px] border-white/25" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.28em]">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl font-medium text-[#08313c]">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Link
            href="/inscription"
            className={buttonStyles({ variant: "dark", size: "lg" })}
          >
            S’inscrire <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            href="/contact"
            className={buttonStyles({
              variant: "outline",
              size: "lg",
              className:
                "border-black/40 text-black hover:border-black hover:bg-black hover:text-white",
            })}
          >
            Nous contacter
          </Link>
        </div>
      </div>
    </section>
  );
}

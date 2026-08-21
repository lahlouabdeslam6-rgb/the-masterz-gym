import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  backHref = "/",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  backHref?: string;
}) {
  return (
    <div className="min-h-[calc(100vh-107px)] bg-[#05080b] px-5 py-12 sm:px-8 lg:py-16">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-lg border border-white/10 bg-[#0a0f14] shadow-[0_30px_100px_rgba(0,0,0,0.45)] lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="relative hidden overflow-hidden border-r border-white/10 bg-[linear-gradient(150deg,#07131b_0%,#071a2d_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 top-16 h-72 w-72 rounded-full border-[50px] border-primary/10" />
          <div className="relative">
            <BrandLogo />
            <p className="mt-12 text-xs font-black uppercase tracking-[0.28em] text-primary">
              Espace Masterz
            </p>
            <h2 className="mt-5 font-display text-4xl font-black uppercase leading-[0.94] tracking-[-0.04em] text-white">
              Un accès simple. Une progression sans détour.
            </h2>
          </div>
          <div className="relative space-y-4 text-sm text-gray-300">
            <p className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" /> Parcours sécurisé
            </p>
            <p className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Données validées
              par l’équipe
            </p>
            <p className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" /> Expérience membre
              centralisée
            </p>
          </div>
        </aside>

        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mb-9 flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <BrandLogo compact />
            </div>
            <Link
              href={backHref}
              className="ml-auto inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-gray-500 transition hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase leading-none tracking-[-0.035em] text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400 sm:text-base">
            {description}
          </p>
          <div className="mt-9">{children}</div>
        </div>
      </div>
    </div>
  );
}

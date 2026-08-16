import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHero({
  eyebrow,
  title,
  description,
  image,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#071018] px-5 py-20 sm:px-8 md:py-24 lg:py-28">
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover object-center opacity-35"
        />
      ) : null}
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(3,6,9,0.98)_0%,rgba(3,6,9,0.88)_46%,rgba(3,6,9,0.45)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_25%,rgba(0,212,255,0.16),transparent_32%)]" />
      <div className="absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-gray-500">
          <Link href="/" className="transition hover:text-primary">
            Accueil
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-gray-300">{eyebrow}</span>
        </div>
        <div className="max-w-3xl">
          <p className="mb-5 text-xs font-black uppercase tracking-[0.3em] text-primary">
            {eyebrow}
          </p>
          <h1 className="font-display text-4xl font-black uppercase leading-[0.9] tracking-[-0.045em] text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-gray-300 sm:text-lg">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  compact = true,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  compact?: boolean;
  align?: "left" | "center";
}) {
  const centered = align === "center";

  return (
    <section
      className={`relative isolate overflow-hidden border-b border-white/10 bg-[#071018] px-5 sm:px-8 ${
        compact ? "py-8 sm:py-9 lg:py-10" : "py-20 md:py-24 lg:py-28"
      }`}
    >
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
        <div
          className={`mb-8 items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-gray-500 ${
            compact ? "hidden" : "flex"
          }`}
        >
          <Link href="/" className="transition hover:text-primary">
            Accueil
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-gray-300">{eyebrow}</span>
        </div>
        <div
          className={`${centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}`}
        >
          <p
            className={`${compact ? "mb-2.5" : "mb-5"} text-[0.7rem] font-bold uppercase tracking-[0.28em] text-primary`}
          >
            {eyebrow}
          </p>
          <h1
            className={`font-display font-bold uppercase tracking-[-0.035em] text-white ${
              compact
                ? "text-3xl leading-[1] sm:text-4xl lg:text-[2.55rem]"
                : "text-4xl leading-[0.9] sm:text-5xl md:text-6xl lg:text-7xl"
            }`}
          >
            {title}
          </h1>
          <p
            className={`${centered ? "mx-auto" : ""} ${compact ? "mt-3" : "mt-7"} max-w-2xl text-sm font-normal leading-6 text-gray-400 sm:text-[0.95rem]`}
          >
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}

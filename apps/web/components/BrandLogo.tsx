import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="The Masterz Gym — Accueil"
      className={`relative block shrink-0 ${
        compact ? "h-14 w-[180px]" : "h-20 w-[250px]"
      }`}
    >
      <Image
        src="/media/masterz-logo-header-cropped.png"
        alt="Morocco Master Gym"
        fill
        priority
        sizes={compact ? "180px" : "250px"}
        className="object-contain object-left"
      />
    </Link>
  );
}

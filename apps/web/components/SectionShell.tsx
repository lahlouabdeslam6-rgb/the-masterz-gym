import type { ReactNode } from "react";

export function SectionShell({
  children,
  className = "",
  id,
  tone = "dark",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "dark" | "surface" | "blue";
}) {
  const tones = {
    dark: "bg-background",
    surface: "border-y border-white/[0.06] bg-[#0a0f14]",
    blue: "border-y border-primary/15 bg-[linear-gradient(135deg,#06131b_0%,#07101f_55%,#071a2b_100%)]",
  };

  return (
    <section
      id={id}
      className={`relative overflow-hidden px-5 py-20 sm:px-8 lg:py-28 ${tones[tone]} ${className}`}
    >
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
  );
}

import * as React from "react";

export function SectionTitle({
  title,
  subtitle,
  eyebrow,
  align = "center",
  className = "",
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  align?: "left" | "center";
  className?: string;
}) {
  const alignment = align === "left" ? "text-left" : "text-center";
  const subtitleWidth = align === "left" ? "max-w-2xl" : "mx-auto max-w-2xl";

  return (
    <div className={`mb-10 ${alignment} md:mb-14 ${className}`}>
      {eyebrow ? (
        <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-3xl font-black uppercase leading-[0.95] tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className={`${subtitleWidth} mt-5 text-base leading-7 text-gray-400 md:text-lg`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

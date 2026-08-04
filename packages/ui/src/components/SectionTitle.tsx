import * as React from "react";

export function SectionTitle({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`mb-12 text-center md:mb-16 ${className}`}>
      <h2 className="text-3xl font-black uppercase tracking-tight text-white md:text-5xl lg:text-6xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400 md:text-xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}

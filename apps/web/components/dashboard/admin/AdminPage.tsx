import type { ReactNode } from "react";

export function AdminPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <header className="border-b border-white/10 pb-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-[-0.04em] text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400 sm:text-base">
          {description}
        </p>
      </header>
      <div className="mt-7">{children}</div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import Link from "next/link";

export const overviewSurface =
  "min-w-0 rounded-2xl border border-white/10 bg-[#08131d] p-5 sm:p-6";

export function OverviewHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(115deg,rgba(0,212,255,.12),#08131d_75%)] p-6 sm:p-7">
      <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div className="max-w-xl">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[.2em] text-primary">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
        </div>
        {children ? <div className="shrink-0">{children}</div> : null}
      </div>
    </section>
  );
}

export function OverviewMetric({
  icon: Icon,
  value,
  label,
  detail,
  onClick,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  detail: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[.08] text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {onClick ? (
          <ArrowUpRight
            className="h-4 w-4 text-gray-500 group-hover:text-primary"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-white">
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-200">{label}</p>
      <p className="mt-2 text-xs leading-5 text-gray-400">{detail}</p>
    </>
  );
  const className = `${overviewSurface} group text-left ${onClick ? "transition hover:border-primary/40 hover:bg-primary/[.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" : ""}`;
  return onClick ? (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={label}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function OverviewAction({
  icon: Icon,
  title,
  description,
  onClick,
  href,
  featured = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  featured?: boolean;
}) {
  const className = `group flex min-w-0 items-center gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary hover:border-primary/45 ${featured ? "border-primary/30 bg-primary/[.08]" : "border-white/10 bg-[#08131d] hover:bg-primary/[.04]"}`;
  const content = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white group-hover:text-primary">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-gray-400">
          {description}
        </span>
      </span>
      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-primary"
        aria-hidden="true"
      />
    </>
  );
  return href ? (
    <Link className={className} href={href}>
      {content}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

export function OverviewGuide({
  steps,
}: {
  steps: { title: string; text: string }[];
}) {
  return (
    <section
      className={overviewSurface}
      aria-label="Comment utiliser mon espace"
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[.16em] text-primary">
        Les bons repères
      </p>
      <h3 className="mt-2 text-lg font-semibold text-white">
        Votre espace, simplement.
      </h3>
      <ol className="mt-5 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/[.06] text-xs font-semibold text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-200">{step.title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">
                {step.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const clubDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Casablanca",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function dayKey(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : clubDay.format(date);
}

// Calendar buckets use the club timezone, not the device's timezone or UTC day.
export function activityDays(
  timestamps: string[],
  reference: Date,
  future = false,
) {
  const today = new Date(`${dayKey(reference)}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + (future ? index : index - 6));
    const key = dayKey(date);
    return {
      label: new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Africa/Casablanca",
        day: "numeric",
        month: "short",
      }).format(date),
      value: timestamps.filter((timestamp) => dayKey(timestamp) === key).length,
    };
  });
}

export function ActivityChart({
  title,
  description,
  data,
  emptyText,
}: {
  title: string;
  description: string;
  data: { label: string; value: number }[];
  emptyText: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className={overviewSurface} aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-gray-400">{description}</p>
        </div>
        <TrendingUp
          className="h-5 w-5 shrink-0 text-primary"
          aria-hidden="true"
        />
      </div>
      <div className="relative mt-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 flex h-32 flex-col justify-between"
          aria-hidden="true"
        >
          {[0, 1, 2].map((line) => (
            <div
              key={line}
              className="border-t border-dashed border-white/[.07]"
            />
          ))}
        </div>
        <ul
          className="relative flex justify-between gap-2"
          aria-label="Valeurs par jour"
        >
          {data.map((item) => (
            <li
              key={item.label}
              className="min-w-0 flex-1 text-center"
              aria-label={`${item.label} : ${item.value}`}
            >
              <div className="flex h-32 flex-col justify-end">
                <span className="mb-1 text-xs font-medium tabular-nums text-gray-300">
                  {item.value}
                </span>
                <div
                  className="mx-auto w-full max-w-9 rounded-t-md bg-gradient-to-t from-[#007da3] to-primary"
                  style={{
                    height: `${(item.value / max) * 95}px`,
                    minHeight: item.value ? 4 : 0,
                  }}
                  aria-hidden="true"
                />
              </div>
              <span className="mt-3 block text-[0.6rem] leading-4 text-gray-400">
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {!total ? (
        <p className="mt-4 rounded-xl bg-white/[.03] p-3 text-xs leading-5 text-gray-400">
          {emptyText}
        </p>
      ) : null}
    </section>
  );
}

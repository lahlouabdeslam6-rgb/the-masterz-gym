import * as React from "react";

export function Pill({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-gray-200 backdrop-blur-sm ${className}`}
      {...props}
    />
  );
}

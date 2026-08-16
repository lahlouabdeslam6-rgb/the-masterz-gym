import { Zap } from "lucide-react";

export function TopBanner() {
  return (
    <div className="border-b border-primary/15 bg-[#07141c] px-4 py-2 text-center text-[0.68rem] font-bold uppercase tracking-[0.12em] text-gray-200 sm:text-xs">
      <span className="inline-flex items-center gap-2">
        <Zap
          className="h-3.5 w-3.5 fill-primary text-primary"
          aria-hidden="true"
        />
        Une expérience complète : entraînement, performance et récupération
      </span>
    </div>
  );
}

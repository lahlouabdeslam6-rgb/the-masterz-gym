import { Play } from "lucide-react";

const clips = [
  { src: "/media/masterz-club-01.mp4", label: "L’énergie de la salle" },
  { src: "/media/masterz-club-02.mp4", label: "L’expérience Masterz" },
];

export function ClubMediaShowcase({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-4 ${compact ? "grid-cols-2" : "sm:grid-cols-2"}`}>
      {clips.map((clip, index) => (
        <figure
          key={clip.src}
          className={`group relative overflow-hidden rounded-lg border border-white/10 bg-[#071018] ${
            compact
              ? "aspect-[4/5]"
              : index === 0
                ? "aspect-[4/5] sm:translate-y-7"
                : "aspect-[4/5]"
          }`}
        >
          <video
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
            src={clip.src}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={clip.label}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />
          <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4 text-xs font-black uppercase tracking-[0.16em] text-white sm:p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary backdrop-blur">
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </span>
            {clip.label}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

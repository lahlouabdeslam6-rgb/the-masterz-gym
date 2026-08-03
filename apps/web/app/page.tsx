export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-ink px-6 py-16 text-sand sm:px-12 lg:px-20">
      <div
        aria-hidden="true"
        className="absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full border border-gold/20"
      />
      <div
        aria-hidden="true"
        className="absolute -right-12 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border border-gold/40"
      />
      <section className="relative z-10 max-w-4xl">
        <p className="mb-8 text-xs font-semibold uppercase tracking-[0.35em] text-gold">
          Kénitra · Maroc
        </p>
        <h1 className="max-w-3xl text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
          The Masterz <span className="text-gold">Gym</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-sand/70 sm:text-xl">
          Une nouvelle expérience sportive et bien-être se prépare. Notre espace
          digital arrive bientôt.
        </p>
        <div className="mt-12 h-px w-24 bg-gold" />
        <p className="mt-5 text-sm uppercase tracking-[0.2em] text-sand/50">
          Force · Équilibre · Progression
        </p>
      </section>
    </main>
  );
}

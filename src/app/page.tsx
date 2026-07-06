export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <section className="mx-auto flex max-w-5xl flex-col gap-6 rounded-3xl border border-brand-primary/10 bg-white/70 p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-primary">
          La Maison des Pyjamas
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
          Socle Next.js + Supabase prêt.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-foreground/70">
          Le dépôt est maintenant initialisé. Les prochaines étapes sont la baseline Supabase,
          le durcissement sécurité, puis le back-office produits/variantes/images.
        </p>
      </section>
    </main>
  );
}

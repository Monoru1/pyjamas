interface HeroSectionProps {
  siteName: string;
}

export function HeroSection({ siteName }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-brand-primary/10 bg-white px-6 py-12 shadow-sm md:px-12 md:py-20">
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-brand-accent/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-brand-primary/10 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-7">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-primary">
            {siteName}
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
            Des pyjamas doux, chics et prêts pour les moments qui comptent.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-foreground/70">
            Une boutique pensée pour commander vite, choisir la bonne taille, vérifier le stock et finaliser sur WhatsApp sans friction.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="#vedettes" className="rounded-full bg-brand-primary px-6 py-3 text-center text-sm font-semibold text-white shadow-sm">
              Voir les modèles
            </a>
            <a href="#commande" className="rounded-full border border-brand-primary/20 px-6 py-3 text-center text-sm font-semibold text-brand-primary">
              Comment commander
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-brand-primary/10 bg-brand-soft/70 p-6">
          <div className="rounded-[1.5rem] bg-background p-6 shadow-sm">
            <p className="text-sm font-semibold text-brand-primary">Expérience boutique</p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="font-semibold">Stock clair</p>
                <p className="mt-1 text-sm text-foreground/60">Tailles, couleurs et disponibilités visibles.</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="font-semibold">Commande rapide</p>
                <p className="mt-1 text-sm text-foreground/60">Panier transformé en message WhatsApp structuré.</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="font-semibold">Back-office prêt</p>
                <p className="mt-1 text-sm text-foreground/60">Produits, médias, commandes et statuts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

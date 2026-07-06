const collections = [
  {
    title: 'Famille',
    description: 'Des ensembles coordonnés pour les photos, les soirées et les matins doux.',
  },
  {
    title: 'Femme',
    description: 'Des coupes confortables avec une finition élégante et facile à porter.',
  },
  {
    title: 'Homme',
    description: 'Des pyjamas simples, propres et faciles à offrir.',
  },
];

export function CollectionGrid() {
  return (
    <section id="collections" className="grid gap-4 md:grid-cols-3">
      {collections.map((collection) => (
        <article key={collection.title} className="rounded-[2rem] border border-brand-primary/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-primary/70">
            Collection
          </p>
          <h2 className="mt-4 text-2xl font-semibold">{collection.title}</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/60">{collection.description}</p>
        </article>
      ))}
    </section>
  );
}

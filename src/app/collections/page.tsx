const collections = [
  {
    title: 'Essentiels douceur',
    description: 'Des pyjamas simples, élégants et faciles à porter toute l’année.',
    href: '/catalogue?collection=essentiels',
    tone: 'bg-brand-cream text-foreground',
  },
  {
    title: 'Maison & cocooning',
    description: 'Des pièces pensées pour les soirées lentes, les dimanches doux et les réveils tranquilles.',
    href: '/catalogue?collection=cocooning',
    tone: 'bg-brand-soft text-foreground',
  },
  {
    title: 'Famille coordonnée',
    description: 'Des ensembles pour créer une harmonie sans attendre les fêtes.',
    href: '/catalogue?collection=famille',
    tone: 'bg-brand-evergreen text-white',
  },
  {
    title: 'Cadeaux premium',
    description: 'Une sélection raffinée pour offrir un pyjama sans se tromper.',
    href: '/catalogue?collection=cadeaux',
    tone: 'bg-brand-primary text-white',
  },
];

export default function CollectionsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-10 text-foreground md:px-8">
      <div className="pointer-events-none absolute -right-28 top-10 h-96 w-96 rounded-full bg-brand-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-28 bottom-10 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-10">
        <section className="rounded-[3rem] bg-brand-evergreen p-8 text-white shadow-[0_30px_90px_rgba(15,59,46,0.22)] md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-accent">Collections</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] md:text-7xl">
            Plus que Noël : une maison entière de douceur.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/72">
            Pour celles et ceux qui cherchent un pyjama élégant toute l’année, une pièce à offrir ou un ensemble pour la maison.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {collections.map((collection) => (
            <a
              key={collection.title}
              href={collection.href}
              className={`group min-h-[320px] overflow-hidden rounded-[2.5rem] border border-brand-primary/10 p-7 shadow-[0_24px_80px_rgba(80,34,28,0.10)] transition duration-300 hover:-translate-y-1 md:p-8 ${collection.tone}`}
            >
              <div className="flex h-full flex-col justify-between gap-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-70">Collection</p>
                  <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] md:text-5xl">{collection.title}</h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 opacity-70">{collection.description}</p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-white/20 px-5 py-3 text-sm font-semibold backdrop-blur transition group-hover:bg-brand-accent group-hover:text-brand-evergreen">
                  Explorer
                </span>
              </div>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}

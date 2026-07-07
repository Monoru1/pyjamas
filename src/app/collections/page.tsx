const collections = [
  ['Noël & fêtes', 'Pyjamas et cadeaux pour les moments qui restent.', '/catalogue?collection=noel-fetes', 'bg-brand-evergreen text-white'],
  ['Famille assortie', 'Des ensembles coordonnés pour les photos et les matins doux.', '/catalogue?collection=famille-assortie', 'bg-brand-cream text-foreground'],
  ['Femme', 'Coupes douces, élégantes et faciles à porter.', '/catalogue?collection=femme', 'bg-brand-soft text-foreground'],
  ['Homme', 'Confort sobre, couleurs profondes et finition soignée.', '/catalogue?collection=homme', 'bg-white text-foreground'],
  ['Enfant', 'Douceur, fantaisie et confort pour les plus petits.', '/catalogue?collection=enfant', 'bg-brand-cream text-foreground'],
  ['Cocooning maison', 'Plaids, chaussons et détails pour rester bien chez soi.', '/catalogue?collection=cocooning-maison', 'bg-brand-evergreen text-white'],
  ['Cadeaux premium', 'Une sélection raffinée pour offrir sans se tromper.', '/catalogue?collection=cadeaux-premium', 'bg-brand-primary text-white'],
  ['Nouveautés', 'Les dernières pièces ajoutées à la maison.', '/catalogue?collection=nouveautes', 'bg-white text-foreground'],
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
            Trouvez le pyjama parfait pour chaque moment.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/72">
            Noël, famille, cocooning, cadeaux ou accessoires : chaque collection ouvre une porte différente dans la maison.
          </p>
        </section>
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {collections.map(([title, description, href, tone]) => (
            <a key={title} href={href} className={`group min-h-[300px] rounded-[2.5rem] border border-brand-primary/10 p-7 shadow-[0_24px_80px_rgba(80,34,28,0.10)] transition duration-300 hover:-translate-y-1 md:p-8 ${tone}`}>
              <div className="flex h-full flex-col justify-between gap-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-70">Collection</p>
                  <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] md:text-4xl">{title}</h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 opacity-70">{description}</p>
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

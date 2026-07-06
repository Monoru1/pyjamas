const features = [
  ['01', 'Cadeaux sans stress', 'Une selection claire pour offrir vite sans perdre le cote premium.'],
  ['02', 'Ambiance maison', 'Une direction chaude : creme, bordeaux, or doux et vert sapin.'],
  ['03', 'Achat fluide', 'Stock visible, panier simple et commande WhatsApp structuree.'],
];

export function ChristmasSignature() {
  return (
    <section className="relative overflow-hidden rounded-[3rem] bg-brand-evergreen px-6 py-12 text-white shadow-[0_30px_90px_rgba(15,59,46,0.22)] md:px-10">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent/25 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-brand-primary/35 blur-3xl" />
      <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-accent">Noel premium</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            Une boutique qui doit sentir le cadeau avant meme le premier clic.
          </h2>
        </div>
        <div className="grid gap-4">
          {features.map(([number, title, text]) => (
            <article key={number} className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex gap-4">
                <span className="text-sm font-semibold text-brand-accent">{number}</span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">{text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

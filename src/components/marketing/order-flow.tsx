const steps = [
  ['1', 'Choisir', 'Le client selectionne le modele, la taille, la couleur et la quantite.'],
  ['2', 'Verifier', 'Le panier calcule le total et garde les references produit.'],
  ['3', 'Envoyer', 'La commande est envoyee sur WhatsApp avec un message propre.'],
];

export function OrderFlow() {
  return (
    <section id="commande" className="rounded-[2.5rem] bg-brand-primary px-6 py-10 text-white md:px-10">
      <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Commande</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            Un parcours simple jusqu au message WhatsApp.
          </h2>
          <p className="mt-5 text-sm leading-7 text-white/75">
            Le front doit rester clair. Le client voit le stock, ajoute au panier et envoie une commande lisible.
          </p>
        </div>

        <div className="grid gap-4">
          {steps.map(([number, title, text]) => (
            <article key={number} className="rounded-3xl bg-white/10 p-5">
              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand-primary">
                  {number}
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/75">{text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

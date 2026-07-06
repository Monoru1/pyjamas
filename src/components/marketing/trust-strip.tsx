const items = [
  ['Stock visible', 'Tailles et couleurs clairement indiquées avant de commander.'],
  ['Commande rapide', 'Un panier simple, prêt à devenir un message WhatsApp soigné.'],
  ['Esprit cadeau', 'Des pièces pensées pour offrir, partager et créer un souvenir.'],
];

export function TrustStrip() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {items.map(([title, text]) => (
        <article key={title} className="rounded-3xl border border-brand-primary/10 bg-white p-6 shadow-sm">
          <p className="text-lg font-semibold">{title}</p>
          <p className="mt-2 text-sm leading-6 text-foreground/60">{text}</p>
        </article>
      ))}
    </section>
  );
}

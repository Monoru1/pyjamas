const items = [
  ['Stock visible', 'Les tailles et couleurs disponibles seront affichées clairement.'],
  ['Commande rapide', 'Le panier prépare un message de commande structuré.'],
  ['Gestion boutique', 'Le catalogue reste piloté par le back-office.'],
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

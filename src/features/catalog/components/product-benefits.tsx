const benefits = [
  ['Cadeau pret', 'Une piece qui se glisse naturellement sous le sapin.'],
  ['Confort choisi', 'Tailles et couleurs visibles avant de commander.'],
  ['Commande fluide', 'Le panier prepare un message WhatsApp clair.'],
];

export function ProductBenefits() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {benefits.map(([title, text]) => (
        <article key={title} className="rounded-[1.5rem] border border-brand-primary/10 bg-white/75 p-4 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-brand-primary">{title}</p>
          <p className="mt-2 text-xs leading-5 text-foreground/60">{text}</p>
        </article>
      ))}
    </div>
  );
}

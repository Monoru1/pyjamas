export function EmptyProducts() {
  return (
    <div className="rounded-[2rem] border border-dashed border-brand-primary/20 bg-white/70 p-8 text-center md:col-span-3">
      <p className="text-lg font-semibold">Aucun produit vedette pour le moment.</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-foreground/60">
        Dès que les produits actifs et mis en avant seront ajoutés dans le back-office, ils apparaîtront automatiquement ici.
      </p>
    </div>
  );
}

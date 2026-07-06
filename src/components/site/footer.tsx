export function Footer() {
  return (
    <footer className="border-t border-brand-primary/10 bg-white/60 px-5 py-10 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <p className="text-lg font-semibold text-brand-primary">La Maison des Pyjamas</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-foreground/60">
            Boutique de pyjamas pour femmes, hommes, enfants, couples et familles.
          </p>
        </div>
        <div>
          <p className="font-semibold">Navigation</p>
          <div className="mt-3 grid gap-2 text-sm text-foreground/60">
            <a href="/catalogue">Catalogue</a>
            <a href="/#collections">Collections</a>
            <a href="/#commande">Commander</a>
          </div>
        </div>
        <div>
          <p className="font-semibold">Commande</p>
          <p className="mt-3 text-sm leading-6 text-foreground/60">
            Le checkout final ouvrira WhatsApp avec les references, quantites et prix.
          </p>
        </div>
      </div>
    </footer>
  );
}

import { BrandLogo } from '@/components/brand/brand-logo';

const socialLinks = [
  ['Instagram', 'https://www.instagram.com/'],
  ['Facebook', 'https://www.facebook.com/'],
  ['TikTok', 'https://www.tiktok.com/'],
  ['WhatsApp', 'https://wa.me/'],
];

export function Footer() {
  return (
    <footer className="border-t border-brand-primary/10 bg-white/70 px-5 py-12 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr]">
        <div>
          <BrandLogo />
          <p className="mt-4 max-w-md text-sm leading-6 text-foreground/60">
            Pyjamas, accessoires cocooning et cadeaux premium pour femmes, hommes, enfants, couples et familles.
          </p>
        </div>
        <div>
          <p className="font-semibold">Navigation</p>
          <div className="mt-3 grid gap-2 text-sm text-foreground/60">
            <a href="/collections">Collections</a>
            <a href="/catalogue">Catalogue</a>
            <a href="/accessoires">Accessoires</a>
            <a href="/panier">Panier</a>
          </div>
        </div>
        <div>
          <p className="font-semibold">Réseaux</p>
          <div className="mt-3 grid gap-2 text-sm text-foreground/60">
            {socialLinks.map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="transition hover:text-brand-primary">
                {label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <p className="font-semibold">Boutique</p>
          <p className="mt-3 text-sm leading-6 text-foreground/60">
            Retrouvez la boutique sur Google Maps et contactez-nous pour confirmer les horaires, la disponibilité et la livraison.
          </p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=La%20Maison%20des%20Pyjamas"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-evergreen"
          >
            Ouvrir la carte
          </a>
        </div>
      </div>
    </footer>
  );
}

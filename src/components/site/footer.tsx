import { BrandLogo } from '@/components/brand/brand-logo';

const socialLinks = [
  ['Instagram', 'https://www.instagram.com/'],
  ['Facebook', 'https://www.facebook.com/'],
  ['TikTok', 'https://www.tiktok.com/'],
  ['WhatsApp', 'https://wa.me/'],
];

const navigationLinks = [
  ['Collections', '/collections'],
  ['Catalogue', '/catalogue'],
  ['Accessoires', '/accessoires'],
  ['Contact', '/contact'],
  ['Panier', '/panier'],
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-brand-primary/10 bg-brand-cream px-5 py-14 md:px-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-brand-accent/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.7fr_0.7fr_1.2fr]">
        <div className="rounded-[2rem] bg-white/70 p-6 shadow-[0_24px_80px_rgba(80,34,28,0.08)] backdrop-blur">
          <BrandLogo />
          <p className="mt-5 max-w-md text-sm leading-7 text-foreground/60">
            Pyjamas, accessoires cocooning et cadeaux premium pour femmes, hommes, enfants, couples et familles.
          </p>
          <div className="mt-6 rounded-full border border-brand-primary/10 bg-brand-cream px-5 py-3 text-sm text-foreground/55">
            Newsletter douce bientôt disponible.
          </div>
        </div>

        <div className="rounded-[2rem] bg-white/55 p-6 backdrop-blur">
          <p className="font-semibold text-brand-evergreen">Navigation</p>
          <div className="mt-4 grid gap-3 text-sm text-foreground/60">
            {navigationLinks.map(([label, href]) => (
              <a key={label} href={href} className="transition hover:translate-x-1 hover:text-brand-primary">
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white/55 p-6 backdrop-blur">
          <p className="font-semibold text-brand-evergreen">Réseaux</p>
          <div className="mt-4 grid gap-3 text-sm text-foreground/60">
            {socialLinks.map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="transition hover:translate-x-1 hover:text-brand-primary">
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-brand-primary/10 bg-white shadow-[0_24px_80px_rgba(80,34,28,0.10)]">
          <div className="p-5">
            <p className="font-semibold text-brand-evergreen">Boutique</p>
            <p className="mt-2 text-sm leading-6 text-foreground/60">
              Retrouvez la maison sur la carte et confirmez les horaires avant votre passage.
            </p>
          </div>
          <iframe
            title="Carte Google Maps La Maison des Pyjamas"
            src="https://www.google.com/maps?q=La%20Maison%20des%20Pyjamas&output=embed"
            className="h-64 w-full border-0 md:h-72"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      <div className="relative mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-brand-primary/10 pt-6 text-xs text-foreground/45 md:flex-row md:items-center md:justify-between">
        <p>© 2026 La Maison des Pyjamas. Tous droits réservés.</p>
        <div className="flex flex-wrap gap-4">
          <a href="/contact">Contact</a>
          <a href="/collections">Collections</a>
          <a href="/accessoires">Accessoires</a>
        </div>
      </div>
    </footer>
  );
}

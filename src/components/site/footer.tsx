import { BrandLogo } from '@/components/brand/brand-logo';

const navigationLinks = [
  ['Collections', '/collections'],
  ['Catalogue', '/catalogue'],
  ['Accessoires', '/accessoires'],
  ['Contact', '/contact'],
];

const socialLinks = [
  ['Instagram', 'https://www.instagram.com/'],
  ['Facebook', 'https://www.facebook.com/'],
  ['TikTok', 'https://www.tiktok.com/'],
  ['WhatsApp', 'https://wa.me/'],
];

export function Footer() {
  return (
    <footer className="border-t border-brand-primary/10 bg-brand-cream px-5 py-14 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 border-b border-brand-primary/10 pb-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <BrandLogo />
            <p className="mt-5 max-w-md text-sm leading-7 text-foreground/60">
              Pyjamas, accessoires cocooning et cadeaux premium pour toute la famille.
            </p>
          </div>

          <div>
            <p className="font-semibold text-brand-evergreen">Navigation</p>
            <div className="mt-4 grid gap-3 text-sm text-foreground/60">
              {navigationLinks.map(([label, href]) => (
                <a key={label} href={href} className="transition hover:text-brand-primary">
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="font-semibold text-brand-evergreen">Réseaux</p>
            <div className="mt-4 grid gap-3 text-sm text-foreground/60">
              {socialLinks.map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" className="transition hover:text-brand-primary">
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <section className="border-b border-brand-primary/10 py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">Contact</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-brand-evergreen md:text-4xl">Trouver la boutique.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-foreground/60">
              La carte est intégrée directement pour préparer votre passage. Confirmez les horaires et la disponibilité avant de venir.
            </p>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-brand-primary/10 bg-white shadow-[0_18px_70px_rgba(80,34,28,0.08)]">
            <iframe
              title="Carte Google Maps La Maison des Pyjamas"
              src="https://www.google.com/maps?q=La%20Maison%20des%20Pyjamas&output=embed"
              className="h-72 w-full border-0 md:h-96"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>

        <div className="flex flex-col gap-3 pt-6 text-xs text-foreground/45 md:flex-row md:items-center md:justify-between">
          <p>© 2026 La Maison des Pyjamas. Tous droits réservés.</p>
          <div className="flex flex-wrap gap-4">
            <a href="/contact">Contact</a>
            <a href="/collections">Collections</a>
            <a href="/accessoires">Accessoires</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

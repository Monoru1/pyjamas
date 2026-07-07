import { BrandLogo } from '@/components/brand/brand-logo';

const navigationLinks = [
  ['Collections', '/collections'],
  ['Catalogue', '/catalogue'],
  ['Accessoires', '/accessoires'],
  ['Contact', '/contact'],
  ['Panier', '/panier'],
];

const socialLinks = [
  ['Instagram', '/contact'],
  ['Facebook', '/contact'],
  ['TikTok', '/contact'],
  ['WhatsApp', '/contact'],
];

export function Footer() {
  return (
    <footer className="border-t border-brand-primary/10 bg-brand-cream px-5 py-12 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-7 border-b border-brand-primary/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <BrandLogo />
            <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/58">
              Pyjamas de Noël, accessoires cocooning et cadeaux prêts à déposer sous le sapin.
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-brand-evergreen">
              {navigationLinks.map(([label, href]) => (
                <a key={label} href={href} className="transition hover:text-brand-primary">
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground/52">
              {socialLinks.map(([label, href]) => (
                <a key={label} href={href} className="transition hover:text-brand-primary">
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <section className="border-b border-brand-primary/10 py-9">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">Boutique</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-brand-evergreen md:text-4xl">Préparer votre passage.</h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-foreground/58">
              La carte est intégrée pour retrouver la maison et confirmer les horaires avant votre visite.
            </p>
          </div>
          <div className="overflow-hidden rounded-[1.6rem] border border-brand-primary/10 bg-white shadow-[0_14px_55px_rgba(80,34,28,0.07)]">
            <iframe
              title="Carte Google Maps La Maison des Pyjamas"
              src="https://www.google.com/maps?q=La%20Maison%20des%20Pyjamas&output=embed"
              className="h-64 w-full border-0 md:h-80"
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

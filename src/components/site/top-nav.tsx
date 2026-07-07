import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';

const navLinks = [
  ['Collections', '/collections', 'sm:inline'],
  ['Accessoires', '/accessoires', 'md:inline'],
  ['Contact', '/contact', 'lg:inline'],
];

export function TopNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-brand-primary/10 bg-brand-cream/80 px-4 py-3 backdrop-blur-2xl md:px-8 md:py-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full border border-brand-primary/10 bg-white/55 px-4 py-3 shadow-[0_20px_70px_rgba(80,34,28,0.08)] md:px-6">
        <Link href="/" aria-label="Accueil La Maison des Pyjamas" className="shrink-0 transition duration-300 hover:scale-[1.02]">
          <BrandLogo />
        </Link>
        <div className="hidden items-center rounded-full bg-brand-cream/80 px-2 py-2 text-sm font-medium text-foreground/68 shadow-inner sm:flex">
          {navLinks.map(([label, href, visibility]) => (
            <Link key={href} href={href} className={`hidden rounded-full px-4 py-2 transition hover:bg-white hover:text-brand-primary ${visibility}`}>
              {label}
            </Link>
          ))}
          <Link href="/catalogue" className="rounded-full px-4 py-2 transition hover:bg-white hover:text-brand-primary">Catalogue</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/catalogue" className="rounded-full px-3 py-2 text-sm font-medium text-foreground/65 transition hover:text-brand-primary sm:hidden">
            Shop
          </Link>
          <Link href="/panier" className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(143,20,40,0.24)] transition hover:-translate-y-0.5 hover:bg-brand-evergreen">
            Panier
          </Link>
        </div>
      </div>
    </nav>
  );
}

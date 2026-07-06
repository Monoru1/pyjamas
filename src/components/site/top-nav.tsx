import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';

export function TopNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-brand-primary/10 bg-brand-cream/85 px-5 py-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" aria-label="Accueil La Maison des Pyjamas">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-foreground/70 md:gap-5">
          <Link href="/collections" className="hidden transition hover:text-brand-primary sm:inline">Collections</Link>
          <Link href="/catalogue" className="transition hover:text-brand-primary">Catalogue</Link>
          <Link href="/panier" className="rounded-full bg-brand-primary px-4 py-2 text-white transition hover:bg-brand-evergreen">Panier</Link>
        </div>
      </div>
    </nav>
  );
}

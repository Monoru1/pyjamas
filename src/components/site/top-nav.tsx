import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';
import { MobileMenu } from '@/components/site/mobile-menu';

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-primary/10 bg-brand-cream/95 px-3 py-3 backdrop-blur-xl sm:px-5 md:px-8 lg:py-5">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4">
        <Link href="/" aria-label="Accueil La Maison des Pyjamas" className="shrink-0">
          <BrandLogo />
        </Link>
        <div className="hidden flex-1 items-center justify-center gap-6 text-sm font-medium text-foreground/70 lg:flex xl:gap-8 xl:text-base">
          <Link href="/collections" className="transition hover:text-brand-primary">Collections</Link>
          <Link href="/catalogue" className="transition hover:text-brand-primary">Catalogue</Link>
          <Link href="/accessoires" className="transition hover:text-brand-primary">Accessoires</Link>
          <Link href="/contact" className="transition hover:text-brand-primary">Contact</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/panier" className="rounded-full bg-brand-primary px-4 py-2.5 text-xs font-semibold text-white shadow-lg sm:px-5 sm:py-3 sm:text-sm md:px-7">Panier</Link>
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}

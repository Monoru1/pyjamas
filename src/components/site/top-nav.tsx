import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { MobileMenu } from '@/components/site/mobile-menu';

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#103a3020] bg-[#fff9f3f7] px-4 py-3 backdrop-blur-xl sm:px-6 lg:py-4">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link href="/" aria-label="Accueil La Maison des Pyjamas" className="shrink-0"><BrandLogo /></Link>
        <div className="hidden flex-1 items-center justify-center gap-8 text-sm font-semibold text-[#164236] lg:flex">
          <Link href="/collections" className="hover:text-[#b3203a]">Noël 2026</Link>
          <Link href="/catalogue?collection=noel" className="hover:text-[#b3203a]">Les pyjamas</Link>
          <Link href="/#notre-histoire" className="hover:text-[#b3203a]">Notre univers</Link>
          <Link href="/contact" className="hover:text-[#b3203a]">Contact</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/panier" className="inline-flex items-center gap-2 rounded-full bg-[#b3203a] px-5 py-3 text-xs font-bold text-white shadow-md sm:text-sm">
            Mon panier <ArrowUpRight size={16} />
          </Link>
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}

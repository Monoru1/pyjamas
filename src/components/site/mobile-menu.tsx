'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';

const links = [
  ['Collections', '/collections'],
  ['Catalogue', '/catalogue'],
  ['Accessoires', '/accessoires'],
  ['Contact', '/contact'],
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-primary/10 bg-white text-xl font-semibold leading-none text-brand-primary shadow-[0_12px_30px_rgba(80,34,28,0.14)] sm:h-12 sm:w-12 sm:text-2xl"
      >
        ☰
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[9999] min-h-dvh overflow-y-auto bg-brand-cream px-5 py-5 text-foreground sm:px-6 sm:py-7">
          <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col pb-8 sm:min-h-[calc(100dvh-3.5rem)] sm:pb-12">
            <div className="flex items-center justify-between border-b border-brand-primary/15 pb-7">
              <BrandLogo />
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-3xl leading-none text-white shadow-[0_14px_40px_rgba(143,20,40,0.24)]"
              >
                ×
              </button>
            </div>

            <nav className="grid gap-4 border-b border-brand-primary/15 py-8 text-[1.9rem] font-semibold leading-tight tracking-[-0.05em] text-brand-evergreen sm:gap-5 sm:py-11 sm:text-[2.35rem]">
              {links.map(([label, href]) => (
                <Link key={href} href={href} onClick={() => setIsOpen(false)} className="block w-fit transition hover:text-brand-primary">
                  {label}
                </Link>
              ))}
            </nav>

            <Link
              href="/panier"
              onClick={() => setIsOpen(false)}
              className="mt-8 inline-flex justify-center rounded-full bg-brand-primary px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_55px_rgba(143,20,40,0.26)]"
            >
              Voir le panier
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

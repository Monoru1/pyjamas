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
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-brand-primary/10 bg-white/70 text-xl font-semibold text-brand-primary shadow-sm backdrop-blur"
      >
        ☰
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[120] bg-brand-cream/96 px-5 py-6 backdrop-blur-2xl">
          <div className="mx-auto flex h-full max-w-md flex-col">
            <div className="flex items-center justify-between border-b border-brand-primary/10 pb-6">
              <BrandLogo />
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-2xl text-white shadow-[0_14px_40px_rgba(143,20,40,0.22)]"
              >
                ×
              </button>
            </div>

            <nav className="grid gap-5 border-b border-brand-primary/10 py-10 text-4xl font-semibold tracking-[-0.05em] text-brand-evergreen">
              {links.map(([label, href]) => (
                <Link key={href} href={href} onClick={() => setIsOpen(false)} className="transition hover:text-brand-primary">
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

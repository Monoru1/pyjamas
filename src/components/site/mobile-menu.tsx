'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';

const links = [
  ['Édition Noël 2026', '/collections'],
  ['Les pyjamas', '/catalogue?collection=noel'],
  ['Notre univers', '/#notre-histoire'],
  ['Contact', '/contact'],
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" aria-label="Ouvrir le menu" aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#b3203a30] bg-white text-xl font-bold text-[#b3203a]">☰</button>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] min-h-dvh overflow-y-auto bg-[#fff9f3] px-5 py-5 text-[#0c352c]">
          <div className="mx-auto flex min-h-[calc(100dvh-40px)] max-w-lg flex-col">
            <div className="flex items-center justify-between border-b border-[#0c352c30] pb-6">
              <BrandLogo />
              <button aria-label="Fermer le menu" type="button" className="grid h-12 w-12 place-items-center rounded-full bg-[#b3203a] text-2xl text-white" onClick={() => setIsOpen(false)}>×</button>
            </div>
            <nav className="grid gap-5 py-10 text-3xl font-semibold tracking-tight">
              {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setIsOpen(false)}>{label}</Link>)}
            </nav>
            <Link href="/panier" onClick={() => setIsOpen(false)} className="mt-auto mb-8 rounded-full bg-[#b3203a] p-4 text-center text-sm font-bold text-white">Voir mon panier</Link>
          </div>
        </div>
      )}
    </div>
  );
}

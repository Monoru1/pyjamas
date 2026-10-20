'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, CalendarHeart, FolderKanban, Images, LayoutDashboard, Menu, Package, ReceiptText, Settings, Tag, X } from 'lucide-react';
import { signOutAdmin } from '@/app/admin/actions';

const sections = [
  { href: '/admin', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/admin/commandes', label: 'Commandes', icon: ReceiptText },
  { href: '/admin/produits', label: 'Produits & stocks', icon: Package },
  { href: '/admin/medias', label: 'Photos & vidéos', icon: Images },
  { href: '/admin/fete', label: 'La fête de Noël', icon: CalendarHeart },
  { href: '/admin/collections', label: 'Collection Noël', icon: FolderKanban },
  { href: '/admin/promotions', label: 'Promotions', icon: Tag },
  { href: '/admin/site', label: 'Personnaliser le site', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (/^\/admin\/(login|forgot-password|reset-password)(?:\/|$)/.test(pathname)) return <>{children}</>;

  return (
    <main className="admin-shell">
      <header className="employee-header">
        <span className="font-bold text-[#123d2f]">LA MAISON · STUDIO</span>
        <button className="employee-menu-toggle" type="button" aria-expanded={mobileMenuOpen} aria-label="Afficher la navigation" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={22} />
        </button>
      </header>
      {mobileMenuOpen && <button type="button" className="employee-backdrop" aria-label="Fermer le menu" onClick={() => setMobileMenuOpen(false)} />}
      <aside className="admin-sidebar" data-open={mobileMenuOpen}>
        <div className="employee-sidebar-topline">
          <Link href="/" className="admin-brand" onClick={() => setMobileMenuOpen(false)}>
            <span className="admin-logo-wrap">
              <Image src="/brand/logo-maison-pyjamas.svg" alt="La Maison des Pyjamas" width={220} height={70} unoptimized />
            </span>
            <small>STUDIO · NOËL 2026</small>
          </Link>
          <button type="button" className="employee-close" aria-label="Fermer la navigation" onClick={() => setMobileMenuOpen(false)}><X size={21}/></button>
        </div>
        <div className="employee-side-title">Gérer la boutique</div>
        <nav aria-label="Navigation de l'administration">
          {sections.map(({ href, label, icon: Icon }) => {
            const current = href === '/admin' ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={current ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)}>
                <Icon size={19} aria-hidden="true"/><span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <Link href="/" target="_blank" className="employee-store-link">
          Voir la boutique <ArrowUpRight size={16} />
        </Link>
        <form action={signOutAdmin}>
          <button className="admin-signout" type="submit">Se déconnecter</button>
        </form>
      </aside>
      <section className="admin-content">{children}</section>
    </main>
  );
}

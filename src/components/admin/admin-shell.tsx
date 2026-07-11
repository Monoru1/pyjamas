'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, LayoutDashboard, Package, ReceiptText, Settings, Tag } from 'lucide-react';
import { signOutAdmin } from '@/app/admin/actions';

const links = [
  { href: '/admin', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/admin/commandes', label: 'Commandes', icon: ReceiptText },
  { href: '/admin/produits', label: 'Produits & stock', icon: Package },
  { href: '/admin/collections', label: 'Collections', icon: FolderKanban },
  { href: '/admin/promotions', label: 'Promotions', icon: Tag },
  { href: '/admin/site', label: 'Images accueil', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin/login') return <>{children}</>;
  return <main className="admin-shell"><aside className="admin-sidebar"><Link href="/" className="admin-brand"><span className="admin-logo-wrap"><img src="/brand/logo-maison-pyjamas.svg" alt="La Maison des Pyjamas" /></span><small>STUDIO ADMIN</small></Link><nav>{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon size={18} />{label}</Link>)}</nav><form action={signOutAdmin}><button className="admin-signout">Déconnexion</button></form></aside><section className="admin-content">{children}</section></main>;
}

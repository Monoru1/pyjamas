'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ReceiptText, Store } from 'lucide-react';
import { signOutAdmin } from '@/app/admin/actions';

const links = [
  { href: '/admin', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/admin/commandes', label: 'Commandes', icon: ReceiptText },
  { href: '/admin/produits', label: 'Produits & stock', icon: Package },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin/login') return <>{children}</>;
  return <main className="admin-shell"><aside className="admin-sidebar"><Link href="/" className="admin-brand"><Store size={20} /> LMP <span>STUDIO</span></Link><nav>{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon size={18} />{label}</Link>)}</nav><form action={signOutAdmin}><button className="admin-signout">Déconnexion</button></form></aside><section className="admin-content">{children}</section></main>;
}

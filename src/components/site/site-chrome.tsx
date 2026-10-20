'use client';

import { usePathname } from 'next/navigation';
import { Footer } from '@/components/site/footer';
import { TopNav } from '@/components/site/top-nav';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const isAdmin = usePathname().startsWith('/admin');
  if (isAdmin) return <>{children}</>;
  return <><TopNav />{children}<Footer /></>;
}

'use client';

import { usePathname } from 'next/navigation';
import { ChristmasClickEffects } from '@/components/motion/christmas-click-effects';
import { FestiveMotionLayer } from '@/components/motion/festive-motion-layer';
import { Footer } from '@/components/site/footer';
import { TopNav } from '@/components/site/top-nav';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const isAdmin = usePathname().startsWith('/admin');
  if (isAdmin) return <>{children}</>;
  return <><FestiveMotionLayer /><ChristmasClickEffects /><TopNav />{children}<Footer /></>;
}

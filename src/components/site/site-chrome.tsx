'use client';

import { usePathname } from 'next/navigation';

export function SiteChrome({ children, header, footer }: { children: React.ReactNode; header: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = ['/admin', '/preview-check'].some(path => pathname.startsWith(path));
  if (isAdmin) return <>{children}</>;
  return <>{header}{children}{footer}</>;
}

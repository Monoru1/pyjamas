'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function OrdersAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 20_000);
    return () => window.clearInterval(interval);
  }, [router]);

  return <p className="mt-2 text-sm text-foreground/55">Actualisation automatique toutes les 20 secondes.</p>;
}

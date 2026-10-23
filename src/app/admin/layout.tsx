import { headers } from 'next/headers';
import { AdminShell } from '@/components/admin/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Private pages must render per request so Next can nonce the framework scripts.
  await headers();
  return <AdminShell>{children}</AdminShell>;
}

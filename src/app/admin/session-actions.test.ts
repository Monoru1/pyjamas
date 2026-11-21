import { beforeEach, expect, it, vi } from 'vitest';
// Terrain 16 — voluntary sign-out and revocation of the other devices.
const mocks = vi.hoisted(() => ({ signOut: vi.fn(), admin: true, redirects: [] as string[] }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }), signOut: mocks.signOut },
  rpc: async () => ({ data: mocks.admin }),
}) }));
vi.mock('@/lib/supabase/admin', () => ({ createManagerClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { mocks.redirects.push(path); throw new Error(`redirect:${path}`); } }));
import { revokeAdminSessions, signOutAdmin } from './actions';

const form = (scope?: string) => { const f = new FormData(); if (scope) f.set('scope', scope); return f; };
beforeEach(() => { vi.clearAllMocks(); mocks.admin = true; mocks.redirects = []; mocks.signOut.mockResolvedValue({ error: null }); });

it('signs out only this computer', async () => {
  await expect(signOutAdmin()).rejects.toThrow('redirect:/admin/login');
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
it('revokes the other devices and keeps this session', async () => {
  await expect(revokeAdminSessions(form('others'))).rejects.toThrow('redirect:/admin/mfa?sessions=revoked');
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'others' });
});
it('revokes every session after a compromise', async () => {
  await expect(revokeAdminSessions(form('global'))).rejects.toThrow('redirect:/admin/login');
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'global' });
});
it('defaults an unknown scope to the other devices, never to nothing', async () => {
  await expect(revokeAdminSessions(form('everyone'))).rejects.toThrow('redirect:/admin/mfa?sessions=revoked');
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'others' });
});
it('refuses revocation without an administrative session', async () => {
  mocks.admin = false;
  await expect(revokeAdminSessions(form('global'))).rejects.toThrow('redirect:/admin/login');
  expect(mocks.signOut).not.toHaveBeenCalled();
});
it('reports a failed revocation instead of pretending it worked', async () => {
  mocks.signOut.mockResolvedValue({ error: { message: 'network' } });
  await expect(revokeAdminSessions(form('others'))).rejects.toThrow('a échoué');
});

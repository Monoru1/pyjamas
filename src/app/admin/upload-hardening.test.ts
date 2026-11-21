import { beforeEach, expect, it, vi } from 'vitest';
// SEC-002 regression: stored object name and Content-Type come from the image bytes only.
const mocks = vi.hoisted(() => ({ upload: vi.fn(), insert: vi.fn() }));
function query(data: unknown = null) {
  const q: Record<string, unknown> = { then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data, error: null, count: 0 }).then(resolve) };
  for (const m of ['eq', 'select', 'update', 'delete', 'single']) q[m] = vi.fn(() => q);
  q.insert = vi.fn((row: unknown) => { mocks.insert(row); return q; });
  return q;
}
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'staff' } } }) },
  rpc: async () => ({ data: true }), from: () => query(),
  storage: { from: () => ({ upload: mocks.upload, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://fixture.invalid/${path}` } }) }) },
}) }));
vi.mock('@/lib/supabase/admin', () => ({ createManagerClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: () => { throw new Error('authentication_required'); } }));
import { uploadProductImage } from './actions';

const product = '22222222-2222-4222-8222-222222222222';
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const form = (name: string, type: string, bytes: Uint8Array<ArrayBuffer>, productId = product) => {
  const f = new FormData(); f.set('product_id', productId); f.set('image', new File([bytes], name, { type })); return f;
};
beforeEach(() => { vi.clearAllMocks(); mocks.upload.mockResolvedValue({ error: null }); });

it('ignores a hostile file name and uses the detected format for name and Content-Type', async () => {
  await uploadProductImage(form('x.html/../../site-assets/index', 'image/png', jpeg));
  const [path, , options] = mocks.upload.mock.calls[0];
  expect(path).toMatch(new RegExp(`^${product}/[0-9a-f-]{36}\\.jpg$`));
  expect(options).toEqual({ contentType: 'image/jpeg', upsert: false });
});
it('keeps a genuine PNG as PNG', async () => {
  await uploadProductImage(form('photo.PNG', 'image/png', png));
  expect(mocks.upload.mock.calls[0][0]).toMatch(/\.png$/);
  expect(mocks.upload.mock.calls[0][2].contentType).toBe('image/png');
});
it('refuses a non-UUID product folder before any upload', async () => {
  await expect(uploadProductImage(form('a.jpg', 'image/jpeg', jpeg, '../site-assets'))).rejects.toThrow('Produit invalide');
  expect(mocks.upload).not.toHaveBeenCalled();
});
it('refuses bytes that are not a supported image', async () => {
  await uploadProductImage(form('a.jpg', 'image/jpeg', new Uint8Array(new TextEncoder().encode('<svg onload=alert(1)>'))));
  expect(mocks.upload).not.toHaveBeenCalled();
});

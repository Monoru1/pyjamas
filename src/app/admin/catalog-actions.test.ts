import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), user: true, refresh: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: mocks.user ? { id: 'staff' } : null } }) },
  rpc: mocks.rpc, from: mocks.from,
}) }));
vi.mock('@/lib/supabase/admin', () => ({ createManagerClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }));
vi.mock('next/navigation', () => ({ redirect: () => { throw new Error('authentication_required'); } }));
import { updateProduct, archiveProduct, deleteVariant, setPrimaryProductImage } from './actions';
function query(data: unknown = null, error: unknown = null) {
  const q = { then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve),
    eq: vi.fn(), select: vi.fn(), update: vi.fn(), delete: vi.fn(), insert: vi.fn(), single: vi.fn() };
  for (const method of ['eq', 'select', 'update', 'delete', 'insert', 'single'] as const) q[method].mockReturnValue(q);
  return q;
}
const form = () => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ id: 'product', product_id: 'product', image_id: 'cover', name_fr: 'Pyjama', base_price: '15000', collection_ids: 'collection' })) f.set(k, v);
  return f;
};
beforeEach(() => { vi.clearAllMocks(); mocks.user = true; mocks.rpc.mockResolvedValue({ data: true }); mocks.from.mockImplementation(() => query({ id: 'cover' })); });
it('rejects unauthenticated catalogue writes before querying any table', async () => {
  mocks.user = false;
  await expect(updateProduct(form())).rejects.toThrow('authentication_required');
  expect(mocks.from).not.toHaveBeenCalled();
});
it('does not remove collection associations after a failed product update', async () => {
  mocks.from.mockReturnValue(query(null, { message: 'database failure' }));
  await expect(updateProduct(form())).rejects.toThrow('fiche produit');
  expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['products']);
  expect(mocks.refresh).not.toHaveBeenCalled();
});
it('stops collection replacement if removing old associations fails', async () => {
  const links = query(null, { message: 'permission denied' });
  mocks.from.mockImplementation(table => table === 'products' ? query() : links);
  await expect(updateProduct(form())).rejects.toThrow('collections');
  expect(links.insert).not.toHaveBeenCalled();
});
it('reports partial success when collection insertion fails', async () => {
  mocks.from.mockReturnValueOnce(query()).mockReturnValueOnce(query()).mockReturnValueOnce(query(null, { message: 'failure' }));
  await expect(updateProduct(form())).rejects.toThrow('sélectionnées à nouveau');
  expect(mocks.refresh).toHaveBeenCalledWith('/catalogue/[slug]', 'page');
});
it('does not report an archive as successful when the database refuses it', async () => {
  mocks.from.mockReturnValue(query(null, { message: 'failure' }));
  await expect(archiveProduct(form())).rejects.toThrow('retiré');
  expect(mocks.refresh).not.toHaveBeenCalled();
});
it('invalidates product details, collections and basket after archiving a size', async () => {
  await deleteVariant(form());
  expect(mocks.refresh).toHaveBeenCalledWith('/catalogue/[slug]', 'page');
  expect(mocks.refresh).toHaveBeenCalledWith('/collections');
  expect(mocks.refresh).toHaveBeenCalledWith('/panier');
});
it('does not clear a cover if the chosen image belongs to another product', async () => {
  const missing = query(null, { message: 'not found' });
  mocks.from.mockReturnValue(missing);
  await expect(setPrimaryProductImage(form())).rejects.toThrow('Image introuvable');
  expect(missing.update).not.toHaveBeenCalled();
});
it('refreshes the visible gallery and reports a failed replacement after clearing a cover', async () => {
  mocks.from.mockReturnValueOnce(query({ id: 'cover' })).mockReturnValueOnce(query()).mockReturnValueOnce(query(null, { message: 'failure' }));
  await expect(setPrimaryProductImage(form())).rejects.toThrow('nouvelle sélection');
  expect(mocks.refresh).toHaveBeenCalledWith('/catalogue/[slug]', 'page');
});

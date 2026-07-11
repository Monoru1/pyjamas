'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function guardAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: isAdmin } = user ? await supabase.rpc('is_admin') : { data: false };
  if (!user || !isAdmin) redirect('/admin/login');
  return supabase;
}

export async function signOutAdmin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export async function updateOrderStatus(formData: FormData) {
  const supabase = await guardAdmin();
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  const allowed = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return;
  await supabase.from('orders').update({ status: status as never }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/admin/commandes');
}

export async function updateVariantStock(formData: FormData) {
  const supabase = await guardAdmin();
  const id = String(formData.get('id'));
  const stock = Math.max(0, Number(formData.get('stock')) || 0);
  await supabase.from('product_variants').update({ stock_quantity: stock }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/admin/produits');
}

export async function toggleProduct(formData: FormData) {
  const supabase = await guardAdmin();
  const id = String(formData.get('id'));
  const active = formData.get('active') === 'true';
  await supabase.from('products').update({ is_active: active }).eq('id', id);
  revalidatePath('/');
  revalidatePath('/catalogue');
  revalidatePath('/admin');
  revalidatePath('/admin/produits');
}

export async function updateProduct(formData: FormData) {
  const supabase = await guardAdmin();
  const id = String(formData.get('id'));
  const name = String(formData.get('name_fr') ?? '').trim();
  const price = Math.max(0, Number(formData.get('base_price')) || 0);
  if (!id || !name) return;

  await supabase.from('products').update({
    name_fr: name,
    description_fr: String(formData.get('description_fr') ?? '').trim() || null,
    base_price: price,
    compare_at_price: Number(formData.get('compare_at_price')) || null,
    is_active: formData.get('is_active') === 'on',
    is_featured: formData.get('is_featured') === 'on',
    is_new: formData.get('is_new') === 'on',
  }).eq('id', id);

  revalidatePath('/');
  revalidatePath('/catalogue');
  revalidatePath('/admin/produits');
}

export async function uploadProductImage(formData: FormData) {
  const supabase = await guardAdmin();
  const productId = String(formData.get('product_id'));
  const file = formData.get('image');
  if (!(file instanceof File) || !file.size || !file.type.startsWith('image/')) return;

  const extension = file.name.split('.').pop()?.toLowerCase() || 'webp';
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(path);
  const { count } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);
  await supabase.from('product_images').insert({
    product_id: productId,
    url: publicUrl.publicUrl,
    alt_fr: String(formData.get('alt_fr') ?? '').trim() || null,
    is_primary: (count ?? 0) === 0,
    sort_order: count ?? 0,
  });

  revalidatePath('/');
  revalidatePath('/catalogue');
  revalidatePath('/admin/produits');
}

export async function setPrimaryProductImage(formData: FormData) {
  const supabase = await guardAdmin();
  const productId = String(formData.get('product_id'));
  const imageId = String(formData.get('image_id'));
  await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId);
  await supabase.from('product_images').update({ is_primary: true }).eq('id', imageId).eq('product_id', productId);
  revalidatePath('/');
  revalidatePath('/catalogue');
  revalidatePath('/admin/produits');
}

export async function updateSiteSettings(formData: FormData) {
  const supabase = await guardAdmin();
  await supabase.from('settings').upsert([
    {
      key: 'site',
      value: {
        name: String(formData.get('site_name') ?? '').trim() || 'La Maison des Pyjamas',
        defaultCurrency: 'XOF',
        defaultLanguage: 'fr',
      },
      description: 'Identité générale de la boutique',
    },
    {
      key: 'whatsapp',
      value: {
        phone: String(formData.get('whatsapp_phone') ?? '').trim(),
        defaultMessage: String(formData.get('whatsapp_message') ?? '').trim(),
      },
      description: 'Configuration des commandes WhatsApp',
    },
  ]);
  revalidatePath('/');
  revalidatePath('/panier');
  revalidatePath('/admin/site');
}

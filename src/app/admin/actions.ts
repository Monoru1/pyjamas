'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function validateImage(file: FormDataEntryValue | null): Promise<File | null> {
  if (!(file instanceof File) || !file.size || file.size > MAX_IMAGE_BYTES || !ALLOWED_IMAGE_TYPES.has(file.type)) return null;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return isPng || isJpeg || isWebp ? file : null;
}

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
  const price = Math.max(0, Number(formData.get('price')) || 0);
  await supabase.from('product_variants').update({ stock_quantity: stock, price }).eq('id', id);
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
    category_id: String(formData.get('category_id') ?? '') || null,
    is_active: formData.get('is_active') === 'on',
    is_featured: formData.get('is_featured') === 'on',
    is_new: formData.get('is_new') === 'on',
  }).eq('id', id);
  const collectionIds = formData.getAll('collection_ids').map(String);
  await supabase.from('product_collections').delete().eq('product_id', id);
  if (collectionIds.length) {
    await supabase.from('product_collections').insert(collectionIds.map(collection_id => ({ product_id: id, collection_id })));
  }

  revalidatePath('/');
  revalidatePath('/catalogue');
  revalidatePath('/admin/produits');
}

export async function createVariant(formData: FormData) {
  const supabase = await guardAdmin();
  const productId = String(formData.get('product_id') ?? '');
  const size = String(formData.get('size_label') ?? '').trim();
  const price = Math.max(0, Number(formData.get('price')) || 0);
  const stock = Math.max(0, Number(formData.get('stock')) || 0);
  if (!productId || !size || !price) return;

  const { error } = await supabase.from('product_variants').insert({
    product_id: productId,
    sku: `LMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    color_name_fr: String(formData.get('color_name_fr') ?? '').trim() || 'Standard',
    size_label: size,
    price,
    stock_quantity: stock,
    low_stock_threshold: 2,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/'); revalidatePath('/catalogue'); revalidatePath('/admin/produits');
}

export async function deleteVariant(formData: FormData) {
  const supabase = await guardAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await supabase.from('product_variants').delete().eq('id', id);
  revalidatePath('/'); revalidatePath('/catalogue'); revalidatePath('/admin/produits');
}

export async function uploadProductImage(formData: FormData) {
  const supabase = await guardAdmin();
  const productId = String(formData.get('product_id'));
  const file = await validateImage(formData.get('image'));
  if (!file) return;

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
  async function uploadHomeImage(field: string, current: string) {
    const file = await validateImage(formData.get(field));
    if (!file) return current;
    const extension = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `homepage/${field}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    return supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
  }
  const heroImage = await uploadHomeImage('hero_image', String(formData.get('hero_image_url') ?? ''));
  const loungeImage = await uploadHomeImage('lounge_image', String(formData.get('lounge_image_url') ?? ''));
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
    {
      key: 'social',
      value: {
        instagram: String(formData.get('instagram_url') ?? '').trim(),
        tiktok: String(formData.get('tiktok_url') ?? '').trim(),
      },
      description: 'Réseaux sociaux de la boutique',
    },
    {
      key: 'homepage',
      value: { heroImage, loungeImage },
      description: 'Visuels de la page d’accueil',
    },
  ]);
  revalidatePath('/');
  revalidatePath('/panier');
  revalidatePath('/admin/site');
}

function toSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function createProduct(formData: FormData) {
  const supabase = await guardAdmin();
  const name = String(formData.get('name_fr') ?? '').trim();
  const selectedSizes = formData.getAll('sizes').map(String);
  const price = Math.max(0, Number(formData.get('base_price')) || 0);
  if (!name) return;
  const slug = `${toSlug(name) || 'nouveau-produit'}-${crypto.randomUUID().slice(0, 6)}`;
  const sizes = selectedSizes.length ? selectedSizes : ['Unique'];
  const variantPrices = sizes.map(size => Math.max(0, Number(formData.get(`price_${size}`)) || price));
  const { data: product, error } = await supabase.from('products').insert({
    slug, name_fr: name, description_fr: String(formData.get('description_fr') ?? '').trim() || null,
    base_price: Math.min(...variantPrices), category_id: String(formData.get('category_id') ?? '') || null,
    currency_code: 'XOF', is_active: false, sort_order: 999,
  }).select('id').single();
  if (error || !product) throw new Error(error?.message || 'Produit impossible à créer');
  const variants = sizes.map((size, index) => ({
    product_id: product.id, sku: `LMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    color_name_fr: 'Standard', size_label: size, price: variantPrices[index], stock_quantity: 0, low_stock_threshold: 2,
  }));
  await supabase.from('product_variants').insert(variants);
  const collectionIds = formData.getAll('collection_ids').map(String);
  if (collectionIds.length) await supabase.from('product_collections').insert(collectionIds.map(collection_id => ({ product_id: product.id, collection_id })));
  revalidatePath('/admin/produits');
}

export async function archiveProduct(formData: FormData) {
  const supabase = await guardAdmin();
  const id = String(formData.get('id'));
  await supabase.from('products').update({ is_active: false, deleted_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/');
  revalidatePath('/catalogue');
  revalidatePath('/admin/produits');
}

export async function setPromotion(formData: FormData) {
  const supabase = await guardAdmin();
  const variantId = String(formData.get('variant_id'));
  const promotionPrice = Math.max(0, Number(formData.get('promotion_price')) || 0);
  const { data: variant } = await supabase.from('product_variants').select('product_id, price, compare_at_price').eq('id', variantId).single();
  if (!variant || !promotionPrice || promotionPrice >= Number(variant.price)) return;
  const { data: promotion } = await supabase.from('collections').select('id').eq('slug', 'promotions').single();
  if (!promotion) return;
  await supabase.from('product_variants').update({ price: promotionPrice, compare_at_price: variant.compare_at_price ?? variant.price }).eq('id', variantId);
  await supabase.from('product_collections').upsert({ product_id: variant.product_id, collection_id: promotion.id });
  revalidatePath('/'); revalidatePath('/catalogue'); revalidatePath('/admin/promotions');
}

export async function removePromotion(formData: FormData) {
  const supabase = await guardAdmin();
  const variantId = String(formData.get('variant_id'));
  const { data: variant } = await supabase.from('product_variants').select('product_id, compare_at_price').eq('id', variantId).single();
  const { data: promotion } = await supabase.from('collections').select('id').eq('slug', 'promotions').single();
  if (variant?.compare_at_price) await supabase.from('product_variants').update({ price: variant.compare_at_price, compare_at_price: null }).eq('id', variantId);
  if (promotion && variant) {
    const { count } = await supabase.from('product_variants').select('id', { count: 'exact', head: true }).eq('product_id', variant.product_id).not('compare_at_price', 'is', null);
    if (!count) await supabase.from('product_collections').delete().eq('product_id', variant.product_id).eq('collection_id', promotion.id);
  }
  revalidatePath('/'); revalidatePath('/catalogue'); revalidatePath('/admin/promotions');
}

export async function updateCollection(formData: FormData) {
  const supabase = await guardAdmin();
  const id = String(formData.get('id'));
  const name = String(formData.get('name_fr') ?? '').trim();
  if (!id || !name) return;
  let imageUrl = String(formData.get('image_url') ?? '');
  const file = await validateImage(formData.get('image'));
  if (file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `collections/${id}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    imageUrl = supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
  }
  await supabase.from('collections').update({ name_fr: name, description_fr: String(formData.get('description_fr') ?? '').trim() || null, image_url: imageUrl || null, is_active: formData.get('is_active') === 'on' }).eq('id', id);
  const selectedProducts = formData.getAll('product_ids').map(String);
  await supabase.from('product_collections').delete().eq('collection_id', id);
  if (selectedProducts.length) await supabase.from('product_collections').insert(selectedProducts.map(product_id => ({ product_id, collection_id: id })));
  revalidatePath('/collections'); revalidatePath('/catalogue'); revalidatePath('/admin/collections');
}

export async function createCollection(formData: FormData) {
  const supabase = await guardAdmin();
  const name = String(formData.get('name_fr') ?? '').trim();
  if (!name) return;
  const slug = `${toSlug(name) || 'collection'}-${crypto.randomUUID().slice(0, 6)}`;
  await supabase.from('collections').insert({ slug, name_fr: name, description_fr: String(formData.get('description_fr') ?? '').trim() || null, is_active: false, sort_order: 999 });
  revalidatePath('/collections'); revalidatePath('/admin/collections');
}

export async function deleteCollection(formData: FormData) {
  const supabase = await guardAdmin();
  const id = String(formData.get('id'));
  const slug = String(formData.get('slug'));
  if (!id || slug === 'promotions') return;
  await supabase.from('product_collections').delete().eq('collection_id', id);
  await supabase.from('collections').delete().eq('id', id);
  revalidatePath('/collections'); revalidatePath('/catalogue'); revalidatePath('/admin/collections');
}

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

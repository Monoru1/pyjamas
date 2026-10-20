'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function setMediaStatus(id: string, active: boolean) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return { error: 'Média invalide.' };
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: 'Session expirée. Reconnectez-vous.' };
  const { data: isAdmin, error: roleError } = await supabase.rpc('is_admin');
  if (roleError || !isAdmin) return { error: 'Accès non autorisé.' };

  const { error } = await supabase
    .from('media_assets')
    .update({ is_active: active })
    .eq('id', id);
  if (error) return { error: 'Impossible de mettre à jour le média.' };

  revalidatePath('/admin/medias');
  revalidatePath('/');
  return { error: null };
}

export async function updateMediaMetadata(_state: { error: string | null; message: string }, form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await supabase.rpc('is_admin')).data) return { error: 'Session autorisée requise.', message: '' };
  const id = String(form.get('id') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const alt = String(form.get('alt_fr') ?? '').trim();
  if (!/^[a-f0-9-]{36}$/i.test(id) || !title || title.length > 120 || alt.length > 200) return { error: 'Renseignez un titre (120 caractères maximum) et une description de 200 caractères maximum.', message: '' };
  const { error } = await supabase.from('media_assets').update({ title, alt_fr: alt || null }).eq('id', id);
  if (error) return { error: 'Le média n’a pas pu être modifié.', message: '' };
  revalidatePath('/admin/medias');
  revalidatePath('/admin/site');
  return { error: null, message: 'Informations du média enregistrées.' };
}

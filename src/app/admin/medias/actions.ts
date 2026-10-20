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

'use server';

import { revalidatePath } from 'next/cache';
import { createManagerClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function authorizedAdmin() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;
  const { data: allowed, error: roleError } = await supabase.rpc('is_admin');
  if (roleError || !allowed) return null;
  return supabase;
}

function optionalText(formData: FormData, key: string, max: number) {
  const value = String(formData.get(key) ?? '').trim();
  return value ? value.slice(0, max) : null;
}
function optionalInteger(formData: FormData, key: string, max: number) {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > max) throw Error('Valeur numérique incorrecte.');
  return value;
}

export async function updateChristmasEventConfig(formData: FormData) {
  const supabase = await createManagerClient();
  if (!supabase) throw new Error('Session administrateur requise.');
  const day = optionalText(formData, 'event_day', 10);
  const time = optionalText(formData, 'event_time', 5);
  if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error('Date invalide.');
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error('Heure invalide.');

  const venue = optionalText(formData, 'venue_name', 180);
  const address = optionalText(formData, 'venue_address', 280);
  const price = optionalInteger(formData, 'ticket_price_xof', 10000000);
  const capacity = optionalInteger(formData, 'capacity', 100000);
  if (capacity === 0) throw Error('La capacité doit être positive si elle est définie.');

  const { error } = await supabase.from('christmas_event_config').update({
    event_day: day,
    event_time: time,
    venue_name: venue,
    venue_address: address,
    ticket_price_xof: price,
    capacity,
    information_note: optionalText(formData, 'information_note', 1000),
    requests_open: formData.get('requests_open') === 'on' && process.env.EVENT_REQUESTS_ENABLED === 'true',
    updated_at: new Date().toISOString(),
  }).eq('event_key','noel-2026');
  if (error) throw new Error('La configuration de la fête n’a pas pu être enregistrée.');
  revalidatePath('/fete-de-noel');
  revalidatePath('/admin/fete');
}

export async function updateChristmasRequestStatus(formData: FormData) {
  const supabase = await authorizedAdmin();
  if (!supabase) throw new Error('Session administrateur requise.');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
     || !['requested','contacted','confirmed','cancelled'].includes(status)) {
    throw new Error('Demande invalide.');
  }
  const { error } = await supabase.from('christmas_event_requests')
    .update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if (error) throw new Error('Le statut n’a pas pu être mis à jour.');
  revalidatePath('/admin/fete');
}

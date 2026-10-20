'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { createHmac } from 'node:crypto';

export type EventRequestResult = { ok: boolean; message: string };

import { validateChristmasRequest } from './validation';

export async function requestChristmasPlaces(
  _previous: EventRequestResult,
  formData: FormData,
): Promise<EventRequestResult> {
  // An invisible, ordinary honeypot keeps basic automated form filling out.
  if (String(formData.get('website') ?? '').trim()) {
    return { ok: true, message: 'Votre demande a été prise en compte si les informations sont valides.' };
  }

  const validated = validateChristmasRequest({
    name: String(formData.get('full_name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    places: Number(formData.get('places')),
    consent: formData.get('consent') === 'on',
  });
  if ('error' in validated) return { ok: false, message: validated.error ?? 'Informations invalides.' };
  const data = validated.value;
  if (!data) return { ok: false, message: 'Informations invalides.' };

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const salt = process.env.EVENT_REQUEST_RATE_SECRET;
    if (process.env.EVENT_REQUESTS_ENABLED !== 'true' || !url || !key || !salt) return { ok: false, message: 'Les demandes sont actuellement fermées. Contactez la boutique pour plus d’informations.' };
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const requestHeaders = await headers();
    // Netlify sets this connection header. With no platform IP, share a restrictive unknown bucket.
    const ip = requestHeaders.get('x-nf-client-connection-ip') || 'unknown';
    const fingerprint = createHmac('sha256', salt).update(ip).digest('hex');
    const { error } = await supabase.rpc('submit_christmas_request', {
      p_name: data.name, p_phone: data.phone, p_email: data.email || '', p_places: data.places, p_fingerprint: fingerprint,
    });
    if (error) {
      // Unique contacts cannot place unlimited duplicate requests.
      if (error.code === '23505') return { ok: true, message: 'Votre demande a été prise en compte. Contactez la boutique pour toute modification.' };
      console.error('Event request insert failed', error.code);
      return { ok: false, message: 'L’enregistrement est momentanément impossible. Réessayez plus tard.' };
    }

    return {
      ok: true,
      message: 'Demande reçue ! L’équipe vous contactera lorsque les modalités de la fête seront confirmées. Aucune place n’est encore garantie et aucun paiement n’a été demandé.',
    };
  } catch {
    return { ok: false, message: 'Le service est momentanément indisponible. Merci de réessayer plus tard.' };
  }
}

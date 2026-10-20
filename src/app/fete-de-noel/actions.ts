'use server';

import { createClient } from '@/lib/supabase/server';

export type EventRequestResult = { ok: boolean; message: string };

export function validateChristmasRequest(input: {
  name: string; phone: string; email: string; places: number; consent: boolean;
}) {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const phone = input.phone.trim().replace(/[\s().-]/g, '');
  const email = input.email.trim().toLowerCase();
  const places = input.places;
  if (name.length < 2 || name.length > 120) return { error: 'Indiquez votre nom (2 à 120 caractères).' };
  if (!/^\+?[0-9]{7,20}$/.test(phone)) return { error: 'Indiquez un numéro de téléphone valide avec indicatif.' };
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { error: 'L’adresse e-mail est invalide.' };
  if (!Number.isInteger(places) || places < 1 || places > 8) return { error: 'Choisissez entre 1 et 8 places.' };
  if (!input.consent) return { error: 'Vous devez accepter d’être recontacté pour cette demande.' };
  return { value: { name, phone, email, places } };
}

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
    const supabase = await createClient();
    const { data: config, error: configError } = await supabase.from('christmas_event_config')
      .select('requests_open').eq('event_key','noel-2026').maybeSingle();
    if (configError || !config?.requests_open) return { ok: false, message: 'Les demandes sont actuellement fermées. Contactez la boutique pour plus d’informations.' };

    const { error } = await supabase.from('christmas_event_requests').insert({
      event_key: 'noel-2026',
      full_name: data.name,
      phone: data.phone,
      email: data.email || null,
      requested_places: data.places,
      consent_at: new Date().toISOString(),
      status: 'requested',
    });
    if (error) {
      // Unique contacts cannot place unlimited duplicate requests.
      if (error.code === '23505') return { ok: false, message: 'Une demande existe déjà pour ce numéro. Contactez-nous pour la modifier.' };
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

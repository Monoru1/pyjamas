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


// Order-scoped WhatsApp link: only the order reference is shared, never personal data.
// The customer still confirms the message in WhatsApp; nothing is sent automatically.
export function orderWhatsAppUrl(phone: string | null | undefined, orderNumber: string | null | undefined) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  const reference = String(orderNumber ?? '').trim();
  if (!/^[1-9]\d{7,14}$/.test(digits) || !/^MDP-[0-9A-Z-]{4,40}$/.test(reference)) return null;
  const text = `Bonjour La Maison des Pyjamas, ma commande ${reference} est payée. Je souhaite organiser la livraison ou le retrait de ma commande.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

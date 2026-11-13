import { safeMediaUrl } from '@/lib/security/urls';

const events = {
  new: ['Commande en attente de paiement', 'La commande est enregistrée. Son paiement reste à confirmer.'],
  paid: ['Paiement confirmé', 'Le paiement a été vérifié. La commande peut être préparée.'],
  failed: ['Paiement refusé', 'Le paiement a été refusé. La commande reste en attente de règlement.'],
  ready: ['Commande prête', 'La commande est prête.'],
  delivered: ['Commande livrée', 'La commande a été marquée comme livrée.'],
} as const;

export const emailKinds = [
  'staff_email_new', 'admin_email', 'staff_email_failed', 'staff_email_ready', 'staff_email_delivered',
  'customer_email', 'customer_email_failed', 'customer_email_ready', 'customer_email_delivered',
] as const;
export type EmailKind = typeof emailKinds[number];

export function isEmailKind(kind: unknown): kind is EmailKind {
  return emailKinds.some(value => value === kind);
}

export function emailEvent(kind: EmailKind) {
  return kind === 'admin_email' || kind === 'customer_email' ? 'paid'
    : kind.split('_').at(-1) as keyof typeof events;
}

export function emailLabel(kind: EmailKind) {
  return `${kind.startsWith('customer_') ? 'Acheteur' : 'Équipe'} · ${events[emailEvent(kind)][0]}`;
}

type Line = { name: string; size?: string | null; quantity: number; total: number; photo?: string | null };
type EmailOrder = { reference: string; total: number; subtotal?: number; shipping?: number; lines: Line[]; demo?: boolean };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!
));
const xof = (value: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)} FCFA`;

export function renderOrderEmail(kind: EmailKind, order: EmailOrder, origin: string, contactEmail?: string, trackingUrl?: string) {
  const customer = kind.startsWith('customer_');
  const event = emailEvent(kind);
  const [title, summary] = events[event];
  const description = customer && event === 'paid'
    ? 'Merci pour votre commande. Votre paiement a été vérifié. Nous vous informerons lorsque vos articles seront prêts.'
    : summary;
  const action = customer && trackingUrl ? 'Suivre ma commande' : customer ? 'Contacter la boutique' : 'Voir les commandes';
  const actionUrl = customer ? trackingUrl || `${origin}/contact` : `${origin}/admin/commandes`;
  const prefix = order.demo ? '[DÉMONSTRATION] ' : '';
  const subject = `${prefix}${title} · ${order.reference}`.replace(/[\r\n]+/g, ' ');
  const rows = order.lines.map(line => {
    const safePhoto = safeMediaUrl(line.photo);
    const photo = safePhoto ? new URL(safePhoto, origin).href : '';
    return `<tr><td style="padding:14px 0;border-bottom:1px solid #f0ddd5"><table role="presentation" cellspacing="0" cellpadding="0"><tr>${photo ? `<td style="padding-right:12px"><img src="${escapeHtml(photo)}" alt="" width="56" height="56" style="display:block;border-radius:6px;object-fit:cover"></td>` : ''}<td><strong>${escapeHtml(line.name)}</strong><br><span style="font-size:13px;color:#65474e">${line.size ? `Taille ${escapeHtml(line.size)} · ` : ''}Qté ${line.quantity}</span></td></tr></table></td><td align="right" style="padding:14px 0 14px 8px;border-bottom:1px solid #f0ddd5;font-size:14px">${xof(line.total)}</td></tr>`;
  }).join('');
  const detail = [
    ...(order.subtotal === undefined ? [] : [['Sous-total', xof(order.subtotal)]]),
    ...(order.shipping === undefined ? [] : [['Livraison', xof(order.shipping)]]),
    ['Total commande', xof(order.total)],
  ];
  const text = ['La Maison des Pyjamas', `${prefix}${title}`, description, `Commande ${order.reference}`,
    ...order.lines.map(line => `${line.quantity} × ${line.name}${line.size ? ` (${line.size})` : ''} · ${xof(line.total)}`),
    ...detail.map(([label, amount]) => `${label} · ${amount}`), `${action} · ${actionUrl}`, contactEmail,
  ].filter(Boolean).join('\n');
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#fff6ec;color:#1f1215;font:15px/1.5 Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#fff6ec"><tr><td align="center" style="padding:20px 10px">
<!--[if mso]><table role="presentation" width="580"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width:580px;border:1px solid #f7dfd1">
<tr><td align="center" bgcolor="#8f1428" style="padding:12px;color:#fffaf3"><img src="${origin}/brand/logo-email.png" width="136" height="76" alt="La Maison des Pyjamas" style="display:block;color:#fffaf3;font-family:Georgia,serif"></td></tr>
<tr><td style="padding:24px">${order.demo ? '<p style="margin:0 0 14px;background:#fff6ec;padding:10px;color:#8f1428"><strong>DÉMONSTRATION · Données fictives</strong></p>' : ''}
<p style="margin:0;color:#8f1428;font-size:13px;letter-spacing:1px">COMMANDE ${escapeHtml(order.reference)}</p>
<h1 style="margin:8px 0 12px;font:normal 29px/1.15 Georgia,serif">${title}</h1><p style="margin:0 0 22px">${description}</p>
${rows ? `<table width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid #c99a2e"><thead><tr><th scope="col" align="left" style="padding-top:12px">Articles</th><th scope="col" align="right" style="padding-top:12px">Montant</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#fffaf3" style="margin-top:16px">${detail.map(([label, amount]) => `<tr><td style="padding:8px 12px">${label}</td><td align="right" style="padding:8px 12px"><strong>${amount}</strong></td></tr>`).join('')}</table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:22px"><tr><td bgcolor="#8f1428" style="border-radius:6px;mso-padding-alt:12px 18px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 18px">${action}</a></td></tr></table>
</td></tr><tr><td bgcolor="#fffaf3" style="padding:18px 24px;font-size:13px;color:#65474e">La Maison des Pyjamas<br><a href="${origin}/contact" style="color:#8f1428">Contact boutique</a>${contactEmail ? ` · <a href="mailto:${escapeHtml(contactEmail)}" style="color:#8f1428">${escapeHtml(contactEmail)}</a>` : ''}</td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
  return { subject, html, text };
}

export const demoEmailOrder: EmailOrder = {
  reference: 'MDP-DEMO-NOTIFICATIONS', total: 25000, subtotal: 25000, shipping: 0, demo: true,
  lines: [{ name: 'Pyjama Noël · Carreaux rouges', size: 'M', quantity: 1, total: 25000, photo: '/christmas-2026/web/family-red-tartan-320.webp' }],
};

'use client';

import { useCheckoutCustomerStore } from '@/features/checkout/customer-form.store';

export function CustomerForm() {
  const name = useCheckoutCustomerStore((state) => state.name);
  const phone = useCheckoutCustomerStore((state) => state.phone);
  const comment = useCheckoutCustomerStore((state) => state.comment);
  const setName = useCheckoutCustomerStore((state) => state.setName);
  const setPhone = useCheckoutCustomerStore((state) => state.setPhone);
  const setComment = useCheckoutCustomerStore((state) => state.setComment);

  return (
    <div className="space-y-4 rounded-[2rem] border border-brand-primary/10 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-primary/65">Informations</p>
        <p className="mt-2 text-sm text-foreground/60">Ces infos servent à enregistrer puis confirmer la demande sur WhatsApp.</p>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        Nom
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Votre nom"
          className="rounded-2xl border border-brand-primary/10 px-4 py-3 font-normal outline-none focus:border-brand-primary"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Telephone
        <input
          required
          inputMode="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Votre numero"
          className="rounded-2xl border border-brand-primary/10 px-4 py-3 font-normal outline-none focus:border-brand-primary"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Commentaire
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Adresse, precision de taille, livraison..."
          rows={4}
          className="resize-none rounded-2xl border border-brand-primary/10 px-4 py-3 font-normal outline-none focus:border-brand-primary"
        />
      </label>
    </div>
  );
}

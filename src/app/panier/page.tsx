import { CartLines } from '@/features/cart/components/cart-lines';
import { CartSummary } from '@/features/cart/components/cart-summary';
import { WhatsAppCheckoutButton } from '@/features/cart/components/whatsapp-checkout-button';
import { CustomerForm } from '@/features/checkout/components/customer-form';
import { getStoreSettings } from '@/lib/repositories/settings.repository';

export default async function CartPage() {
  const settings = await getStoreSettings();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-10 text-foreground md:px-8">
      <div className="pointer-events-none absolute -right-32 top-12 h-96 w-96 rounded-full bg-brand-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-28 bottom-10 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_390px]">
        <section className="space-y-8">
          <div className="rounded-[3rem] bg-brand-evergreen p-8 text-white shadow-[0_30px_90px_rgba(15,59,46,0.22)] md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-accent">Panier cadeau</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] md:text-7xl">
              Derniere etape avant le sapin.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/72">
              Verifiez vos pieces, ajoutez vos informations et envoyez une commande claire sur WhatsApp.
            </p>
          </div>
          <CartLines />
        </section>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <CustomerForm />
          <CartSummary />
          <WhatsAppCheckoutButton phoneNumber={settings.whatsappPhone} />
        </aside>
      </div>
    </main>
  );
}

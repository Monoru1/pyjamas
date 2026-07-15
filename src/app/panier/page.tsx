import { CartLines } from '@/features/cart/components/cart-lines';
import { CartSummary } from '@/features/cart/components/cart-summary';
import { WhatsAppCheckoutButton } from '@/features/cart/components/whatsapp-checkout-button';
import { CustomerForm } from '@/features/checkout/components/customer-form';
import { getStoreSettings } from '@/lib/repositories/settings.repository';

export default async function CartPage() {
  const settings = await getStoreSettings();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-6 text-foreground sm:px-5 sm:py-8 md:px-8 md:py-10">
      <div className="pointer-events-none absolute -right-32 top-12 h-96 w-96 rounded-full bg-brand-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-28 bottom-10 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_390px]">
        <section className="space-y-8">
          <div className="rounded-[2rem] bg-brand-evergreen p-6 text-white shadow-[0_30px_90px_rgba(15,59,46,0.22)] sm:p-8 md:rounded-[3rem] md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-accent">Panier cadeau</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[0.94] tracking-[-0.055em] sm:text-5xl md:text-7xl">
              Derniere etape avant le sapin.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/72">
              Vérifiez vos pièces, envoyez votre demande, puis la boutique confirme sa prise en charge sur WhatsApp.
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

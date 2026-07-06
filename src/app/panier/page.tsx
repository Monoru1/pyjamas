import { CartLines } from '@/features/cart/components/cart-lines';
import { CartSummary } from '@/features/cart/components/cart-summary';

export default function CartPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">Panier</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Votre commande</h1>
          </div>
          <CartLines />
        </section>
        <aside>
          <CartSummary />
        </aside>
      </div>
    </main>
  );
}

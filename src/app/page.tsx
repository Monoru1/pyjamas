import { EmptyProducts } from '@/components/marketing/empty-products';
import { HeroSection } from '@/components/marketing/hero-section';
import { SectionHeading } from '@/components/marketing/section-heading';
import { ChristmasSignature } from '@/components/marketing/christmas-signature';
import { ProductCard } from '@/features/catalog/components/product-card';
import { listFeaturedProducts } from '@/lib/repositories/catalog.repository';
import { getStoreSettings } from '@/lib/repositories/settings.repository';

export default async function HomePage() {
  const [settings, featuredProducts] = await Promise.all([
    getStoreSettings(),
    listFeaturedProducts(6),
  ]);

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-16">
        <HeroSection siteName={settings.siteName} />
        <ChristmasSignature />

        <section id="collections" className="grid gap-4 md:grid-cols-3">
          {[
            ['Famille', 'Des ensembles coordonnes pour les photos, soirees et matins doux.'],
            ['Femme', 'Des coupes confortables avec une finition elegante.'],
            ['Homme', 'Des pyjamas simples, propres et faciles a offrir.'],
          ].map(([title, description]) => (
            <article key={title} className="rounded-[2rem] border border-brand-primary/10 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-primary/70">
                Collection
              </p>
              <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-foreground/60">{description}</p>
            </article>
          ))}
        </section>

        <section id="vedettes" className="space-y-8">
          <SectionHeading
            eyebrow="Selection"
            title="Les modeles a mettre en avant"
            description="Cette section est deja branchee sur Supabase. Le back-office controlera les produits, les photos, les prix et le stock."
          />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.length > 0 ? (
              featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)
            ) : (
              <EmptyProducts />
            )}
          </div>
        </section>

        <section id="commande" className="rounded-[2.5rem] bg-brand-primary px-6 py-10 text-white md:px-10">
          <div className="grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Commande</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Le parcours sera simple : choisir, ajouter, envoyer sur WhatsApp.
              </h2>
            </div>
            <div className="rounded-[2rem] bg-white/10 p-6 text-sm leading-7 text-white/80">
              <p>1. Le client choisit taille, couleur et quantite.</p>
              <p>2. Le panier calcule le total et prepare le message.</p>
              <p>3. WhatsApp recoit la commande avec references, stock et prix.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

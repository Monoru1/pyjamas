import Image from 'next/image';
import { CampaignFilm } from '@/components/marketing/campaign-film';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, CalendarHeart, Gift, Heart, Sparkles } from 'lucide-react';
import { EmptyProducts } from '@/components/marketing/empty-products';
import { ProductCard } from '@/features/catalog/components/product-card';
import type { CatalogProduct } from '@/features/catalog/types';
import type { StoreSettings } from '@/lib/repositories/settings.repository';

interface LuxeHomeProps {
  settings: StoreSettings;
  products: CatalogProduct[];
}

const photo = '/christmas-2026';

export function LuxeHome({ settings, products }: LuxeHomeProps) {
  const leadPhoto = settings.heroImage.includes('images.unsplash.com') ? `${photo}/family-celebration.jpg` : settings.heroImage;
  const boutiquePhoto = settings.loungeImage.includes('images.unsplash.com') ? `${photo}/christmas-boutique.jpg` : settings.loungeImage;
  return (
    <main className="christmas-home" id="haut">
      <div className="christmas-announcement">
        <Sparkles size={14} aria-hidden="true" />
        <span>ÉDITION NOËL 2026 — LA MAGIE SE PORTE ENSEMBLE</span>
        <Sparkles size={14} aria-hidden="true" />
      </div>

      <section className="christmas-hero" aria-labelledby="christmas-main-title">
        <div className="christmas-hero-copy">
          <div className="christmas-kicker">{settings.siteName} · 2026</div>
          <h1 id="christmas-main-title">
            Cette année,<br />
            <em>vivons Noël</em><br />
            ensemble.
          </h1>
          <p>Des pyjamas assortis, des instants précieux et une maison pleine de magie. La collection des retrouvailles est arrivée.</p>
          <div className="christmas-hero-actions">
            <Link href="/catalogue?collection=noel" className="christmas-btn christmas-btn-light">
              Découvrir Noël <ArrowUpRight size={18} />
            </Link>
            <a href="#notre-histoire" className="christmas-text-link">
              Entrer dans la magie <ArrowDownRight size={18} />
            </a>
          </div>
          <div className="christmas-hero-footnote">
            <span>Une collection à porter, des souvenirs à créer.</span>
          </div>
        </div>
        <div className="christmas-hero-gallery">
          <div className="christmas-photo christmas-photo-main">
            <Image src={leadPhoto} alt="Famille réunie en pyjamas de Noël assortis" fill priority sizes="(max-width: 800px) 75vw, 35vw" className="christmas-cover" />
          </div>
          <div className="christmas-photo christmas-photo-side">
            <Image src={settings.heroSideImage} alt="Petits et grands réunis en pyjamas de Noël" fill sizes="(max-width: 800px) 38vw, 21vw" className="christmas-cover" />
          </div>
          <div className="christmas-photo christmas-photo-lower">
            <Image src={settings.heroLowerImage} alt="Famille en pyjamas à carreaux rouges et blancs" fill sizes="(max-width: 800px) 38vw, 21vw" className="christmas-cover" />
          </div>
        </div>
      </section>

      <section className="christmas-value-strip" aria-label="L'esprit de la maison">
        <div><Heart size={21} aria-hidden="true" /><span>Des moments en famille</span></div>
        <div><Gift size={21} aria-hidden="true" /><span>Le plaisir d’offrir</span></div>
        <div><Sparkles size={21} aria-hidden="true" /><span>L’esprit de Noël</span></div>
      </section>

      <section id="vedettes" className="christmas-section christmas-products" aria-labelledby="christmas-products-title">
        <div className="christmas-section-heading">
          <div>
            <p className="christmas-eyebrow">01 / LA COLLECTION</p>
            <h2 id="christmas-products-title">À chacun son <em>petit bonheur.</em></h2>
            <p>Une sélection de pyjamas et de pièces douces à partager pendant les fêtes.</p>
          </div>
          <Link href="/catalogue?collection=noel" className="christmas-outline-link">
            Voir la collection <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="christmas-product-grid">
          {products.length > 0 ? products.map((product) => <ProductCard key={product.id} product={product} />) : <EmptyProducts />}
        </div>
      </section>

      <section className="christmas-story" id="notre-histoire" aria-labelledby="story-heading">
        <div className="christmas-story-editorial">
          <p className="christmas-eyebrow">02 / DERRIÈRE LA MAGIE</p>
          <h2 id="story-heading">Le meilleur de Noël, <em>c’est nous.</em></h2>
          <p>Les rires, les petits moments, les tenues assorties. C’est ce qu’on aime dans cette saison. Découvrez quelques instants de nos shootings et de notre maison.</p>
          <Link href="/collections" className="christmas-btn christmas-btn-red">
            Notre édition de Noël <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="christmas-film-card">
          <CampaignFilm src={settings.featuredVideoUrl} poster={`${photo}/family-together.jpg`} />
        </div>
      </section>

      <section className="xmas-home-event-teaser" aria-labelledby="home-event-title">
        <div className="xmas-home-event-info">
          <div className="xmas-event-eyebrow"><CalendarHeart size={19} aria-hidden="true" /> NOUVEAU · RENDEZ-VOUS DE DÉCEMBRE</div>
          <h2 id="home-event-title">Cette année, Noël <em>se fête ensemble.</em></h2>
          <p>La Maison des Pyjamas prépare une fête quelques jours avant Noël. Les modalités et l’ouverture des demandes de places seront annoncées prochainement.</p>
          <Link href="/fete-de-noel" className="christmas-btn christmas-btn-light">Découvrir la fête <ArrowUpRight size={19} /></Link>
          <small>Demande sans paiement · places non garanties avant confirmation.</small>
        </div>
        <div className="xmas-home-event-photo">
          <Image src={`${photo}/family-together.jpg`} alt="Famille en pyjamas de Noël assortis" fill sizes="(max-width: 850px) 100vw, 38vw" className="christmas-cover"/>
        </div>
      </section>

      <section className="christmas-editorial" aria-labelledby="christmas-shop-title">
        <div className="christmas-editorial-image">
          <Image src={boutiquePhoto} alt="La Maison des Pyjamas décorée pour les fêtes" fill sizes="(max-width: 800px) 100vw, 42vw" className="christmas-cover" />
        </div>
        <div className="christmas-editorial-copy">
          <p className="christmas-eyebrow">03 / BIENVENUE À LA MAISON</p>
          <h2 id="christmas-shop-title">Il était une fois <em>une maison de Noël.</em></h2>
          <p>Une ambiance chaleureuse, des pièces à offrir, et surtout des sourires à retrouver. Notre boutique vous ouvre les portes de son univers.</p>
          <Link href="/contact" className="christmas-outline-link">Nous contacter <ArrowUpRight size={18} /></Link>
        </div>
      </section>

      <section className="christmas-final-cta">
        <Sparkles size={24} aria-hidden="true" />
        <h2>Et si cette année, la magie commençait chez vous ?</h2>
        <Link href="/catalogue?collection=noel" className="christmas-btn christmas-btn-light">Je découvre la collection <ArrowUpRight size={18} /></Link>
      </section>
    </main>
  );
}

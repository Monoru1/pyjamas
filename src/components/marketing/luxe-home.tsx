import Image from 'next/image';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, CalendarHeart, Gift, Heart, Play, Sparkles } from 'lucide-react';
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
          <div className="christmas-kicker"><span className="christmas-star">✦</span> {settings.siteName} · 2026</div>
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
            <span className="christmas-sparkle">✧</span>
            <span>Une collection à porter, des souvenirs à créer.</span>
          </div>
        </div>
        <div className="christmas-hero-gallery">
          <div className="christmas-photo christmas-photo-main">
            <Image src={leadPhoto} alt="Famille réunie en pyjamas de Noël assortis" fill priority sizes="(max-width: 800px) 75vw, 35vw" className="christmas-cover" />
            <span className="christmas-photo-caption">Moments ensemble</span>
          </div>
          <div className="christmas-photo christmas-photo-side christmas-photo-video">
            <video
              src={settings.featuredVideoUrl}
              poster={`${photo}/family-together.jpg`}
              controls
              playsInline
              preload="none"
              className="christmas-hero-reel"
              aria-label="Découvrir notre film de Noël en famille"
            />
            <span className="christmas-video-badge" aria-hidden="true"><Play size={13} /> Voir le film</span>
          </div>
          <div className="christmas-photo christmas-photo-lower">
            <Image src={`${photo}/hero-family.jpg`} alt="Portrait de famille au pied du sapin" fill sizes="(max-width: 800px) 45vw, 19vw" className="christmas-cover" />
          </div>
          <span className="christmas-sticker" aria-hidden="true">NOËL<br />2026 ✳</span>
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
          <div className="christmas-story-mark" aria-hidden="true">✳</div>
          <h2 id="story-heading">Le meilleur de Noël, <em>c’est nous.</em></h2>
          <p>Les rires, les petits moments, les tenues assorties. C’est ce qu’on aime dans cette saison. Découvrez quelques instants de nos shootings et de notre maison.</p>
          <Link href="/collections" className="christmas-btn christmas-btn-red">
            Notre édition de Noël <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="christmas-film-card">
          <video
            className="christmas-film-video"
            controls
            playsInline
            preload="none"
            poster={`${photo}/family-together.jpg`}
            aria-label="Vidéo de notre collection Noël en famille"
          >
            <source src={settings.featuredVideoUrl} type="video/mp4" />
            Votre navigateur ne permet pas de lire cette vidéo.
          </video>
          <div className="christmas-film-label"><Play size={15} aria-hidden="true" /> Nos moments de Noël · Lancer la vidéo</div>
        </div>
      </section>

      <section className="xmas-home-event-teaser" aria-labelledby="home-event-title">
        <div className="xmas-home-event-info">
          <div className="xmas-event-eyebrow"><CalendarHeart size={19} aria-hidden="true" /> NOUVEAU · RENDEZ-VOUS DE DÉCEMBRE</div>
          <h2 id="home-event-title">Cette année, Noël <em>se fête ensemble.</em></h2>
          <p>La Maison des Pyjamas prépare une fête quelques jours avant Noël. Les informations seront confirmées prochainement : vous pouvez déjà demander à être contacté pour des places.</p>
          <Link href="/fete-de-noel" className="christmas-btn christmas-btn-light">Découvrir la fête <ArrowUpRight size={19} /></Link>
          <small>Demande sans paiement · places non garanties avant confirmation.</small>
        </div>
        <div className="xmas-home-event-photo">
          <Image src={`${photo}/family-together.jpg`} alt="Famille en pyjamas de Noël assortis" fill sizes="(max-width: 850px) 100vw, 38vw" className="christmas-cover"/>
          <span className="xmas-home-event-sparkle" aria-hidden="true">✳</span>
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

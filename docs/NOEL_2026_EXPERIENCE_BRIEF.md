# La Maison des Pyjamas — Expérience Noël 2026

Statut : **cadrage de refonte** (pas de code marchand ni de déploiement de production).  
Date de référence : 20 octobre 2026.  
Objectif : présentation client **1er novembre 2026** sur préproduction, avec livraison finale soumise à validation.

## Sources confirmées

- Projet : `Monoru1/pyjamas`, branche `main` conservée comme référence.
- Stack en place : Next.js 16, React 19, TypeScript, Tailwind CSS v4, Supabase, Zustand ; déploiement Netlify `pyjamas25`.
- Médias Drive : dossier `La maison des pyjamas`, contenant au moment de l'inventaire **27 photos et 53 vidéos** ; ces fichiers ne sont pas hébergés publiquement par le site.
- Échantillon visuellement vérifié : shootings Noël en famille, adulte/bébé, ensembles coordonnés, décoration et intérieur de la boutique. Plusieurs photos verticales imposent une mise en page composée plutôt qu'un recadrage aveugle. Clips examinés : séances photo / décors de boutique. **L'ensemble des 80 fichiers reste à qualifier individuellement.**
- Le code courant emploie encore des fallback Unsplash pour deux visuels de la page d'accueil. Le checkout actuel crée une demande dans Supabase puis ouvre WhatsApp. **Aucune intégration FedaPay vérifiée dans le code audité**.

## Ambition créative

**Positionnement : « La magie de Noël se porte ensemble ».** Créer une expérience éditoriale, émotionnelle et commerciale premium, ancrée dans les vrais shootings de la marque, sans effet « template générique ».

- Palette : vert sapin profond `#092F28` ; bordeaux `#8C2338` ; or mat `#D7B579` ; ivoire `#FFF8ED` ; brun encre `#26352F`.
- Typographie : serif expressive pour les promesses et titres ; sans-serif lisible pour commerce, prix, formulaires et navigation.
- Hero : composition **2 ou 3 photos verticales** de familles, hiérarchie texte lisible, CTA catalogue, pas d'image de stock.
- Narration : famille → collections → best-sellers réels → histoire et boutique → séquences vidéo courtes → panier/paiement.
- Mouvements : neige très discrète et option de désactivation ; lueur des ornements, transitions douces ; pas de popups bloquantes, pas de surcharge vidéo ni d'animation sur chaque clic. Respect de `prefers-reduced-motion`.
- Mobile-first ; les photos portrait deviennent avantage éditorial ; vidéo poster, lecture silencieuse, pause et optimisation.
- Conserver le logo officiel et les éléments reconnaissables de la marque.

## Pages / fonctionnalités à traiter

1. **Accueil** : vrai hero, album de saison, collections, mini-film, produit en vedette, preuves de confiance, accès achat.
2. **Catalogue, collections, accessoires** : filtres fonctionnels, photos, prix en XOF, fiches, tailles/couleurs/disponibilité réelles.
3. **Fiche produit** : galerie et vidéo facultative, variantes, stock vérifié côté serveur, informations d'entretien et taille.
4. **Panier / commande** : client, coordonnées, livraison/retrait selon options effectivement proposées, récapitulatif, paiement sécurisé.
5. **Après-vente** : état de commande, réponse WhatsApp, contact, confirmations ; politique de livraison/retours et mentions à valider.
6. **Back-office** : uploads images/vidéos, attribution médias/produits, ordre des visuels, collections, paiements, commandes, stocks.
7. **SEO / domaine** : domaine de la marque à vérifier et acheter par son propriétaire, DNS/TLS, URLs canoniques, OpenGraph, sitemap, indexation contrôlée sur staging.

## Pipeline de médias

- Inventorier les 27 photos et 53 vidéos : chemin/ID Drive, usage envisagé, date, type, orientation, dimensions, durée et doublons.
- Obtenir l'autorisation explicite pour la publication des images des personnes identifiables et des mineurs (notamment les shootings famille/enfants).
- Convertir les photographies en AVIF/WebP, fournir `srcset`/dimensions et images poster ; conserver les originaux dans Drive.
- Monter seulement quelques clips pertinents (par exemple 6–12 s), sans son par défaut, éviter de charger 53 vidéos sur la home.
- Publier les fichiers retenus dans une infrastructure prévue pour le site (Supabase Storage / stockage média ou CDN), **pas** en exposant des liens Drive temporaires.
- Associer chaque média à son produit/sa campagne ; ne pas déduire SKU, prix, tailles ou niveaux de stock à partir des photos.
- Références SKU **non visibles côté boutique**, mais conservées dans admin, commandes et messages WhatsApp.

## FedaPay — intégration cible

**Non implémentée à ce stade ; ne pas prétendre que le paiement est actif.**

1. Garder les secrets FedaPay dans les fonctions serveur / variables sécurisées, jamais dans le navigateur ni dans Git.
2. Recalculer prix, variantes, stock, promotions et montant total côté serveur depuis Supabase.
3. Créer la commande `pending_payment` (modèle à confirmer) avec montant `XOF`, identifiant unique et expiration/réservation de stock appropriée ; ne pas marquer `paid` au clic.
4. Créer la transaction FedaPay depuis le serveur, obtenir le lien de checkout hébergé, y rediriger l'acheteur.
5. Recevoir et valider le webhook (signature via secret, raw body, anti-rejeu / idempotence) ; **vérifier le statut réel, la devise, le montant et l'identité de la transaction auprès de FedaPay** avant de finaliser.
6. Traiter `approved`, `declined`, `canceled`, `refunded` et retours incomplets ; gérer le replay des webhooks, le double-clic et les sessions interrompues.
7. Rafraîchir les commandes et états de stock dans l'admin ; conserver WhatsApp pour aide et confirmation, pas comme unique méthode de commande payée.
8. Sandbox en premier, puis activation live **uniquement sur accord de la propriétaire** et après vérification du compte marchand/moyens réellement activés.
9. Après achat du domaine : ajouter le domaine aux URLs autorisées, callbacks et CORS de l'Edge Function existante, actuellement limité au domaine Netlify.

## Périmètre et règles de sécurité

- Ne pas modifier la production directement ; travailler dans cette branche, review + tests avant fusion.
- Ne pas remplacer la base de données existante ou improviser une migration sans inspection de la baseline actuelle.
- Ne jamais introduire de clés de paiement, credentials Supabase, identifiants privés, captures d'administration ou données client dans Git.
- Ne jamais publier les médias bruts dans le dépôt public sans validation des droits.
- Aucun prix, délai de livraison, remise ou disponibilité inventés.

## Sprint à date fixe

| Période | Objectif | Critère de sortie |
|---|---|---|
| 20–21 octobre | Audit médias + architecture, choix domaine, collecte accord de publication | Catalogue média qualifié, direction artistique choisie |
| 22–24 octobre | Home Noël + composants responsive + médias optimisés | Design validable mobile et desktop sur préproduction |
| 25–27 octobre | Checkout et FedaPay sandbox + schéma de paiement + webhooks | Scénarios succès / échec / annulation / replay testés |
| 28–29 octobre | Catalogue réel, stocks, livraison, back-office et conformité | Parcours bout-en-bout cohérent |
| 30 octobre | Régression, performances, accessibilité, SEO et sécurité | Aucun défaut bloquant |
| 31 octobre | Démonstration à blanc, correctifs, fiche de validation | Staging gelé et prêt |
| 1er novembre | Démo propriétaire et arbitrages | Validation documentée avant live |

## Définition de « prêt pour présenter »

- Mobile 360/390px, tablette 768px et desktop 1440px vérifiés ; aucun débordement horizontal.
- Aucune image de stock sur le hero ; assets optimisés et textes validés.
- Commandes de test conservées hors des vraies commandes client.
- Checkout sandbox complet ou explicitement démontré comme **simulation** si l'API / compte marchand n'est pas disponible.
- Aucun paiement réel déclenché depuis la préproduction.
- La propriétaire sait gérer une image, une variante, une commande et son statut.
- Domaine, conditions de livraison/retour, prix, stock, authentification marchand et droits images validés avant la production.

## Livrable visuel de référence

Un premier prototype HTML/CSS responsive a été créé localement le 20 octobre à partir de cinq photographies et d'un extrait vidéo. Il constitue un **exploratoire**, pas un site déployé ni une maquette contractuellement validée. Sa direction artistique peut inspirer l'implémentation Next.js, avec conservation des fonctions marchandes existantes.

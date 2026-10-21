# Prix provisoires du catalogue — 21 octobre 2026

Les montants ci-dessous ont été appliqués directement à `public.products.base_price` et `public.product_variants.price` dans Supabase `pukvrerdloudfiphomsj`, puis contrôlés (12 produits, minimum 10 000 XOF, maximum 45 000 XOF). Ils sont **provisoires** et doivent être approuvés avant encaissement public.

| Slug | Prix XOF |
| --- | ---: |
| noel-famille-velours-bordeaux | 42 000 |
| cocooning-femme-creme-or | 28 000 |
| homme-sapin-premium | 30 000 |
| couple-minuit-bordeaux | 45 000 |
| enfant-etoile-creme | 22 000 |
| edition-cadeau-rouge-or | 35 000 |
| chaussons-douceur-creme | 10 000 |
| masque-sommeil-satin-nuit | 10 000 |
| plaid-cocooning-vert-sapin | 14 500 |
| coffret-cadeau-premium | 10 000 |
| pochette-cadeau-bordeaux | 10 000 |
| bonnet-nuit-doux | 10 000 |

Aucun stock, statut de publication, image, commande ou paiement réel n'a été modifié. Les photos de fiches restent des URL Unsplash de démonstration et sont volontairement filtrées du catalogue public par `catalog.repository.ts`. La présence d'une photo dans l'administration ne prouve pas sa correspondance au produit. Les photos Drive doivent être associées aux SKU réels avant publication.

Le paiement FedaPay existant sur `main` est limité au sandbox staff. Configurer les secrets côté serveur, le webhook sandbox et réaliser les essais. Ne pas considérer la validation du compte marchand comme une activation automatique du checkout Live : celui-ci nécessite une implémentation distincte, une commande commerciale persistante, l'idempotence, la vérification serveur, la gestion du stock et des essais de bout en bout.

Référence audit complémentaire : PR #4.

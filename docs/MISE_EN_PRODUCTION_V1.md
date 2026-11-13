# Publication V1 et stock de la boutique

Production Supabase `pukvrerdloudfiphomsj`. Recette Supabase `oxhymanjibveayhcaqvj`. Le site est un canal de vente de la boutique physique. Une livraison reçue par le personnel augmente le stock disponible. La réservation du site réduit le disponible immédiatement. Le paiement vérifié engage la quantité jusqu’à sa remise.

## Migration

Le 13 novembre 2026, la production comptait 18 produits, 53 variantes et 9 commandes. Le contrôle a retrouvé les contraintes historiques attendues sur `payment_attempts`. Les prix indicatifs des produits étaient déjà alignés sur le prix minimal de leurs variantes actives. Onze lignes de commandes étaient candidates au remplissage de la nouvelle colonne de photo depuis le catalogue actuel. Ce remplissage ne peut pas restituer la photo originale lorsque celle-ci n’était pas conservée.

1. Confirmer le point de restauration de production et les moyens de restaurer PostgreSQL, les comptes et les fichiers Storage. Exercer la restauration dans un environnement isolé et protéger les données clients. La CI utilise une structure de production et des commandes synthétiques.
2. Comparer l’historique distant et le SQL de chaque migration. Le SQL de `add_noel_pajama_sizes` a été comparé à celui de la production et son fichier renommé en `20261023132029`. Cette migration est déjà appliquée en production. La migration de réconciliation est déjà enregistrée en recette sous `20261113150500`.
3. En production, appliquer dans l’ordre les dix migrations commerciales de `20261029093122_fedapay_commerce` à `20261113153806_physical_stock_receipts` après avoir vérifié leurs dépendances. Utiliser les versions du dépôt dans l’historique. Réserver `supabase/recette/bootstrap-production-schema.sql` aux bases jetables.
4. Pendant la fenêtre de migration, suspendre les écritures du personnel, capturer les références et montants historiques, les quantités par variante, les comptes et rôles, et l’inventaire des médias. Comparer ces relevés après application. Contrôler les droits staff et anon, les fonctions de réservation, les commandes existantes, les mouvements de stock, et les écrans mobile et ordinateur avec un compte staff autorisé.
5. Préparer la publication Netlify avec les quatre options sur `false` dans Production. Vérifier `NEXT_PUBLIC_SUPABASE_URL` et la provenance des clés, puis fusionner la PR #14 et tester le site public et le back-office. L’ancien back-office fait des écritures directes de stock que la nouvelle migration bloque. Garder la gestion de stock suspendue jusqu’au déploiement de l’administration compatible.

## Rétablissement

Revenir au dernier déploiement Netlify connu en cas d’erreur applicative et garder les ventes et les écritures de stock suspendues. Si les contrôles indiquent une atteinte aux données, restaurer d’abord le point validé dans un environnement isolé, puis décider avec le propriétaire de la restauration et de la reprise des écritures postérieures au point choisi. Réconcilier les événements financiers avec FedaPay avant toute reprise. Une restauration SQL seule ne recrée pas les objets Storage effacés.

## Mise en service progressive

- Production Netlify, configurer `PAYMENT_CHECKOUT_ENABLED=false`, `FEDAPAY_ENABLED=false`, `FEDAPAY_LIVE_APPROVED=false`, `ORDER_NOTIFICATIONS_ENABLED=false`.
- Resend, renseigner `RESEND_API_KEY` et `RESEND_WEBHOOK_SECRET` en secrets de production, puis `ORDER_EMAIL_FROM`, `ORDER_ADMIN_EMAIL` et `ORDER_TEST_EMAILS`. Créer un webhook distinct pour `/api/notifications/resend` sur l’origine réellement publiée. Vérifier le message de test dans l’historique Supabase et la livraison fournisseur signée. Pour cet envoi staff avec données fictives uniquement, utiliser temporairement `ORDER_EMAIL_DEMO_ENABLED=true` et une adresse de la liste de test.
- FedaPay, réconcilier en lecture seule la transaction de recette `113943841` avant tout autre test financier. Confirmer le marchand Live `101915`, les clés et le webhook, puis obtenir l’accord sur le test réel et rapprocher la commande, le stock, le paiement et les e-mails.
- Faire confirmer par la boutique l’inventaire physique, les prix, les tarifs et zones de livraison, les moyens de paiement, les coordonnées et les conditions de vente et retour avant l’ouverture.

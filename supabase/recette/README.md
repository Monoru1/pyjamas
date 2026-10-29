# Reconstruction isolée de la recette

Projet autorisé : oxhymanjibveayhcaqvj. Aucune écriture sur pukvrerdloudfiphomsj.

bootstrap-production-schema.sql reproduit le schéma public observé, sans données. Il refuse un schéma public contenant déjà des tables. Volontairement hors migrations/ : ne jamais l’intégrer à un déploiement production.

Ordre exécuté : bootstrap ; fedapay_commerce ; import du catalogue autorisé ; live_test_price_quotes ; stock_price_admin_guards ; payment_events_index. Correspondance des horodatages distants et fichiers dans [le rapport](../../docs/FEDAPAY_ACTIVATION.md). Ne pas rejouer les versions CLI déjà appliquées via API sans réconcilier l’historique de recette. Ne pas réparer l’historique production pour aligner la recette.

Import limité à currencies, languages, categories, collections, products, product_variants, product_collections, product_images. Transaction jsonb_populate_recordset, aucune identité/historique/secret, aucune synchronisation future vers la production. Les images restent aux URL publiques existantes ; aucun bucket privé copié.

nonfinancial-checks.sql : 20 assertions sur le PostgreSQL complet, fixtures synthétiques annulées par sous-transaction ; aucune requête fournisseur. Recette uniquement. Une assertion échouée lève une erreur SQL et annule la requête.

prepare-staff.sql : créer/inviter d’abord un Auth user de test dans la recette, puis fournir son UUID par app.recette_staff_user_id en session SQL sécurisée. Aucun mot de passe ou e-mail prérempli.

prepare-approved-live-intent.sql : ne pas exécuter sans accord explicite du propriétaire sur montant et marchand. Paramètres sécurisés : app.recette_staff_user_id, app.recette_merchant_account_id, app.recette_approved_amount_xof. Une intention locale de quinze minutes, aucun appel fournisseur. Son UUID est réservé au contexte Deploy Previews Netlify.

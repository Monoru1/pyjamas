# Activation FedaPay — recette privée du 29 octobre 2026

**NO-GO pour initier un paiement Live.** La base de recette est reconstruite et les contrôles non financiers passent. Secrets serveur, marchand, signature fournisseur et compte staff restent à finaliser. Aucun appel de création FedaPay ni encaissement exécuté. Aucune donnée ou configuration de production modifiée. PR #11 toujours en draft, sans fusion.

- PR : https://github.com/Monoru1/pyjamas/pull/11
- Preview : https://deploy-preview-11--pyjamas25.netlify.app
- Recette : oxhymanjibveayhcaqvj ; production consultée exclusivement en lecture seule : pukvrerdloudfiphomsj.
- Inventaire : [FEDAPAY_READINESS_2026-10-29.md](FEDAPAY_READINESS_2026-10-29.md).

## Base de recette : travaux exécutés

Extraction pg_catalog du schéma public complet : 29 tables initiales, types/enums, séquences, 16 fonctions, quatre vues, triggers, contraintes/FK, index, RLS et ACL des tables, colonnes et fonctions. Le bootstrap refuse une base possédant déjà des tables publiques. Il est volontairement hors du répertoire des migrations normales : **ne jamais l’appliquer en production**.

| Version distante recette | Nom | Source versionnée |
|---|---|---|
| 20261029105029 | recette_schema_bootstrap | supabase/recette/bootstrap-production-schema.sql |
| 20261029105110 | fedapay_commerce | supabase/migrations/20261029093122_fedapay_commerce.sql |
| 20261029105446 | live_test_price_quotes | supabase/migrations/20261029105353_live_test_price_quotes.sql |
| 20261029105925 | stock_price_admin_guards | supabase/migrations/20261029105807_stock_price_admin_guards.sql |
| 20261029110925 | payment_events_index | supabase/migrations/20261029111200_payment_events_index.sql |

L’API attribue ses propres horodatages distants : cette correspondance évite de rejouer les mêmes changements avec db push. Aucun historique production réparé ou modifié. Revoir l’historique avant toute future migration production.

Import limité au catalogue : **18 produits, 53 variantes, 31 images, 10 catégories, 11 collections, 28 relations produit/collection, quatre devises et deux langues**. Aucun compte Auth, profil, client, commande, e-mail, téléphone ni historique privé importé. Images : conservation des URL de stockage publiques existantes ; aucun bucket privé copié. Les données CMS et demandes événementielles ne sont pas clonées.

État après tests : 32 tables publiques avec RLS ; zéro commande, client, profil, utilisateur Auth et autorisation Live persistants. Zéro désaccord entre base_price et le minimum des variantes actives. Les 53 prix/promotions/stocks production relus sont identiques au snapshot initial. Aucun prix commercial changé, même en recette ; aucun résumé initial ne nécessitait une correction de valeur.

Compte staff **préparé**, pas encore connectable : créer/inviter un utilisateur de test dans Supabase Auth recette, puis exécuter supabase/recette/prepare-staff.sql avec son UUID en paramètre de session sécurisé. Aucun identifiant ni mot de passe prérempli ou exposé ; aucun compte production réutilisé. Validation interactive staff encore nécessaire.

## Prix : source de vérité et contrôles

**product_variants.price** est le prix facturé d’une taille, promotion comprise. compare_at_price est le prix barré d’affichage. products.base_price est un résumé dérivé du minimum des variantes actives ; sans variante, il reste indicatif et le checkout refuse la vente.

- Triggers SQL pour synchroniser et protéger le résumé ; aucune propagation automatique du prix d’une taille vers les autres.
- Vue catalogue : prix barré de la même variante que le prix minimum, sans fausse remise issue d’une autre taille.
- Administration : actions/RPC prix et stock distinctes, contrôle de l’ancienne valeur sous verrou. Modifier le stock n’écrit jamais le prix ; réservation concurrente = actualisation exigée.
- Catalogue/fiches dynamiques, lecture sans cache de données et invalidation après administration.
- Panier : POST /api/payments/quote relit la base, actualise Zustand et présente le nouveau total avant une deuxième confirmation explicite.
- Devis signé cinq minutes ; nouvelle lecture et comparaison des prix sous verrou SQL avant création. Prix ou panier modifié = 409 et nouvelle confirmation, avant tout appel FedaPay.
- Les snapshots des anciennes commandes restent inchangés. Une intention existante à un autre total n’est pas facturée silencieusement.
- Après actualisation, la reprise relit le snapshot de sa propre commande réservée : même si la dernière unité n’est plus dans le stock public, le total figé est présenté à nouveau, puis le même paiement peut être repris sans double réservation/création.

## Mode Live privé implémenté, non activé

Aucun CONTEXT falsifié. Next conserve uniquement les métadonnées non secrètes réellement fournies au build Netlify (contexte, REVIEW_ID, origine), car ces variables ne sont pas garanties dans les fonctions à l’exécution. Ne pas saisir PAYMENT_BUILD_* manuellement. Voir https://docs.netlify.com/build/functions/environment-variables/. Conditions simultanées :

1. CONTEXT=deploy-preview, REVIEW_ID=11, origine exacte https://deploy-preview-11--pyjamas25.netlify.app.
2. URL Supabase exacte de recette et PAYMENT_DATABASE_ISOLATED=true.
3. Environnement live et clé Live ; compte marchand numérique configuré ; clé Sandbox refusée.
4. Session staff reconnue dans cette base ; admission et suivi Live privés. Aucun bouton FedaPay de recette pour un visiteur ; route refusant l’anonyme.
5. PAYMENT_LIVE_TEST_ENABLED=true, plafond serveur entier de 1 à 1 000 XOF, UUID d’autorisation configuré ; FEDAPAY_LIVE_APPROVED reste false.
6. Autorisation SQL non expirée/non révoquée, liée au staff, au marchand et au montant exact approuvé. Une seule intention peut s’y lier ; une nouvelle clé d’idempotence est refusée après consommation.
7. Devis courant, réservation atomique et revendication durable de l’initialisation fournisseur unique.

La table live_test_authorizations est vide et inaccessible aux rôles publics/staff. prepare-approved-live-intent.sql n’est à exécuter qu’après accord explicite du propriétaire ; il prépare une intention locale de quinze minutes, sans appel FedaPay.

Coupe-circuit immédiat des nouveaux essais : révoquer l’autorisation en recette (revoked_at=now()), puis PAYMENT_CHECKOUT_ENABLED=false et redéployer. Conserver webhook/réconciliation pour l’intention déjà engagée. FEDAPAY_ENABLED=false coupe aussi les confirmations : arrêt total uniquement si délibéré, sans libérer de stock incertain.

## Netlify : état observé et actions manuelles précises

**Aucune écriture Netlify réussie.** Une tentative de créer PAYMENT_LIVE_TEST_ENABLED=false, Deploy Previews uniquement / Functions, a retourné **403**. L’upsert des variables existantes ne garantit pas le maintien des valeurs des autres contextes : aucune modification globale tentée.

Dans Netlify → pyjamas25 → Project configuration → Environment variables, modifier **Deploy Previews uniquement**, sans toucher Production :

| Variable | Observation | Action avant recette financière |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Recette preview / production production | Correct ; conserver |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Clé recette comparée au projet : correspondance | Conserver ; Build + Functions |
| SUPABASE_SERVICE_ROLE_KEY | Vide | Clé serveur recette, secret, Functions |
| FEDAPAY_ENVIRONMENT | sandbox hérité de All | Surcharge Deploy Previews : live |
| FEDAPAY_SECRET_KEY | Secret présent mais masqué | Vérifier la clé Live du bon marchand ; Functions |
| FEDAPAY_WEBHOOK_SECRET | Secret présent mais masqué | Secret exact du webhook Live preview ; Functions |
| FEDAPAY_ACCOUNT_ID | Valeur non numérique / non valide | ID numérique du Business La Maison des Pyjamas vérifié dans FedaPay |
| PAYMENT_RECONCILE_SECRET | Vide | Secret aléatoire distinct, au moins 32 caractères, Functions |
| PAYMENT_DATABASE_ISOLATED | true preview / false production | Correct ; conserver |
| PAYMENT_SITE_URL | Origines correctes par contexte | Conserver |
| PAYMENT_SHIPPING_XOF | 0 | Faire approuver 0 pour la seule intention de recette |
| FEDAPAY_ENABLED | false | Conserver jusqu’aux prérequis et accord |
| PAYMENT_CHECKOUT_ENABLED | false | Conserver jusqu’aux prérequis et accord |
| FEDAPAY_LIVE_APPROVED | false | Conserver false en recette |
| PAYMENT_LIVE_TEST_ENABLED | Absent, création refusée 403 | Ajouter false, Deploy Previews / Functions |
| PAYMENT_LIVE_TEST_MAX_XOF | Absent | Plafond approuvé seulement ; proposition 100 non approuvée |
| PAYMENT_LIVE_TEST_AUTHORIZATION_ID | Absent | UUID créé uniquement après accord |

Le connecteur masque les secrets FedaPay : présence ≠ validité ou correspondance au webhook. Ne pas publier leurs valeurs ; ne pas les mettre dans le JavaScript. Redéployer la preview après correction. Modèle : config/fedapay/netlify-live-preview.env.example. CONTEXT et REVIEW_ID viennent de Netlify : ne pas les redéfinir.

Le vérificateur hors ligne accepte --sandbox, --live et --live-test : npm run payments:check -- --live-test. Il affiche seulement les noms de contrôles, sans appel réseau ou écriture. Une configuration déclarée prête ne remplace ni l’autorisation SQL, ni la vérification du marchand, ni une preuve fournisseur.

## Webhook et réconciliation

URL Live de recette déclarée enregistrée/active par le propriétaire :

https://deploy-preview-11--pyjamas25.netlify.app/api/payments/webhook

Route présente. Signature HMAC officielle sur corps brut et tolérance temporelle vérifiées avant traitement, y compris lorsque l’admission est désactivée. Relecture API authentifiée ; montant, XOF, compte marchand, référence, transaction et métadonnées obligatoires. Doublon sans deuxième engagement de stock ni deuxième notification. Le retour navigateur ne confirme aucun paiement.

**La correspondance du secret masqué n’est pas attestée.** Aucune livraison authentique signée FedaPay vérifiée. Les tests signés locaux ne sont pas une preuve fournisseur. Une notification valide reste en erreur réessayable si le traitement est désactivé ou une dépendance manque.

Pas de schedule Netlify en preview : déclencher manuellement POST /api/payments/reconcile avec son Bearer secret côté serveur, jamais en URL. Annulation/refus retentables : réservation conservée ; expiration confirmée par API : libération unique. Outbox avec bail/reprise/idempotence pour les notifications. Aucun envoi Resend réel ni WhatsApp Business effectué.

## Tests et limites

- ESLint, TypeScript, build Next.js optimisé avec base recette : réussis.
- **94 tests automatisés / 14 fichiers : réussis**, dont devis changé/périmé, cap Live, accès staff, non-divulgation des secrets, signatures invalides, refus de lien vers un marchand incohérent, reprise après réservation de la dernière unité et reprise des paiements/notifications.
- **20 assertions PostgreSQL recette : réussies**, fixtures annulées : prix admin, résumé, promotion de la bonne taille, stock sans écriture de prix, RLS anon/staff/non-staff, réservation, idempotence, snapshots immuables, course de prix, doublon événement/outbox, annulation, expiration, intention financière unique.
- Audit npm de production : zéro vulnérabilité.
- Advisors sécurité : aucune erreur ; quatre WARN pour RPC SECURITY DEFINER héritées (is_admin, is_manager, is_super_admin, transition logistique), avec contrôles d’identité. INFO budget sans politique publique, intentionnel.
- Advisors performance : FK payment_events.payment_id indexée ; restent 14 politiques permissives multiples héritées et un index historique en double. 38 index inutilisés attendus sur base neuve ; aucun index supprimé.

Limites : SQL dans une seule session, pas de charge multi-connexions ; aucune transaction fournisseur ou livraison FedaPay authentique ; aucune réception réelle d’e-mail. Interface staff à connecter après création Auth. Contrôles preview et mobile : voir le rapport de readiness.

Preview du commit d29bf8a : CI quality et déploiement Netlify réussis, scan Netlify 441 fichiers sans secret détecté. HTTP réel : accueil/catalogue/panier 200, admin anonyme 307 vers connexion, référence invalide 400, webhook invalide 400, admission désactivée 503, réconciliation sans secret 401. Ce 503 est un refus intentionnel, pas un paiement lancé. Contrôle mobile : accueil 390 px, miniature 1/4 vers 2/4, taille M, panier 320 px sans débordement, quantité 2 et total 50 000 FCFA. Aucun formulaire de commande soumis. Le complément de reprise est vérifié par la suite de 94 tests avant publication. Le panier à deux unités a persisté après actualisation complète, puis a été vidé sans créer de commande.

## Scénario unique proposé — non lancé, à approuver

**Proposition : 100 XOF total, livraison 0, destinataire Business Live La Maison des Pyjamas dont l’ID numérique doit d’abord être confirmé.** Faire confirmer au payeur les éventuels frais du moyen de paiement. Aucun prix catalogue modifié pour atteindre ce montant.

1. Terminer les secrets, identifier formellement le marchand et connecter le staff recette ; conserver les admissions à false.
2. Obtenir un accord explicite sur les 100 XOF, le destinataire identifié et l’opérateur. La demande de préparation n’est pas cet accord.
3. Créer uniquement en recette un article technique distinct à 100 XOF, une taille, une unité. Créer l’autorisation unique de quinze minutes liée au staff/marchand/montant ; plafond 100. Ne pas toucher aux produits commerciaux.
4. Activer la preview privée après cet accord, redéployer, contrôler --live-test et le refus anonyme. Le staff confirme le devis 100 XOF et initie une intention ; le propriétaire/payeur valide sur FedaPay. Aucun clic financier automatisé.
5. Vérifier transaction Live, compte, montant, XOF, webhook signé + GET API, une commande paid, une réservation puis un commit et deux jobs. Rejouer le même événement ; contrôler absence de doublon et suivi après actualisation.
6. Révoquer l’autorisation et couper l’admission, redéployer ; réconcilier l’intention engagée et conserver les preuves non sensibles. Aucun deuxième essai ou remboursement financier sans nouvel accord.

**Blocages actuels :** secrets serveur vides, marchand non configuré correctement, environnement preview encore sandbox, staff à créer, secret webhook non attesté, aucun accord montant/destinataire. Production publique inchangée. Son activation demandera une validation distincte, sauvegarde/revue des migrations et historique, recette et validation commerciale des prix/stock/livraison/conditions.

## Documentation officielle

Consultée le 29 octobre 2026 :

- https://docs.fedapay.com/fr/integration-api/authentication
- https://docs.fedapay.com/api-reference/transactions/create
- https://docs.fedapay.com/api-reference/transactions/create-token
- https://docs.fedapay.com/api-reference/transactions/get-by-id
- https://docs-v1.fedapay.com/development/webhooks

Le flux API/Bearer utilise le propre compte marchand : aucune application OAuth nécessaire ou créée. La clé publique FedaPay n’est pas nécessaire à cette redirection générée côté serveur.

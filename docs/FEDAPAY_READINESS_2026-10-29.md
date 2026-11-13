# La Maison des Pyjamas — rapport P0 du 29 octobre 2026

**NO-GO pour initier un encaissement Live ou ouvrir le checkout public.** Le complément de code est prêt aux tests non financiers, la recette Supabase est reconstruite et testée. Secrets serveur, marchand, staff Auth, signature réelle et autorisation du montant restent bloquants. Aucune transaction financière créée ; aucune écriture Supabase production ou configuration Netlify production ; aucune fusion.

- [PR #11](https://github.com/Monoru1/pyjamas/pull/11), branche feat/fedapay-production-readiness, draft.
- [Preview](https://deploy-preview-11--pyjamas25.netlify.app), base recette oxhymanjibveayhcaqvj.
- [Rapport d’activation : migrations appliquées, variables, blocages et scénario Live](FEDAPAY_ACTIVATION.md).
- Production conservée : https://pyjamas25.netlify.app, Supabase pukvrerdloudfiphomsj.

## 1. Existant réutilisé

Next.js 16.4.2 App Router, React 19.2.7, TypeScript, Supabase SSR/PostgreSQL, Zustand, Resend. Catalogue et administration existants, produits/tailles/galeries, Noël et médias sélectionnés, demandes WhatsApp via Edge Function, profils staff et contrôles de rôles en base. L’adaptateur Next.js Netlify sert les routes API Node ; pas de page FedaPay statique.

La PR contenait déjà checkout serveur, commandes avec snapshots, réservation atomique, paiement/états logistiques séparés, webhook signé avec relecture fournisseur, idempotence, réconciliation, historique, outbox et workers de notifications. Ce travail a été conservé.

## 2. Travaux P0 réalisés

### Supabase recette

Inspection complète du schéma public production en lecture seule : tables, types, fonctions, séquences, triggers, contraintes, FK, index, vues, RLS et permissions. Reconstruction sur base recette vide via bootstrap protégé ; migration commerce appliquée puis migrations de prix/devis/autorisation Live, gardes admin et index de paiement. Reçu précis des cinq migrations distantes dans le rapport d’activation.

Import strictement catalogue : 18 produits, 53 variantes, 31 images, 10 catégories, 11 collections, 28 associations, quatre devises, deux langues. Zéro compte Auth, profil, client, commande ou historique privé copié. Images aux URL publiques existantes ; aucun bucket privé cloné. Les données CMS hors catalogue ne sont pas importées.

État final des fixtures SQL : zéro utilisateur, profil, client, commande et autorisation Live persistants. 32 tables publiques avec RLS, zéro désaccord de résumé de prix. Compte staff préparé par script, à créer/inviter dans Auth recette avant connexion interactive.

### Prix et administration

Source de vérité : product_variants.price, par taille, promotion comprise. compare_at_price sert uniquement au prix barré ; base_price est le résumé dérivé du minimum actif. Déclencheurs de maintien/protection, promotion de la même variante dans la vue catalogue.

Actions administrateur de prix et stock séparées, anciennes valeurs contrôlées sous verrou : une modification de stock n’écrase jamais le prix ni une réservation concurrente. Catalogue/fiches sans cache de données et pages dynamiques.

Devis serveur signé cinq minutes, actualisation des prix du panier puis confirmation explicite du nouveau total. Relecture serveur et contrôle de la même grille de prix sous verrou SQL au checkout. Prix modifié = refus/reconfirmation avant création fournisseur. Aucune valeur de montant fournie par le client n’est acceptée.

Après actualisation d’une intention déjà réservée, la revue utilise le snapshot de cette commande et exige sa confirmation. Elle peut reprendre la dernière unité déjà réservée sans refaire une vérification de stock public ni créer un autre paiement. Le changement de coordonnées/panier ne peut pas réutiliser cette intention.

Aucun prix commercial modifié ; les 53 prix/promotions/stocks production ont été relus et correspondent au snapshot initial. Les résumés importés étaient déjà cohérents. Les commandes historiques ne sont pas recalculées.

### FedaPay Live privé

Mode explicite, jamais activé : preview #11 et origine exactes, base recette exacte, isolation explicite, clé Live, session staff, plafond serveur maximal 1 000 XOF, approbation locale à usage unique liée au montant exact/marchand/staff. Aucun CONTEXT falsifié. Aucun accord créé. Table d’autorisations vide.

Avant de proposer le lien de paiement, une lecture API vérifie également le compte destinataire, le montant et les métadonnées. Une mauvaise clé marchand ne peut pas envoyer le testeur vers un autre compte. La même validation reste obligatoire au webhook avant paid.

Le coupe-circuit d’admission est indépendant du traitement ; révocation SQL immédiate des nouvelles intentions. Une autorisation de recette ne vaut pas approbation de déploiement production.

## 3. Migrations et fichiers

Nouvelles sources versionnées :

- supabase/recette/bootstrap-production-schema.sql : schéma public complet, exclusivement pour une recette vide.
- supabase/recette/nonfinancial-checks.sql : 20 assertions avec rollback intégral des fixtures.
- supabase/recette/prepare-staff.sql et prepare-approved-live-intent.sql : préparation explicite sans identifiants préremplis ni appel fournisseur.
- supabase/migrations/20261029105353_live_test_price_quotes.sql : prix dérivés, vue catalogue, devis, contrôle des prix verrouillés, autorisation financière unique.
- supabase/migrations/20261029105807_stock_price_admin_guards.sql : mises à jour admin prix/stock protégées.
- supabase/migrations/20261029111200_payment_events_index.sql : index FK événements.
- config/fedapay/netlify-live-preview.env.example : modèle inactif, sans secrets.
- src/app/api/payments/quote/route.ts et src/lib/payments/quotes.ts : devis/signature.
- src/lib/payments/quotes.test.ts, tests routes/configuration et vérificateur de release.

Fichiers ajustés : routes checkout/status/webhook, configuration et serveur paiements, bouton checkout/panier/Zustand, actions/page produits admin, pages publiques du catalogue/collections/contact/Noël, client Supabase/types, CSP/allowlist images, next.config.ts, .env.example, scripts/check-payment-readiness et ce rapport. Le diff GitHub constitue l’inventaire exhaustif.

Migration commerce antérieure 20261029093122_fedapay_commerce.sql réutilisée telle quelle et appliquée uniquement en recette. Aucun DROP TABLE ni suppression de production. Les versions distantes attribuées par l’API diffèrent des noms CLI : ne pas rejouer aveuglément db push. L’historique production reste à examiner lors d’un futur passage autorisé.

## 4. Tests exécutés et résultats

| Contrôle | Résultat |
|---|---|
| ESLint | Réussi |
| TypeScript | Réussi |
| Vitest | 94 tests / 14 fichiers réussis |
| Build Next.js optimisé, variables publiques recette | Réussi |
| npm audit production | 0 vulnérabilité |
| Assertions PostgreSQL recette | 20 réussies, mutations synthétiques annulées |
| Prix/stocks catalogue production | 53 variantes inchangées à la relecture |
| RLS recette | Toutes les tables publiques protégées ; anon/non-staff refusés pour écritures/RPC privilégiées |
| Advisors sécurité | 0 erreur ; 4 WARN de fonctions SECURITY DEFINER héritées, contrôlées ; INFO budget sans politique publique |
| Advisors performance | FK événements corrigée ; restent 14 WARN politiques multiples héritées, 1 index historique en double, INFO index inutilisés sur base neuve |

Couverture automatisée : un/multiples articles et tailles, épuisement, quantités, devis modifié/périmé, panier modifié, snapshots, réservation, idempotence, signature invalide et dupliquée, faux retour navigateur approved, montant/devise/référence/marchand incohérents, refus de lien vers mauvais marchand, reprise token, timeout, annulation/refus/attente/expiration, outbox unique, échec/reprise e-mail, accès admin, plafond et contexte Live, intention financière unique, absence de secrets dans la sortie du vérificateur.

Les 20 assertions cloud testent le schéma complet et les vrais rôles PostgreSQL ; les tests PGlite supplémentaires utilisent des fixtures. Aucun test de charge à connexions concurrentes, aucune transaction fournisseur, aucun encaissement sandbox/Live, aucune réception réelle d’e-mail. Les événements signés de tests ne constituent pas une livraison authentique FedaPay.

Validation navigateur avant ce complément : menu et panier à 390/320 px, tailles S à 3XL, miniature passant de 1/4 à 2/4, ajout M, actualisation persistante, quantité 2 puis suppression. Vérification de la nouvelle preview après déploiement consignée dans le complément final. Connexion staff et checkout financier non testés dans le navigateur tant que le compte/secrets manquent.

Complément réellement déployé d29bf8a : CI quality réussie, Netlify ready, headers/redirections réussis, scan Netlify de 441 fichiers sans secret détecté. Accueil/catalogue/panier 200 ; admin anonyme 307 vers /admin/login ; référence invalide 400 ; webhook invalide 400 ; checkout désactivé 503 ; réconciliation non autorisée 401. Pas de paiement initié. Accueil 390 px et panier 320 px sans débordement ; miniature 2/4, sélection M à 25 000 FCFA et quantité 2 donnant 50 000 FCFA vérifiées sur le catalogue recette. Aucun formulaire WhatsApp/commande envoyé. Le correctif de reprise de dernière unité est couvert par les 94 tests avant publication. Le panier à deux unités a persisté après actualisation complète, puis a été vidé sans créer de commande.

## 5. Netlify et webhook

Variables publiques Supabase correctes par contexte ; clé publique recette comparée au projet. FEDAPAY_ENABLED, PAYMENT_CHECKOUT_ENABLED et FEDAPAY_LIVE_APPROVED restent false. Aucune écriture Netlify réussie ; aucun changement de Production.

Bloquants Deploy Previews : SUPABASE_SERVICE_ROLE_KEY et PAYMENT_RECONCILE_SECRET vides ; FEDAPAY_ACCOUNT_ID non numérique ; environnement encore sandbox ; clés FedaPay/signature présentes mais masquées, contenu à vérifier ; nouvelles variables privées Live absentes. L’ajout de PAYMENT_LIVE_TEST_ENABLED=false a échoué en 403. Manipulations manuelles exactes, scopes et valeurs non secrètes dans le rapport d’activation.

Webhook Live de recette déclaré actif par le propriétaire : https://deploy-preview-11--pyjamas25.netlify.app/api/payments/webhook. Route existante, HMAC brut/timestamp, relecture API et validation complète, idempotence SQL. Correspondance du secret et vraie livraison fournisseur pas encore attestées. Le retour navigateur ne prouve jamais un paiement.

Schedules Netlify non exécutés en preview : réconciliation protégée à déclencher côté serveur. Annulation/refus retentables conservent la réservation ; seule expiration fournisseur confirmée la libère automatiquement. Une transaction dont l’association a échoué reste en attention, sans faux succès ni recréation aveugle.

Resend est implémenté avec bail/reprise/idempotence ; sans service configuré, jobs conservés avec motif. Aucun faux envoi WhatsApp Business : liens préremplis manuels seulement. Administrateur voit paiement et logistique séparément, ne peut pas déclarer un paiement FedaPay payé arbitrairement.

## 6. Conditions de livraison et prochaine étape financière

Design rouge/blanc/vert, produits, noms et prix commerciaux préservés. Vidéo indésirable video-10.mp4 / « Un instant à la maison · 11 » reste exclue. Les images catalogue existantes sont réutilisées. Les contrôles des médias du dépôt initial ne prouvent pas l’adresse réelle Google Maps ou les droits de diffusion ; confirmations du propriétaire encore requises.

Les prix restent qualifiés de provisoires dans les documents commerciaux existants. Stock physique, tailles, frais/zones de livraison, adresse/horaires, téléphone et textes commerciaux doivent être approuvés avant ouverture publique. Le coffret sans variante active n’est pas vendu par le checkout.

Proposition non exécutée : une intention de **100 XOF total, livraison 0**, vers le compte Business Live La Maison des Pyjamas identifié par son ID numérique vérifié, avec opérateur staff nommé. Article technique distinct en recette seulement, jamais baisse d’un prix commercial. Procédure détaillée, contrôle du paiement unique puis révocation dans le rapport d’activation.

L’accord du propriétaire sur ce montant et ce destinataire est obligatoire avant création d’intention FedaPay. Les secrets, le compte staff et la correspondance du webhook doivent d’abord être finalisés. Aucune demande de fusion ni activation publique.

## 7. Passage production ultérieur

Après recette et validation distincte : sauvegarde vérifiée, revue du schéma/historique et diff SQL ; appliquer seulement les migrations additives nécessaires, jamais le bootstrap recette. Configuration Production avec ses propres clés/secrets/base et domaine définitif ; livrer initialement admission désactivée. Configurer le webhook production https://pyjamas25.netlify.app/api/payments/webhook et son secret distinct. Vérifier routes, stock, admin, scheduler, notifications et logs. Activation publique et première transaction réelle production exigent leurs accords explicites.

En incident : fermer les nouvelles commandes, conserver webhook/réconciliation des paiements engagés, ne pas libérer un stock à paiement incertain. Rapprocher référence/métadonnées/compte/montant avant tout rattachement manuel ; ne jamais forcer paid. Vérifier Resend avant reprise d’une notification au-delà de sa fenêtre d’idempotence.

**Verdict : NO-GO financier et public.** Base recette et code livrés ; accès/configuration et preuve fournisseur encore manquants. L’absence de Sandbox n’a pas été masquée par des résultats inventés.

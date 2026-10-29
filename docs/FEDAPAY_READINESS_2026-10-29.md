# La Maison des Pyjamas — préparation FedaPay, 29 octobre 2026

**Verdict : NO-GO pour l’encaissement public.** Le code est implémenté et testé ; les clés et les essais réels fournisseur manquent. Aucun paiement réel n’a été annoncé ni effectué. La migration et la production n’ont pas été modifiées pendant cette intervention.

- PR : https://github.com/Monoru1/pyjamas/pull/11
- Branche : `feat/fedapay-production-readiness`, base `e32fc2a`.
- Preview : https://deploy-preview-11--pyjamas25.netlify.app
- Contrôle responsive : https://deploy-preview-11--pyjamas25.netlify.app/preview-check
- Site de production existant : https://pyjamas25.netlify.app

## 1. Existant et audit

Dépôt Next.js 16.4.2 App Router, React 19.2.7, TypeScript, Zustand, Zod, Supabase SSR. L’adaptateur Netlify génère la fonction serveur Next.js ; aucune fonction Netlify autonome n’existait pour le paiement. Inventaire des 414 fichiers suivis, inspection des dépendances et lockfile, routes de paiement, parcours panier, code d’administration, migrations et politiques de la base connectée.

Déjà présents : catalogue Supabase, galerie interactive, tailles et stocks, collection/vidéos Noël, panier persistant, demandes WhatsApp atomiques via Edge Function, authentification du personnel, gestion produits et statuts logistiques, tables `orders`, `order_items`, `payment_attempts`, `payment_events`, `order_status_history`. Le paiement existant était **sandbox uniquement et sans commande commerciale ni décrément du stock réel**. Le webhook possédait déjà une vérification HMAC avec horodatage et relisait le fournisseur.

Audit cloud en lecture seule : projet Supabase `pukvrerdloudfiphomsj`, PostgreSQL 17, tables publiques avec RLS. Le contrôle du rôle s’appuie sur `profiles` et `auth.uid()`, pas sur des métadonnées modifiables par l’utilisateur. Les RPC administrateur existantes sont `SECURITY DEFINER` avec contrôle d’identité ; la nouvelle migration conserve ce modèle pour la seule transition logistique et restreint les autres RPC au serveur. Un compte staff actif est présent. La protection des mots de passe compromis est désactivée dans Supabase Auth ; à examiner dans les réglages Auth. [Documentation de remédiation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Netlify `pyjamas25` : seules `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sont configurées au niveau du site ; aucune variable partagée d’équipe. Aucun secret serveur/FedaPay ni service de courrier opérationnel n’a été trouvé. La branche Supabase de preview automatique est désactivée ; le contrôle GitHub Supabase Preview est donc **skipped**. L’ancienne entrée de branche Supabase principale affiche `MIGRATIONS_FAILED` alors que le projet est actif : l’historique distant doit être vérifié avant tout push de migrations. Le fichier baseline du dépôt ne recrée pas à lui seul le schéma complet sur un projet vide.

Le scan par motifs des sources suivies ne trouve pas de clé FedaPay, de secret Supabase ou de JWT littéral. Il ne remplace pas une rotation si un secret a été partagé ailleurs. Aucun secret n’a été écrit dans cette PR.

## 2. Implémentation

Le coupe-circuit `PAYMENT_CHECKOUT_ENABLED` suspend les nouvelles ventes sans interrompre le webhook et la réconciliation des transactions engagées.

Le serveur valide nom, téléphone béninois `+229 01…`, e-mail, adresse, ville et lignes de panier. Les seules données article admises du navigateur sont l’UUID de variante et la quantité ; un montant transmis par le client est rejeté. Les prix, l’état des produits et le stock sont relus en base. La livraison est un forfait serveur explicitement configuré et validé par la boutique ; aucun tarif n’a été inventé.

Une transaction SQL crée client, commande, articles, paiement, réservation de stock et historique ensemble. `orders.payment_state='pending_payment'` est séparé de `orders.status`, conservé pour la logistique existante. La référence `MDP-<UUID>` est unique. La commande fige prix, taille, couleur et coordonnées. Modifier ensuite le panier ne modifie jamais cette commande.

Un verrou SQL sur la clé d’idempotence et une empreinte empêchent les doublons ou la réutilisation d’une clé avec un panier modifié. La clé et l’empreinte persistent en session lors d’une actualisation. Le serveur revendique durablement l’initialisation FedaPay avant l’appel de création. Après un délai réseau ambigu, il ne recrée jamais aveuglément une transaction. Il peut reprendre la génération du lien si l’identifiant fournisseur est déjà connu. Un webhook signé peut réassocier une transaction orpheline après lecture API et validation intégrale.

La confirmation exige signature du corps brut, horodatage récent, GET FedaPay, correspondance du montant, de XOF, du compte marchand, de `merchant_reference`, de l’identifiant local et de l’identifiant de commande dans les métadonnées. Si seule `currency_id` est renvoyée, la devise est résolue auprès de l’API ; aucun ID de devise n’est supposé signifier XOF. Un retour navigateur `status=approved` ne confirme rien. Les événements sont dédupliqués en base et un état ancien ne rétrograde pas un paiement payé/remboursé.

Le live exige clé `sk_live_…`, contexte Netlify production et `FEDAPAY_LIVE_APPROVED=true`. Le sandbox commercial exige un projet/base distinct de la production et `PAYMENT_DATABASE_ISOLATED=true`, avec accès staff. Les clés et accès privilégiés restent côté serveur.

## 3. Stock, états et reprise

`product_variants.stock_quantity` signifie **stock disponible à la vente**. La réservation le diminue atomiquement au checkout, avant la redirection ; le paiement validé engage cette réservation sans deuxième décrément. Les mouvements `reserve`, `commit`, `release`, `reacquire` sont journalisés et uniques par paiement/variante/type.

Point documentaire déterminant : FedaPay indique que `canceled` et `declined` peuvent être retentés et qu’une transaction pending expire normalement après 24 h. Ces états retentables conservent donc leur réservation. **Seule une expiration confirmée par l’API libère automatiquement le stock.** Une horloge locale ne prouve pas l’impossibilité d’un paiement. Les réservations qui dépassent leur échéance reçoivent `reservation_overdue`. Une initialisation sans association fournisseur est signalée `provider_association_missing` et nécessite de rechercher la transaction dans FedaPay ; aucun faux état expiré n’est fabriqué.

Un paiement tardif après libération tente de reprendre le stock sous verrou. S’il manque du stock, le paiement est enregistré mais la commande est marquée `needs_attention` et son traitement est bloqué. Les remboursements et annulations logistiques payées exigent une intervention ; aucun réassort automatique d’un article non retourné. Ne jamais débloquer `needs_attention` avant décision vérifiée (réapprovisionnement, retour, remboursement), et documenter l’intervention.

Les commandes WhatsApp conservent leur workflow existant. Leur validation réserve le stock disponible ; elle ne valide jamais un paiement FedaPay. Les écritures directes des commandes/articles sont révoquées, y compris d’éventuels droits de colonnes hérités. Le personnel utilise la RPC de transition, qui exige un paiement fournisseur confirmé pour une commande FedaPay.

## 4. Automatisations et administration

À la confirmation : état et historique sont persistés, stock engagé, deux jobs de notification sont créés de façon idempotente. La commande est immédiatement visible en administration, même sans service d’e-mail.

Envoi Resend réellement implémenté si `RESEND_API_KEY`, `ORDER_EMAIL_FROM` et le destinataire sont configurés. Sans configuration, le job reste en attente avec un motif visible. Un échec reprend avec délai croissant ; la réservation du job a un bail et un jeton pour reprendre après crash. La clé d’idempotence Resend reste stable. Après une fenêtre d’envoi incertaine de 12 h, le job est bloqué pour contrôle humain avant de dépasser la conservation de 24 h du fournisseur. Le statut `sent` signifie acceptation par l’API Resend, pas preuve de réception en boîte de réception.

Aucune API WhatsApp Business n’est configurée : les liens WhatsApp existants restent manuels. Aucun envoi automatique WhatsApp n’est prétendu.

Ajout des filtres date/statut, environnement de paiement, erreurs, coordonnées de livraison, jobs en attente et derniers événements vérifiés. Il n’existe aucun bouton permettant de déclarer manuellement un paiement FedaPay réussi. Les réglages produit/tailles/stocks existants sont préservés ; saisir le stock **disponible**, sans réintroduire les unités déjà réservées.

Deux fonctions Netlify : ordonnanceur UTC toutes les 5 minutes, puis worker background protégé par secret qui appelle la route de réconciliation authentifiée. Les schedules ne tournent pas sur les deploy previews : déclencher la route protégée manuellement pendant la recette. Chaque lot traite au plus deux transactions et deux notifications pour borner la durée ; surveiller le retard de file si le volume augmente. Le workflow GitHub de réconciliation existant reste optionnel ; éviter deux ordonnanceurs actifs sans nécessité.

## 5. Migration et fichiers

Migration additive : `supabase/migrations/20261029093122_fedapay_commerce.sql`, créée avec la CLI Supabase, puis exécutée en PGlite pour les tests. **Non appliquée à la base de production.** Réutilise les tables de paiement existantes ; ajoute seulement `inventory_movements` et `notification_jobs`, colonnes, contraintes, index, RLS/grants et RPC. Aucun DROP TABLE ni suppression de données.

Fichiers concernés :

- `.env.example`
- `netlify/functions/payment-maintenance-background.mts`
- `netlify/functions/payment-maintenance.mts`
- `package-lock.json`
- `package.json`
- `src/app/admin/actions.ts`
- `src/app/admin/commandes/page.tsx`
- `src/app/admin/paiements/page.tsx`
- `src/app/api/payments/checkout/route.ts`
- `src/app/api/payments/reconcile/route.ts`
- `src/app/api/payments/status/route.ts`
- `src/app/api/payments/webhook/route.ts`
- `src/app/layout.tsx`
- `src/app/paiement/page.tsx`
- `src/app/paiement/payment-status.tsx`
- `src/app/panier/page.tsx`
- `src/features/cart/components/checkout-button.tsx`
- `src/features/checkout/components/customer-form.tsx`
- `src/features/checkout/customer-form.store.ts`
- `src/lib/payments/checkout-input.ts`
- `src/lib/payments/commerce.test.ts`
- `src/lib/payments/fedapay.test.ts`
- `src/lib/payments/fedapay.ts`
- `src/lib/payments/notifications.test.ts`
- `src/lib/payments/notifications.ts`
- `src/lib/payments/routes.test.ts`
- `src/lib/payments/server.test.ts`
- `src/lib/payments/server.ts`
- `src/lib/supabase/database.types.ts`
- `src/lib/supabase/types/commerce.ts`
- `supabase/migrations/20261029093122_fedapay_commerce.sql`
- `docs/FEDAPAY_READINESS_2026-10-29.md` (ce rapport)

Les noms, prix et données catalogue ainsi que les médias existants n’ont pas été changés. Inter/Fraunces sont embarquées via Fontsource pour éviter un téléchargement Google lors du build. Zod 4.4.3 a été remplacé par 4.6.7 pour corriger GHSA-mrhx-c7xc-m3w5 ; versions exactes et lockfile conservés.

## 6. Variables à configurer

Ne jamais transmettre les valeurs dans un ticket, un commit ou le rapport. Utiliser les réglages chiffrés Netlify. Pour les variables serveur, inclure le scope **Functions**. Les deux variables publiques Supabase doivent aussi être accessibles au **build**. Isoler les valeurs par contexte Netlify ; un changement demande un nouveau déploiement.

| Variable | Recette | Production |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Projet isolé | Projet existant |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publique du projet isolé | Déjà présente |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret du projet isolé | Secret serveur du projet production |
| `FEDAPAY_ENABLED` | `true` une fois la recette configurée | `true` pour le traitement après validation ; garder actif pour les paiements engagés |
| `PAYMENT_CHECKOUT_ENABLED` | `true` pour lancer les essais | `false` jusqu’à validation finale, puis `true` pour accepter de nouvelles commandes |
| `FEDAPAY_ENVIRONMENT` | `sandbox` | `live` après validation |
| `FEDAPAY_SECRET_KEY` | Clé secrète sandbox | Clé secrète live |
| `FEDAPAY_WEBHOOK_SECRET` | Secret du webhook sandbox de cette URL | Secret du webhook live de cette URL |
| `FEDAPAY_ACCOUNT_ID` | ID compte marchand sandbox vérifié | ID compte marchand live vérifié |
| `FEDAPAY_LIVE_APPROVED` | `false` | `true` exclusivement après accord final |
| `PAYMENT_DATABASE_ISOLATED` | `true` | `false` |
| `PAYMENT_SHIPPING_XOF` | Forfait de recette explicite | Tarif commercial validé, y compris `0` si gratuit |
| `PAYMENT_SITE_URL` | Origine HTTPS de recette | Origine HTTPS publique définitive |
| `PAYMENT_RECONCILE_SECRET` | Secret aléatoire de recette | Secret distinct et long |
| `RESEND_API_KEY` | Facultatif pour essais d’e-mail | Requis si envoi d’e-mail attendu |
| `ORDER_EMAIL_FROM` | Expéditeur autorisé | Domaine d’envoi vérifié |
| `ORDER_ADMIN_EMAIL` | Destinataire de test | Destinataire administrateur confirmé |
| `OPERATIONS_ATOMIC_ENABLED` | `true` après migration/Edge Function correspondantes | Vérifier le workflow WhatsApp existant avant activation |

`CONTEXT`, `URL` et `DEPLOY_PRIME_URL` sont fournis par Netlify. Ne pas utiliser de clés live sur la preview. L’authentification staff de recette doit correspondre au projet isolé. Le sandbox ne doit jamais employer la clé service_role de production.

## 7. Tests exécutés et limites

Résultats dans le runtime cloud :

- `npm ci --ignore-scripts` : installation initiale réussie.
- `npm run typecheck` : réussi.
- `npm run lint` : réussi, aucune erreur ni avertissement final.
- `npm test -- --run` : **81 tests, 12 fichiers, tous réussis**.
- `npm run build` : vrai build Next.js optimisé réussi. Premier essai bloqué par le réseau des polices Google ; corrigé par l’embarquement des mêmes familles. Panier rendu dynamiquement afin de lire la configuration serveur à l’exécution.
- `npm audit --omit=dev --audit-level=moderate` : **0 vulnérabilité** après correction Zod.
- `node scripts/check-shooting-media.mjs` : 75 empreintes médias, 80 correspondances source, srcsets et 6 galeries vérifiés.
- `node scripts/check-migration-history.mjs` : correspondance des 51 migrations du snapshot historique, sans écriture de l’historique distant. Ce contrôle n’est pas une preuve que les migrations nouvelles sont appliquées.
- Smoke HTTP du serveur construit : `/`, `/catalogue`, `/panier`, `/contact` répondent 200 ; `/admin/commandes` anonyme redirige vers la connexion ; référence de paiement invalide rejetée en 400.
- CI GitHub `quality` réussie sur les commits de code. Preview Netlify construite, règles headers/redirections réussies, trois fonctions déployées et schedule reconnu. Aucun 5xx retourné dans la requête de logs Netlify filtrée sur la branche pendant la fenêtre vérifiée ; fenêtre limitée et trafic faible.

| Scénario exigé | Exécution réalisée |
|---|---|
| Un produit, plusieurs produits, tailles différentes | SQL PGlite avec vrais calculs, réservations et snapshots |
| Produit épuisé, quantité excessive | SQL : rejet et rollback intégral |
| Panier modifié pendant le paiement | Conflit de clé/empreinte ; commande immuable, panier conservé |
| Paiement réussi | Tests SQL + routes + lecture API simulée, **pas une transaction sandbox fournisseur** |
| Paiement refusé/annulé/en attente/expiré | Tests SQL de transitions, conservation/libération correcte |
| Webhook reçu deux fois | Routes signées simulées et idempotence SQL |
| Webhook invalide | Signature fausse, corps modifié, horodatage périmé/futur rejetés |
| Retour navigateur sans confirmation | Route de suivi conserve pending malgré `status=approved` |
| Mauvais montant/devise/référence/marchand | Tests de lecture serveur, aucune application de paiement |
| Échec d’e-mail | API simulée 503, job conservé, jamais déclaré envoyé |
| Accès admin non autorisé | HTTP réel anonyme + tests RPC/permissions |
| Actualisation pendant la commande | Réutilisation de clé, revendication durable, reprise token sans nouvelle transaction |
| Navigation mobile | Vérifications navigateur de la preview décrites ci-dessous |

Les tests PGlite utilisent un schéma de fixture reproduisant les structures nécessaires. Ils ne remplacent ni un test multi-connexions sur le PostgreSQL de recette complet ni les appels réels FedaPay. Aucun montant réel n’a été débité. Les pages d’administration avec les nouvelles colonnes ne peuvent être validées avec un compte réel avant migration sur la base isolée.

Contrôles interactifs réels sur la preview (navigateur cloud) : accueil à 390 px, panier à 390 px puis 320 px sans débordement ; ouverture du menu mobile et navigation vers la collection ; fiche carreaux rouges avec tailles S à 3XL ; clic miniature faisant passer de 1/4 à 2/4 ; sélection M ; ajout au panier avec taille M et 25 000 FCFA ; actualisation complète conservant cette ligne ; quantité passée à 2 et sous-total 50 000 FCFA ; suppression de l’article de test. Aucune demande WhatsApp, commande serveur ni transaction fournisseur n’a été soumise. Le formulaire de paiement activé reste à vérifier en recette isolée.

## 8. Finitions et écarts commerciaux

La DA rouge/blanc/vert est préservée. Collection de Noël mise en avant, hero image, vidéos sélectionnées via liste autorisée. `video-10.mp4` (« Un instant à la maison · 11 ») est déjà exclue par le dépôt initial ; aucun retour de ce média. Miniatures produit, boutons précédent/suivant, tailles et galerie mobile existent déjà.

Points à faire confirmer par la boutique avant tout encaissement :

- Les prix sont explicitement qualifiés de **provisoires** dans les sources, les descriptions et `docs/PRIX_PROVISOIRES_2026-10-21.md`. Aucune approbation commerciale n’a été trouvée.
- Les quantités physiques et tailles réellement disponibles doivent être vérifiées. Le coffret Noël actif n’a aucune variante active : le serveur ne le vendra pas.
- Frais et zones de livraison, délais, retours/remboursements et identité juridique manquent dans les textes préparatoires. Ils n’ont pas été inventés.
- Google Maps est un lien/recherche générique et un iframe sur le nom de la boutique ; la précision de l’adresse n’est pas attestée. Confirmer adresse et horaires. Vérifier aussi le numéro WhatsApp affiché, encore dans un ancien format béninois.
- Les vidéos existent et leurs empreintes sont vérifiées ; lecture effective, droits de diffusion et éventuelles vidéos indésirables non nommées doivent être validés par la propriétaire.

## 9. Procédure de recette et passage en production

1. Maintenir `FEDAPAY_ENABLED=false` et la PR en draft tant que la recette n’est pas complète. Ne pas fusionner pour « essayer » sur le stock production.
2. Préparer un projet/base Supabase isolé avec le schéma réel existant et seulement des données catalogue de test, sans copier les coordonnées clients. Réconcilier l’historique de migrations : la baseline du dépôt est un marqueur de schéma préexistant. Vérifier les FK, triggers et droits après import. Appliquer la nouvelle migration en recette uniquement et lancer les advisors.
3. Configurer le contexte `deploy-preview` avec les clés **sandbox**, l’ID marchand sandbox, les variables Supabase isolées, le tarif explicite, le secret de réconciliation et un staff de test. Redéployer la preview. Elle continuera autrement d’afficher le workflow WhatsApp existant ; cela ne prouve pas que le nouveau paiement fonctionne.
4. Configurer le webhook sandbox `https://deploy-preview-11--pyjamas25.netlify.app/api/payments/webhook`. Vérifier le secret de CET endpoint. Choisir les événements de transaction nécessaires (création/mise à jour, approved, transferred, canceled, declined, expired et remboursements disponibles). Ne pas désactiver la vérification TLS.
5. URL de retour créée par le serveur : `<origine>/paiement?reference=<UUID public>`. FedaPay renvoie l’annulation par son callback documenté : ne pas inventer un paramètre `cancel_url`. Ne jamais croire le statut de query string.
6. Exécuter réellement les essais sandbox réussis/refusés/annulés, renvoyer un webhook, fermer le navigateur avant confirmation, vérifier la réconciliation, l’admin, le stock, le rafraîchissement et les e-mails. En preview, déclencher `POST /api/payments/reconcile` avec le Bearer secret ; ne jamais mettre ce secret dans une URL.
7. Faire valider par la propriétaire les produits/prix/stock, livraison, contacts et textes définitifs. Faire la revue de la PR et obtenir la validation finale de déploiement demandée par le client.
8. Après cette validation seulement : sauvegarde vérifiée de la base, revue du diff SQL et de l’historique, application de la migration additive en production, configuration Netlify production avec le **bon** compte marchand et les secrets live. Garder d’abord `FEDAPAY_ENABLED=false` ; déployer et vérifier catalogue/admin/scheduler sans encaissement.
9. Configurer le webhook live `<origine publique>/api/payments/webhook`, avec son secret live distinct et domaine HTTPS vérifié. Activer `FEDAPAY_LIVE_APPROVED=true` puis `FEDAPAY_ENABLED=true` et `PAYMENT_CHECKOUT_ENABLED=true` uniquement dans le contexte production, redéployer et contrôler les logs. La propriétaire réalise une petite transaction réelle autorisée ; vérifier l’identifiant, le compte marchand, la commande paid, le stock et la confirmation avant toute annonce de paiement production validé.
10. En incident : passer `PAYMENT_CHECKOUT_ENABLED=false` et redéployer. Garder `FEDAPAY_ENABLED=true` et les secrets pour **préserver le webhook et la réconciliation des paiements déjà engagés**. Le coupe-circuit des nouvelles commandes est distinct du traitement. Ne pas supprimer les commandes ni libérer les réservations dont l’état fournisseur est inconnu. Réconcilier avant de réouvrir.

Réservations orphelines : rechercher par `merchant_reference`/métadonnées dans le compte FedaPay de l’environnement concerné, contrôler montant/devise/compte, rattacher seulement le bon ID via une intervention serveur auditée puis relancer la réconciliation. Ne pas modifier arbitrairement le statut à paid. Les jobs e-mail bloqués exigent vérification dans Resend avant remise en attente, pour éviter un doublon au-delà de sa fenêtre d’idempotence.

## 10. Sources officielles consultées et verdict

Documentation consultée le 29 octobre 2026 :

- https://docs.fedapay.com/api-reference/transactions/create
- https://docs.fedapay.com/api-reference/transactions/get-by-id
- https://docs.fedapay.com/api-reference/transactions/create-token
- https://docs.fedapay.com/fr/integration-api/collects-management
- https://docs.fedapay.com/fr/integration-api/webhooks
- https://docs.fedapay.com/fr/integration-api/authentication
- Documentation Supabase/MCP sur fonctions, droits et RLS, changelog : https://supabase.com/changelog
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5

**NO-GO production payante** : secrets et identifiants marchand absents, pas de base de recette cloud, migration non appliquée à celle-ci, aucun essai réel sandbox fournisseur, tarifs/stock/livraison/conditions encore à valider. Le code et la preview sont livrés pour revue. L’activation finale, la migration production et la transaction réelle restent volontairement à effectuer après validation et recette.

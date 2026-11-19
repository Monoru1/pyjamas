# Ouverture commerciale — procédure

État au 19/11/2026 : production sur `642f390`, ventes publiques **fermées**. Webhook FedaPay, réconciliation (toutes les 5 min) et suivi des commandes payées restent actifs.

## 1. Décisions à recevoir et où elles vont

| Décision | Qui | Où l'appliquer |
|---|---|---|
| Prix et stocks par taille | Boutique | Back-office **Produits & stocks** (pas de code). Tableau de validation : artefact « Prix et stocks ». |
| Coffret cadeau Noël (vendre ou non, composition) | Boutique | Back-office : ajouter une taille unique avec stock, ou décocher **En ligne**. |
| Livraison — montant unique | Boutique | Variable Netlify `PAYMENT_SHIPPING_XOF` (entier FCFA, contexte production) + texte de `src/app/(legal)/livraison-et-retours/page.tsx` et `cgv/page.tsx`. Redéploiement. |
| Livraison — plusieurs zones | Boutique | Évolution de code à faire (choix de zone au panier, `src/app/api/payments/quote/route.ts`, `src/lib/payments/fedapay.ts` l. 70, enregistrement sur la commande, e-mails). Prévoir une PR dédiée avec tests. |
| Retrait en boutique | Boutique | Textes légaux ci-dessus ; si « retrait = 0 FCFA » et livraison payante, c'est le cas « plusieurs zones ». |
| Retours, échanges, remboursements | Boutique + juriste | `livraison-et-retours/page.tsx` et `cgv/page.tsx` (sections et encadré « en cours de validation »). |
| Durées de conservation des données | Juriste | `politique-de-confidentialite/page.tsx` (encadré « en cours de validation »). |

Identité légale (`src/lib/legal/store-identity.ts`) : validée, ne pas modifier.

## 2. Ouvrir (après GO explicite du responsable)

1. Vérifier en production : `FEDAPAY_ENABLED=true`, `ORDER_NOTIFICATIONS_ENABLED=true`, `PAYMENT_ADMIN_TEST_ENABLED=false`, `PAYMENT_LIVE_TEST_ENABLED=false`, `PAYMENT_SHIPPING_XOF` = montant décidé.
2. Noter l'ID du déploiement de production actuel (ventes fermées) : c'est le point de retour.
3. Passer en contexte **production** uniquement : `FEDAPAY_LIVE_APPROVED=true`, `PAYMENT_CHECKOUT_ENABLED=true`.
4. Netlify → Deploys → **Trigger deploy → Deploy project**. Attendre `ready`.
5. Contrôles sans paiement : pages publiques 200 ; panier affiche le bouton de paiement et l'avertissement sur les frais FedaPay ; `POST /api/payments/webhook` à signature invalide → 400 ; `/api/payments/reconcile` sans secret → 401 et appels planifiés en 200 ; suivi de la commande MDP-20261119-6E3AC2 toujours « Paiement confirmé — Commande livrée ».
6. Première vraie commande client : vérifier fiche admin, e-mail client, e-mail personnel reçu **sur les deux adresses**, stock décrémenté une seule fois.

## 3. Fermer en urgence

- **Le plus rapide (quelques secondes)** : Netlify → Deploys → déploiement noté à l'étape 2 → **Publish deploy**. Les variables étant figées dans chaque déploiement, celui-ci ventes fermées le reste.
- Puis remettre `PAYMENT_CHECKOUT_ENABLED=false` (production) pour que le prochain build reste fermé.
- Le webhook et la réconciliation continuent : les paiements déjà engagés sont confirmés. Ne supprimer ni commande, ni réservation, ni historique.

## 4. Rotation des secrets (avant ouverture, ventes fermées)

Les clés de production ont été présentes dans le contexte deploy-preview jusqu'au 19/11/2026. Les anciens déploiements de prévisualisation conservent leurs variables : seule une rotation les rend inutilisables. Aucune PR externe (fork) n'a jamais été construite ; le risque est faible, mais la rotation est recommandée tant que la boutique est fermée.

À faire par le responsable (les valeurs ne doivent transiter par personne d'autre) :

1. **FedaPay** (Live) : générer une nouvelle clé secrète → la coller dans Netlify `FEDAPAY_SECRET_KEY` (production uniquement) → redéployer → vérifier les appels de réconciliation en 200 → révoquer l'ancienne clé.
2. **Secret du webhook #10766** : régénérer côté FedaPay → `FEDAPAY_WEBHOOK_SECRET` (production) → redéployer immédiatement (entre les deux, un webhook serait rejeté ; la réconciliation rattrape le paiement).
3. **Supabase production** (`pukvrerdloudfiphomsj`) : si la clé est au format `sb_secret_…`, créer une nouvelle clé secrète, la mettre dans `SUPABASE_SERVICE_ROLE_KEY` (production), redéployer, vérifier admin + suivi, puis supprimer l'ancienne. Si c'est l'ancienne clé JWT `service_role`, ne pas faire tourner le secret JWT sans fenêtre de maintenance : migrer d'abord vers les nouvelles clés API.
4. Resend : jamais exposé aux previews, pas de rotation nécessaire.

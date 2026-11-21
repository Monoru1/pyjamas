# Terrain 16 — Clôture de la sécurité (branche `security/strix-hardening`)

Base : `main` @ `5493d8d`. Contient les 3 commits du Terrain 15 (SEC-001 à SEC-004, contenu
identique au patch livré) et les corrections Terrain 16. **Rien n'est appliqué en production.**

## Migrations (ordre)

| Fichier | Effet | Réversible |
|---|---|---|
| `20261121170000_checkout_client_limits.sql` | SEC-001 : budget par connexion, plafond 20 unités impayées | oui (doc Terrain 15) |
| `20261121180000_unpaid_reservation_30_minutes.sql` | SEC-001 : réservation impayée 30 min (nouvelles commandes) | oui |
| `20261121180100_two_admin_accounts_mfa.sql` | SEC-005/011 : `employee` sans droit, interrupteur AAL2, `is_admin_account()`, profils inactifs par défaut, journal clients/profils/collections/images. **Refuse de s'exécuter s'il reste un profil `employee` actif.** | oui |
| `20261121180200_retire_unpaid_order_requests.sql` | SEC-006 : plus aucun rôle ne peut appeler `create_order_request_atomic` | oui |
| `20261121180300_storage_no_public_listing.sql` | SEC-010 : buckets non listables, URL publiques inchangées | oui |

Retour arrière base : `supabase/production/rollback-terrain16.sql` (après redéploiement de l'ancien code).

## Déploiement — ordre impératif, autorisation du propriétaire requise à partir de l'étape 6

1. Sauvegarde restaurable prouvée (`production-release` → `backup-drill`).
2. Recette `oxhymanjibveayhcaqvj` : `supabase/production/terrain16-preflight.sql`, puis les 5 migrations, puis `terrain16-postflight.sql` (tout `true`).
3. Vérifier les permissions SQL (postflight) et un paiement sandbox de bout en bout.
4. Production : `terrain16-preflight.sql` (lecture seule). `active_employees` doit valoir 0 ; sinon décider pour chaque profil (promouvoir le titulaire autorisé en `admin`, ou désactiver).
5. Vérifier que la branche passe la CI.
6. **Autorisation explicite du propriétaire.**
7. Appliquer les 5 migrations en production, puis `terrain16-postflight.sql`.
8. Fusionner la PR et laisser Netlify déployer. **Jamais le code avant les migrations** (le paiement répondrait 429).
9. Contrôles : panier → page FedaPay ; connexion des deux administrateurs ; `/admin/commandes` ; suivi d'une commande.

En cas d'échec à l'étape 7 : arrêter, ne pas déployer le code, exécuter `rollback-terrain16.sql`.

## Netlify (aucune modification faite)

| Variable | Quand | Valeur |
|---|---|---|
| `PAYMENT_QUOTE_SECRET` | facultatif, après déploiement | secret aléatoire ≥ 32 caractères, dédié |
| `CHECKOUT_FINGERPRINT_SECRET` | facultatif, après déploiement | secret aléatoire ≥ 32 caractères, dédié |
| `PAYMENT_MAX_OPEN_UNITS_PER_CLIENT` | facultatif | défaut 20 |
| `ADMIN_MFA_REQUIRED` | **seulement après l'enrôlement des deux titulaires** | `true`, puis redéployer (valeur lue au build) |

Sans ces variables, le code reprend les secrets actuels : aucune rotation n'est imposée.

## MFA — actions humaines

1. Après déploiement, chaque titulaire se connecte et ouvre `/admin/mfa` → « Configurer l'application », scanne le QR code, valide le code à 6 chiffres.
2. Dès qu'un facteur est vérifié, ce compte doit saisir un code à chaque connexion.
3. Chacun ajoute un **appareil de secours** depuis `/admin/mfa` (récupération : Supabase TOTP ne fournit pas de codes de secours).
4. Quand les deux comptes ont ≥ 1 facteur vérifié (préflight, colonne `verified_factors`) : `ADMIN_MFA_REQUIRED=true` sur Netlify + redéploiement, puis en SQL :
   `update private.security_flags set enabled = true where key = 'admin_mfa_required';`
5. Appareil perdu : l'autre administrateur supprime le facteur dans Supabase → Authentication → Users ; ne jamais désactiver l'interrupteur pour dépanner.

## Fonction Edge `create-order-request`

Le code est retiré du dépôt et la base refuse désormais l'appel (migration 180200). Après autorisation :
`supabase functions delete create-order-request --project-ref pukvrerdloudfiphomsj` (et recette).

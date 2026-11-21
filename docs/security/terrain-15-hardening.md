# Terrain 15 — Durcissement de sécurité (branche `security/strix-hardening`)

Base : `main` @ `5493d8d`. Aucune donnée de production lue ni modifiée. Tous les tests utilisent
PGlite (base jetable) et des doubles FedaPay/Resend : aucune transaction, aucun e-mail réel.

## Corrections

| ID | Gravité | Correction | Test de non-régression |
|----|---------|-----------|------------------------|
| SEC-001 | Élevée | Budget de paiement par connexion (empreinte HMAC de `x-nf-client-connection-ip`, jamais l'adresse brute) évalué **avant** le plafond global ; plafond de 20 unités en réservations impayées ouvertes par connexion (`PAYMENT_MAX_OPEN_UNITS_PER_CLIENT`, 1–200). La reprise d'une commande existante n'est jamais bloquée. | `src/lib/payments/checkout-abuse.test.ts` |
| SEC-002 | Faible | Nom et Content-Type des images téléversées dérivés de la signature réelle du fichier ; identifiants produit/collection validés (UUID). | `src/app/admin/upload-hardening.test.ts` |
| SEC-003 | Faible | Comparaison à temps constant du secret de la fonction de maintenance. | `netlify/lib/maintenance-auth.test.ts` |
| SEC-004 | Faible | `permissions: {}` sur le workflow `christmas-smoke`. | revue |

## Déploiement — ORDRE IMPÉRATIF

1. Sauvegarde restaurable prouvée (procédure `production-release` existante).
2. Appliquer **d'abord** `supabase/migrations/20261121170000_checkout_client_limits.sql`
   (additive : une colonne nullable, un index partiel, une fonction réservée à `service_role`).
3. Vérifier : `select has_function_privilege('anon','public.consume_checkout_budget(text,text,integer,integer)','execute');` → `false`.
4. Seulement ensuite, déployer le code. Déployé avant la migration, le paiement répondrait 429 à tous.
5. Option : `PAYMENT_MAX_OPEN_UNITS_PER_CLIENT` (défaut 20).

## Retour arrière

1. Redéployer le commit précédent (le code ancien n'utilise ni la colonne ni la fonction).
2. Facultatif, après retour du code :
   `drop function public.consume_checkout_budget(text,text,integer,integer); drop index public.payment_attempts_client_reserved_idx; alter table public.payment_attempts drop column client_fingerprint;`

## Points non corrigés (décision propriétaire requise)

Voir le rapport Terrain 15 : durée de réservation de 24 h, droits du rôle `employee`,
fonction Edge historique `create-order-request`, CSP `unsafe-inline` des pages publiques,
MFA administrateur, réutilisation de secrets HMAC.

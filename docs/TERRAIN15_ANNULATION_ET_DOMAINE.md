# Terrain 15 — Annulation FedaPay et préparation du domaine personnalisé

## Incident MDP-20261120-E6AAAD (20 novembre 2026)

Chronologie relevée dans les journaux Netlify (UTC) :

- 15:10:20 — `POST /api/payments/checkout` depuis iPhone Safari : 200, transaction FedaPay Live créée.
- 15:10:25 — un seul webhook FedaPay reçu (200). Aucun autre ensuite, notamment aucun `transaction.canceled`.
- 15:10:38 → 15:13:50 — suivi interrogé par la page `/paiement` : toujours `pending`.
- 15:25:13 — la réconciliation planifiée relit la transaction directement chez FedaPay : toujours `pending`.

Cause : après une annulation sur la page FedaPay, FedaPay **laisse la transaction `pending`** et n'émet pas d'événement terminal ; seul le retour navigateur porte `status=canceled`, valeur non fiable par conception. Côté boutique, rien ne mettait fin à cet état : un libellé unique « En attente de confirmation », un suivi qui s'arrêtait sans le dire, aucune relecture FedaPay déclenchée par le retour, et un stock libéré uniquement si FedaPay déclarait lui-même `expired`.

## Correctifs

- Le retour depuis FedaPay et « Actualiser le suivi » demandent au serveur de relire FedaPay (autorité unique), au plus une fois toutes les 30 s par paiement (verrou atomique, réconciliation planifiée incluse).
- Messages distincts : vérification en cours, **non finalisé** (aucun débit confirmé), refusé, annulé, expiré, confirmé, remboursé. Le paramètre `status` du retour ne sert qu'au libellé, jamais au résultat.
- Après environ deux minutes sans confirmation, la page l'indique et propose de reprendre le paiement.
- Échéance de réservation (`payment_attempts.expires_at`, 24 h à la création) : un paiement non confirmé par FedaPay passe `expired` et son stock est libéré une seule fois. Si FedaPay approuve plus tard, `apply_shop_payment` existant ré-acquiert le stock ou signale la commande : aucun paiement n'est perdu.
- Reprise : même commande, même montant, même transaction FedaPay tant que la réservation court ; après expiration, le serveur répond `terminal` et le navigateur oublie sa clé d'idempotence pour créer une nouvelle commande.
- WhatsApp : bouton affiché uniquement après paiement confirmé par le serveur, numéro officiel de `store-identity`, message prérempli avec la référence et la demande de livraison ou retrait.

Aucune migration SQL, aucune commande supprimée.

## Domaine personnalisé — procédure après achat

Tout dépend d'une seule variable Netlify, `SITE_CUSTOM_DOMAIN` (nom d'hôte exact, sans `https://`). Tant qu'elle est vide, rien ne change.

1. Ajouter le domaine dans Netlify (Domain management) et attendre le certificat HTTPS.
2. Renseigner `SITE_CUSTOM_DOMAIN` (contexte Production), puis redéployer `main`. Effets : retours FedaPay, liens des e-mails, URL canoniques et contrôles d'origine passent sur le domaine ; l'adresse `pyjamas25.netlify.app` reste acceptée pendant la transition.
3. Mettre à jour `PAYMENT_SITE_URL` avec `https://<domaine>` (tâches planifiées).
4. FedaPay et Resend : remplacer l'URL des webhooks par `https://<domaine>/api/payments/webhook` et l'URL Resend correspondante. L'ancienne adresse continue de fonctionner, Netlify ne redirigeant pas automatiquement le sous-domaine `netlify.app`.
5. Ne pas ajouter de redirection globale `netlify.app → domaine` sans exclure `/api/*` : un 301 casserait les webhooks POST.
6. HSTS `includeSubDomains; preload` est déjà envoyé : n'utiliser le domaine que pour des services HTTPS.
7. La fonction Edge historique `create-order-request` (fermée) a son origine CORS codée en dur : à mettre à jour uniquement si ce parcours est rouvert.

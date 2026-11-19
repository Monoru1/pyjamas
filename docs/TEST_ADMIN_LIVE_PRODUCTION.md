# Test Live privé en production (administrateur uniquement)

Terrain 11, 19 novembre 2026. Ce mode permet UN paiement Live réel sur la production
sans ouvrir la boutique au public. Il ne vaut pas GO commercial.

## Garde-fous du code

- Actif seulement si `CONTEXT=production`, `FEDAPAY_ENVIRONMENT=live`, `FEDAPAY_ACCOUNT_ID=101915`,
  `FEDAPAY_LIVE_APPROVED=false` et `PAYMENT_ADMIN_TEST_ENABLED=true`.
- `FEDAPAY_LIVE_APPROVED=true` (ouverture publique) désactive automatiquement ce mode.
- Le bouton de paiement et l'API `/api/payments/checkout` sont réservés aux comptes `is_admin` ;
  un visiteur reçoit 403 sans réservation de stock ni appel FedaPay.
- Le total doit être exactement `PAYMENT_ADMIN_TEST_AMOUNT_XOF` (montant approuvé par le propriétaire).
- Une autorisation = un paiement : la clé d'idempotence est dérivée côté serveur du marchand, du montant
  et de l'expiration ; les tentatives répétées ou simultanées retombent atomiquement sur le même paiement
  (verrou de `create_shop_payment`).
- Un paiement Live `pending`, `failed`, `cancelled`, payé ou remboursé bloque toute nouvelle autorisation
  (une transaction refusée ou annulée reste payable chez FedaPay) ; seul `expired` libère le test.
- `PAYMENT_ADMIN_TEST_EXPIRES_AT` (ISO 8601, au plus 72 h dans le futur) ferme les nouvelles
  admissions ; webhooks et rapprochement continuent de fonctionner après expiration.
- Le paiement suit le circuit commercial normal : `create_shop_payment`, webhook signé,
  relecture FedaPay, `apply_shop_payment`, puis les deux e-mails des commandes payées.

## Variables Netlify (contexte Production uniquement)

| Variable | Test privé | Après le test |
| --- | --- | --- |
| `FEDAPAY_ENABLED` | `true` | `true` si webhooks/rapprochement doivent continuer |
| `PAYMENT_CHECKOUT_ENABLED` | `true` | `false` |
| `FEDAPAY_LIVE_APPROVED` | `false` | `false` jusqu'à l'accord d'ouverture publique |
| `PAYMENT_ADMIN_TEST_ENABLED` | `true` | `false` |
| `PAYMENT_ADMIN_TEST_AMOUNT_XOF` | montant exact approuvé | vide |
| `PAYMENT_ADMIN_TEST_EXPIRES_AT` | ex. `2026-11-20T18:00:00+01:00` | vide |
| `ORDER_NOTIFICATIONS_ENABLED` | `true` | selon décision |
| `PAYMENT_LIVE_TEST_ENABLED` | `false` | `false` |

Redéployer après chaque changement de variable. Ne jamais forcer une commande à l'état payé.

# Terrain 9 — configuration et preuves, 19 novembre 2026

La boutique reste fermée aux nouveaux paiements publics. Ce document décrit la préparation technique, pas un GO commercial.

## Dépôt et données

Les PR #17, #18 et #19 sont fusionnées. La PR #20 porte la simplification du stock, les deux e-mails après paiement, la suppression des contrôles de démonstration dans l’expérience commerciale et Next.js 16.4.6.

La migration `paid_order_emails_only` remplace uniquement `queue_staff_order_notifications` et `claim_order_email`. Version production : `20261119091918` ; version recette générée par le connecteur : `20261119091903`. Les deux utilisent exactement le même SQL. Ne pas la rejouer pour aligner les horodatages. La production compte désormais 67 migrations.

Empreintes après migration, identiques à celles d’avant migration :

| Ensemble | MD5 de l’état ordonné |
| --- | --- |
| Produits | `c4600632e0f50175ee1146d1414de9ad` |
| Variantes | `026d4513c511470c17cd255ce130fa16` |
| Commandes | `56ddc3e710be220709454b2492c0e289` |
| Lignes de commande | `b05137caca5615117757b55e0040defe` |

Après ce contrôle, seule la phrase de préparation « Prix provisoire ; tailles et disponibilités à confirmer auprès de la boutique. » a été retirée des six descriptions publiques. Les descriptions originales sont restaurables avec `supabase/production/rollback-terrain9-product-copy.sql`. Aucun prix, quantité, photo ou historique de commande n’a été réécrit. Les unités vendues et l’inventaire physique restent à valider par la boutique avant ouverture.

Le catalogue possède 18 produits au total, 8 non archivés, 6 publics, 53 variantes et 551 unités disponibles sur l’ensemble des variantes actives. Les 9 commandes historiques sont conservées. Aucun paiement et aucune notification de commande ne sont enregistrés dans la production à ce stade.

## Réglages de production

| Réglage | État constaté |
| --- | --- |
| Supabase public | Projet de production `pukvrerdloudfiphomsj` |
| `SUPABASE_SERVICE_ROLE_KEY` | Entrée de production vide : blocage |
| `FEDAPAY_ACCOUNT_ID` | `101915` |
| `FEDAPAY_ENVIRONMENT` | `live`, configuration préparée, traitement désactivé |
| `FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET` | Présentes mais masquées : provenance et validité Live non vérifiées |
| `FEDAPAY_ENABLED`, `PAYMENT_CHECKOUT_ENABLED`, `FEDAPAY_LIVE_APPROVED`, `PAYMENT_LIVE_TEST_ENABLED` | `false` |
| `RESEND_API_KEY` | Nouvelle clé limitée à l’envoi depuis le domaine vérifié ; injectée comme secret |
| `RESEND_WEBHOOK_SECRET` | Injecté comme secret, webhook production `/api/notifications/resend` créé |
| `ORDER_EMAIL_FROM` | La Maison des Pyjamas, `notifications@ryadsaka.com` |
| `ORDER_ADMIN_EMAIL` | `sakryad@gmail.com`, seul super-administrateur actif en base |
| `ORDER_TEST_EMAILS` | Adresse du même administrateur |
| `ORDER_NOTIFICATIONS_ENABLED`, `ORDER_EMAIL_DEMO_ENABLED` | `false` |
| `PAYMENT_SHIPPING_XOF` | `0`, accord métier à confirmer |

Les deux clés Resend ont les portées Builds, Functions et Runtime. Les réglages non secrets ont la portée All. Un nouveau déploiement est nécessaire pour prendre en compte les modifications.

Le domaine Resend `ryadsaka.com` est vérifié, envoi activé en Europe. Les messages de démonstration du 13 novembre sont marqués `delivered` chez Resend ; cette preuve historique ne valide pas le nouveau circuit après paiement en production. Aucun nouvel e-mail n’a été envoyé pendant Terrain 9. Le nouveau webhook doit être validé sur un vrai message lié au test de paiement autorisé.

## Test réel restant

Le parcours Live isolé est désormais la prévisualisation de la PR #21 sur `oxhymanjibveayhcaqvj`, réservé au personnel et limité à 100 FCFA. Ses interrupteurs restent fermés. Il faut une nouvelle autorisation explicite et une autorisation technique valide pour ce test ; ne pas réutiliser silencieusement une ancienne autorisation.

Avant le test, confirmer la transaction historique `113943841` auprès du prestataire et rapprocher son état par le circuit prévu, sans inventer de paiement ni libérer manuellement une réservation. Confirmer les clés Live et le webhook fournisseur. Ne jamais considérer le retour navigateur comme une preuve.

Le test doit prouver une seule commande, une seule transaction au bon montant et au bon marchand, un seul mouvement par étape, deux notifications au maximum (client avec accord et personnel), et leurs événements réels de livraison. L’ouverture publique exige ensuite un accord distinct.

## Retour arrière

1. Maintenir les quatre interrupteurs de paiement, admission, approbation Live et notifications fermés, puis redéployer.
2. Restaurer si nécessaire le déploiement Netlify `6afb21e927a584dac16d94fd` (source `ddf42db3d032b441b1dd12b7319a6779d1a8805f`) après vérification de sa configuration effective. La version antérieure à la PR #20 conserve l’ancien écran et l’ancienne règle d’e-mails : garder les notifications fermées.
3. Les deux nouvelles fonctions SQL restent compatibles avec cette version. Ne pas restaurer la base pour revenir sur un changement applicatif.
4. Si une restauration explicite des fonctions est nécessaire, le script `rollback-terrain9-email-functions.sql` ne touche aucune donnée ; il rétablit l’ancienne règle plus large et impose donc de garder les notifications fermées.
5. Conserver les sauvegardes existantes. La CI répète sauvegarde, restauration stricte, chiffrement et protection contre une seconde migration sur une base jetable ; cela n’est pas une nouvelle sauvegarde de la production réelle.

Le [guide quotidien du personnel](GESTION_QUOTIDIENNE.md) décrit les actions produits, stock, commandes, remise et surveillance des e-mails.

# Mise en service commerciale — La Maison des Pyjamas

Procédure pour le propriétaire, le personnel de la boutique et l'administrateur Netlify. La préparation et les exercices de recette se font avec les ventes fermées. Une autorisation spécifique est requise pour un test réel. L'ouverture publique exige un deuxième feu vert.

## 1. Faire valider le catalogue et la livraison

- Dans **Produits & stocks**, rapprocher chaque référence et taille de l'inventaire physique. Vérifier l'unité vendue (article ou lot), le prix XOF, la photo, la disponibilité et les quantités à réserver ou à remettre. Les 551 unités relevées sont comptables. Consigner les écarts et leur motif. Faire valider les corrections avant toute écriture en production.
- Confirmer les zones, tarifs et délais de livraison ainsi que les conditions de retrait. Vérifier que les conditions affichées correspondent aux engagements de la boutique. Le tarif technique actuel de 0 XOF doit être validé explicitement s'il est conservé.
- Confirmer les comptes staff, le domaine et l'adresse expéditeur, le destinataire administratif et l'adresse de test autorisée.

## 2. Vérifier une session staff en recette

Avec un compte déjà autorisé sur la recette et des références fictives, se connecter, ouvrir les commandes et le catalogue, modifier la variante et son prix, enregistrer une réception puis un ajustement justifié, et vérifier l'historique de chaque mouvement. Contrôler une transition autorisée et une transition refusée, puis se déconnecter et vérifier le retour à la connexion. Faire un passage sur ordinateur et sur mobile. Relever les références des fixtures et comparer avec les données de recette. Conserver la production en lecture seule pendant cet exercice.

## 3. Préparer Netlify, checkout fermé

Renseigner les secrets uniquement dans le contexte Netlify correspondant. Les entrées de production doivent provenir du projet Supabase et du compte prestataire de production. Conserver des clés distinctes dans la recette. Les variables server-side doivent parvenir aux fonctions. Redéployer après modification et vérifier le SHA du déploiement publié et les quatre interrupteurs.

| Réglages | Vérification attendue |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_RECONCILE_SECRET` | Confirmer leur validité côté serveur via les contrôles autorisés. Une entrée masquée dans Netlify prouve seulement l'existence du réglage. |
| `FEDAPAY_ACCOUNT_ID`, `FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET`, `FEDAPAY_ENVIRONMENT` | Identifier le compte marchand et les réglages Live approuvés. La bascule de configuration Live est à préparer pour l'autorisation future. |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `ORDER_EMAIL_FROM`, `ORDER_ADMIN_EMAIL`, `ORDER_TEST_EMAILS` | Expéditeur approuvé et domaine vérifié, clé d'envoi et adresses autorisées, webhook signé sur l'origine réellement déployée. |
| `PAYMENT_SHIPPING_XOF` | Confirmer le montant entier en XOF avec la boutique. |
| `PAYMENT_CHECKOUT_ENABLED`, `FEDAPAY_ENABLED`, `FEDAPAY_LIVE_APPROVED`, `ORDER_NOTIFICATIONS_ENABLED` | Garder les quatre à `false` avant l'étape autorisée. |

Quand les réglages de production auront été approuvés et injectés dans un environnement autorisé, exécuter `npm run payments:check -- --production-closed`. Le script affiche uniquement les noms des contrôles et leur résultat. Une réussite valide la forme et la cible de la configuration. Confirmer séparément la validité des secrets, les comptes, les conditions commerciales et les preuves réelles chez les prestataires.

## 4. Rapprocher la recette FedaPay et contrôler Resend

- Pour la transaction FedaPay `113943841`, ouvrir la fiche fournisseur avec une session autorisée ou utiliser le diagnostic staff prévu sur la recette isolée, en lecture seule. Comparer le marchand `101915`, l'environnement Live, le montant de 100 XOF, la devise et les références de commande et de paiement. En recette, l'état observé est `pending`, la commande est liée, une réservation est comptabilisée et aucun lien de checkout n'est enregistré. Tant que le fournisseur ne confirme pas l'état, conserver cette réservation. Appliquer un état confirmé uniquement par le rapprochement normal de la recette, après rapprochement des références. Les états en attente, refusé et annulé restent compatibles avec une reprise. Une expiration confirmée peut libérer la réservation une seule fois. Contrôler l'historique des mouvements et le statut de la commande après traitement.
- Resend : associer un webhook de l'environnement concerné à `/api/notifications/resend`. Utiliser son secret propre et vérifier la signature, l'événement de livraison, le rapprochement avec l'identifiant du message et le rejeu du même événement. Tester ensuite le circuit de démonstration avec une adresse fictive expressément autorisée et les données de démonstration. Confirmer dans le journal qu'une relance garde sa clé et qu'un conflit de contenu est bloqué. Après le test, remettre le mode de démonstration à l'arrêt.

## 5. Test réel sur autorisation, puis ouverture distincte

1. Consigner le montant maximal, le compte marchand, la référence et la personne autorisée pour une seule transaction. Utiliser le parcours privé isolé prévu à cet effet. L'admission publique en production reste fermée. Si la recette privée ou son autorisation n'est plus utilisable, arrêter et préparer une nouvelle validation.
2. Après le test autorisé, rapprocher côté fournisseur et côté base la commande, le montant, un seul mouvement de stock par étape et le résultat e-mail. Conserver les preuves sans secrets ni données personnelles.
3. Sur feu vert public distinct, activer d'abord le traitement des paiements avec le checkout fermé, vérifier le webhook et la maintenance, puis activer les notifications et l'admission publique selon la fenêtre validée. Contrôler la première commande et son montant, le stock et la notification.

## 6. Revenir à l'état fermé

En cas d'incident après ouverture, couper d'abord `PAYMENT_CHECKOUT_ENABLED` et redéployer avec la configuration corrigée. Vérifier le panier et le refus côté serveur. Si FedaPay est sain, garder le traitement actif pour rapprocher les commandes existantes. Si le traitement fournisseur pose problème, suspendre `FEDAPAY_ENABLED` et faire rapprocher les paiements par l'équipe autorisée avant reprise. Couper les notifications si elles sont affectées. Un retour à un build antérieur n'est sûr que si les interrupteurs effectifs de ce déploiement ont été vérifiés. Conserver toutes les commandes et leurs réservations. Une restauration de données fait l'objet d'une décision séparée.

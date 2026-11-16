# 05 — Traitement des commandes

## Trouver une commande
Rubrique **Commandes**.
- **Référence ou client** : référence (`MDP-…`), nom ou téléphone.
- **Préparation**, **Paiement**, **Du (UTC)** / **Au (UTC)**, **Tri**, puis **Filtrer**. **Réinitialiser** efface les filtres.
- La liste affiche 20 commandes par page : **← Précédentes** / **Suivantes →**.

Chaque carte montre la référence, la date, le client, le nombre d'articles, le montant, puis **Paiement**, **Préparation** et **Notifications**.

## Lire la fiche
**Ouvrir la commande** affiche :
- **Informations générales** : référence, date, client, téléphone, e-mail, livraison, instructions ;
- **Articles** : photo, variante, taille, quantité, prix unitaire, total, puis sous-total, livraison et total. Ces prix sont ceux du jour de la commande ;
- **Paiement** : fournisseur, identifiant FedaPay, montant, statut, confirmation, historique ;
- **Notifications** : e-mails envoyés et leur état ;
- **Journal de la commande** : qui a fait quoi, et quand.

## Faire avancer une commande
Les boutons proposés dépendent de l'étape en cours :

| Étape actuelle | Bouton | Étape suivante |
|---|---|---|
| En attente | **Prendre en charge** | Prise en charge |
| Prise en charge | **Passer en préparation** | En préparation |
| En préparation | **Marquer comme prête** | Prête |
| Prête | **Marquer comme livrée** | Livrée |
| Toute étape non terminée | **Refuser / annuler** | Refusée / annulée |

On ne peut pas sauter une étape. « Marquer comme prête » et « Marquer comme livrée » envoient un e-mail à l'équipe, et au client s'il a accepté d'être informé.

## Commande payée en ligne : la règle
Une commande payée en ligne ne peut être préparée que si la fiche indique **Paiement confirmé**. Sinon la fiche affiche « Traitement bloqué » et aucun bouton n'apparaît. **Aucun bouton ne permet de déclarer une commande payée** : seule la confirmation de FedaPay le fait.

Ne jamais remettre une commande sur la seule foi d'une capture d'écran du client.

## Annuler
**Refuser / annuler** est définitif dans l'administration. Pour une commande déjà payée, l'annulation ne rembourse pas le client : prévenir l'administrateur avant de cliquer.

## Anomalies à signaler
- **INTERVENTION REQUISE** : paiement arrivé après expiration ou stock insuffisant.
- **Données incohérentes** : les montants enregistrés ne concordent pas ; les e-mails de cette commande sont bloqués.
- Une commande reste « Paiement en attente » plus d'une heure.

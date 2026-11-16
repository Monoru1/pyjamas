# 07 — Notifications

Les notifications sont des e-mails. Il n'y a pas d'envoi par WhatsApp ni par SMS.

## Qui reçoit quoi
| Événement | Équipe | Client (s'il a donné son accord) |
|---|---|---|
| Nouvelle commande en attente de paiement | Oui | Non |
| Paiement confirmé | Oui | Confirmation de commande |
| Paiement refusé | Oui | Oui |
| Commande prête | Oui | Oui |
| Commande livrée | Oui | Oui |

Un même événement n'envoie jamais deux fois le même e-mail. Une commande apparaît dans l'administration même si aucun e-mail n'est parti.

## Lire l'état d'un envoi
Sur la fiche d'une commande, bloc **Notifications**, ou dans **Paiements & envois → Historique des notifications**.

| État | Signification |
|---|---|
| En attente | L'envoi est programmé |
| En cours | L'envoi est en train de partir |
| Accepté par Resend | Le prestataire d'e-mails a pris le message. Il n'est pas encore prouvé qu'il soit arrivé |
| Livré | Le prestataire a confirmé la remise dans la boîte du destinataire |
| Livraison retardée | La boîte du destinataire ne répond pas encore |
| Rejeté par le destinataire | Adresse inexistante ou boîte pleine |
| Signalé comme indésirable | Le destinataire a marqué l'e-mail comme spam |
| Échec | L'envoi n'a pas pu se faire |

## Relancer
Le bouton **Relancer** (fiche commande) ou **Relancer cette notification** (Paiements & envois) n'apparaît que sur un envoi en attente ou en échec. La relance est refusée si l'e-mail a déjà été accepté, si une relance a été faite il y a moins d'une minute, ou si l'envoi est trop ancien pour être rejoué sans risque de doublon. Chaque relance est enregistrée avec le compte qui l'a faite.

Si la relance échoue encore : appeler ou écrire au client par le contact habituel de la boutique, et prévenir l'administrateur.

## Prévisualiser un e-mail
**Paiements & envois → Prévisualiser les e-mails** : choisir un **Modèle**, puis **Afficher**. Les données sont fictives. Depuis une commande, cliquer sur le nom d'un envoi affiche le même modèle avec les données de cette commande, à l'écran seulement.

Le bouton **Envoyer ce modèle à l'adresse de test**, quand il est présent, n'envoie que des données fictives à l'adresse de test de la boutique.

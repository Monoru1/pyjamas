# 06 — Paiements et incidents FedaPay

FedaPay encaisse les paiements. La boutique n'a pas accès aux numéros de carte ou de mobile money des clients.

## Où regarder
- **Sur la fiche d'une commande**, bloc **Paiement** : identifiant FedaPay, montant, statut, date de confirmation, historique des événements.
- **Paiements & envois** : tableau **Transactions** (filtres **Statut** et **Date (UTC)**) et **Derniers événements vérifiés**.

## Ce que signifient les états
| Affichage | Signification | Que faire |
|---|---|---|
| Paiement confirmé | FedaPay a confirmé l'encaissement | Préparer la commande |
| Paiement en attente | Le client n'a pas terminé, ou FedaPay n'a pas encore répondu | Attendre. Ne rien remettre |
| Paiement refusé | Le paiement a échoué | Le client peut réessayer depuis le site |
| Paiement annulé / expiré | Abandon ou délai dépassé | Le stock réservé revient à la vente |
| Sans paiement en ligne | Ancienne demande passée hors paiement en ligne | Traitement manuel habituel |

La page que voit le client après son paiement ne prouve rien : seule la confirmation reçue par le serveur compte.

## Incidents courants
**« J'ai payé mais ma commande n'est pas confirmée. »**
1. Ouvrir la commande et lire le bloc **Paiement**.
2. Si « Paiement en attente » : attendre quelques minutes et actualiser. Le rapprochement est automatique.
3. Après une heure, transmettre à l'administrateur la **référence de la commande** et l'**identifiant FedaPay** affiché. Ne jamais demander au client ses codes ou ses identifiants de paiement.

**Commande marquée INTERVENTION REQUISE**
Le paiement est arrivé alors que le stock n'était plus disponible, ou après expiration. Ne pas préparer. L'administrateur décide : réapprovisionner et servir, ou organiser un remboursement.

**Client débité deux fois, demande de remboursement**
Aucun remboursement ne se fait depuis l'administration. L'administrateur le traite dans le compte FedaPay de la boutique.

**Montant différent entre la commande et le paiement**
La fiche affiche « Données incohérentes ». Ne rien remettre, prévenir l'administrateur.

## Ce que l'équipe ne fait jamais
- Déclarer une commande payée à la main : c'est impossible, et c'est voulu.
- Communiquer une clé, un mot de passe ou un accès FedaPay.
- Cliquer **Reprendre cette initialisation** sans consigne de l'administrateur : ce bouton est réservé aux essais techniques.

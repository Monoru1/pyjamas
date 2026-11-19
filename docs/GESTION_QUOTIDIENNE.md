# La Maison des Pyjamas — guide du personnel

## Accès

Ouvrir https://pyjamas25.netlify.app/admin et se connecter avec son compte personnel autorisé. Ne jamais partager son mot de passe. En cas d'oubli, utiliser **Mot de passe oublié** sur la page de connexion.

## 1. Recevoir une commande

Après un paiement confirmé par FedaPay, un e-mail « nouvelle commande à préparer » arrive sur `lamaisondespyjamas@gmail.com` et `sakryad@gmail.com`. Le client reçoit sa propre confirmation s'il a laissé son e-mail.

Ouvrir **Commandes** : la liste se met à jour seule. Ouvrir la fiche pour voir les articles, tailles, quantités, montant et coordonnées du client.

## 2. Vérifier le paiement

Ne préparer **que** les commandes affichées comme payées dans la fiche. Seul FedaPay (notification signée ou vérification automatique du serveur) peut marquer une commande payée : aucun bouton ne le permet, et c'est voulu.

Ne suffisent jamais : une capture d'écran du client, un SMS Mobile Money transféré, un retour du navigateur. Si le client affirme avoir payé et que la fiche ne l'indique pas, attendre quelques minutes (vérification automatique toutes les 5 minutes), puis consulter **Paiements** et prévenir le responsable. Une commande signalée **à vérifier** ne doit pas être remise avant contrôle.

Le client paie les frais FedaPay en plus du prix des articles : il est normal que le montant débité soit légèrement supérieur au total de la commande.

## 3. Préparer, puis « Prête »

Dans la fiche, suivre les boutons dans l'ordre : **Prendre en charge** → **Passer en préparation** → **Marquer comme prête**. Le stock a déjà été retiré au paiement : ne pas le diminuer une seconde fois.

## 4. « Livrée »

Cliquer **Marquer comme livrée** uniquement après la remise effective (retrait en boutique ou livraison faite). Le suivi client affiche alors « Paiement confirmé — Commande livrée ».

Une commande non payée ou refusée ne se prépare pas. **Refuser / annuler** ne rembourse pas le client : tout remboursement est une décision du responsable.

## 5. Répondre à un client

Les clients peuvent écrire de trois façons :

- **WhatsApp** au +229 01 97 33 88 43 : le bouton du suivi de commande et de l'e-mail de confirmation pré-remplit un message avec la référence de commande (MDP-…). Toujours retrouver la commande par cette référence.
- **Formulaire de contact** de la page de suivi : le message arrive par e-mail aux deux adresses du personnel. Répondre directement à l'e-mail ; la réponse part vers le client.
- **E-mail** à lamaisondespyjamas@gmail.com.

Ne jamais demander au client un code Mobile Money, un mot de passe ou un code reçu par SMS.

## 6. Modifier un produit ou une quantité

1. Ouvrir **Produits & stocks**. Un nouvel article est créé masqué ; ajouter photos, tailles et prix en FCFA dans **Modifier la fiche**.
2. Pour chaque taille, saisir la **Quantité en stock** (articles disponibles à vendre), puis **Enregistrer la quantité**. Après un réassort, compter le total réellement disponible et saisir ce total.
3. Si la page signale une autre modification ou vente entre-temps, actualiser, vérifier le nouveau chiffre et recommencer. Ne pas forcer l'ancienne valeur.
4. Cocher **En ligne** seulement quand la fiche est complète. À zéro, une taille devient indisponible. **Historique des quantités** garde la trace des changements.

Les prix et quantités se changent uniquement après validation du responsable.

## 7. Problème de paiement

- Client débité mais commande non payée après 15 minutes : noter la référence, l'heure et le numéro Mobile Money, prévenir le responsable. Ne rien modifier à la main.
- Paiement refusé ou abandonné : la réservation se libère seule ; le client peut recommencer.
- Incident général : le responsable coupe `PAYMENT_CHECKOUT_ENABLED` et redéploie. Les nouvelles ventes s'arrêtent, le suivi et la confirmation des paiements déjà engagés continuent. Ne supprimer ni commande, ni réservation, ni historique.

## 8. Problème d'e-mail

Dans la fiche commande, **Accepté par Resend** signifie que l'envoi est parti ; **Livré** signifie que la messagerie du destinataire l'a reçu (pas qu'il l'a lu, ni qu'il n'est pas en indésirables). Un échec technique est réessayé automatiquement. Ne jamais renvoyer un second message à la main. Si un client ne trouve pas sa confirmation : lui faire vérifier les indésirables, puis lui envoyer le lien de suivi ou répondre sur WhatsApp.

## Points encore à décider par le responsable

Frais et zones de livraison, conditions de retour/échange/remboursement et durées de conservation des données ne sont pas encore fixés. En attendant, ne rien promettre au client sur ces sujets : transmettre au responsable.

# La Maison des Pyjamas — guide du personnel

## Accès

Ouvrir https://pyjamas25.netlify.app/admin et utiliser son compte personnel autorisé. La production possède actuellement un seul administrateur actif. Ne jamais partager son mot de passe. Une connexion réelle doit être validée avant la remise de la boutique.

## Produits et quantités

1. Ouvrir **Produits & stocks**. Ajouter un article avec son nom, sa description, son prix et ses tailles. La fiche est créée masquée.
2. Ajouter les photos dans **Modifier la fiche** et choisir la couverture. Vérifier les tailles et les prix en FCFA.
3. Pour chaque taille, saisir la **Quantité en stock**, puis **Enregistrer la quantité**. Ce champ représente les articles disponibles à vendre ; les articles déjà commandés restent protégés. Après une nouvelle livraison, compter le total disponible et saisir ce total.
4. Si une autre vente ou modification est intervenue, actualiser la page, vérifier le nouveau chiffre et recommencer. Ne pas forcer l’ancienne quantité.
5. Cocher **En ligne** quand la fiche est complète. À zéro, une taille devient indisponible. **Ajouter une taille** permet de créer une taille supplémentaire avec son prix et sa quantité. **Historique des quantités** conserve les changements.

## Commandes

1. Ouvrir **Commandes** et filtrer sur les commandes payées. Ouvrir la fiche pour consulter les articles, tailles, quantités et coordonnées du client.
2. Préparer uniquement après affichage du paiement confirmé. Un retour du navigateur ou une capture du client ne suffit pas. Une anomalie signalée sur la fiche exige une vérification avant remise.
3. Suivre les étapes proposées : confirmer, préparer, prête, puis remise/livrée. Marquer la remise uniquement après le retrait ou la livraison effective. Le stock a déjà été pris en compte ; ne pas le diminuer une seconde fois.
4. Une commande non payée ou refusée ne doit pas être préparée. Ne pas modifier manuellement son état de paiement.

## E-mails

Après paiement confirmé, le client ayant choisi l’e-mail reçoit sa confirmation et le personnel reçoit une alerte à préparer. Les commandes abandonnées et les changements de préparation ne déclenchent aucun message.

Le destinataire opérationnel configuré est celui du seul administrateur actif : `sakryad@gmail.com`. Faire modifier ce réglage par le responsable si la boutique utilise une boîte partagée.

Dans la fiche commande, **Accepté par Resend** signifie que le prestataire a accepté l’envoi. **Livré** signifie qu’un événement de livraison a été reçu. Cela ne prouve pas la lecture ni le placement dans la boîte principale. En cas d’échec technique, la file réessaie automatiquement. Une alerte bloquée doit être contrôlée avant toute relance manuelle ; ne jamais créer un second message à la main.

## Incident et fermeture

Prévenir le responsable. Il coupe `PAYMENT_CHECKOUT_ENABLED` et redéploie pour suspendre les nouvelles commandes. Les paiements déjà engagés doivent continuer à être rapprochés quand le prestataire fonctionne. Ne supprimer ni commande, ni réservation, ni historique. Le responsable peut restaurer le déploiement Netlify précédent après vérification de ses interrupteurs effectifs ; une restauration de base exige une décision séparée.

## Avant ouverture

Les ventes, paiements publics et notifications restent fermés. Il faut valider les secrets de production, une connexion administrateur, le catalogue physique, les conditions de livraison et un test financier réel expressément autorisé. Le parcours de test courant est la PR #21 sur la base de recette isolée, limité à 100 FCFA et réservé au personnel. L’autorisation du test et l’accord d’ouverture sont deux décisions distinctes.

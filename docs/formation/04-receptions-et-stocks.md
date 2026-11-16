# 04 — Réceptions physiques et stocks

La boutique vend ses propres marchandises. Le stock de l'administration doit refléter ce qui est réellement en boutique.

## Lire le stock
Dans **Produits & stocks**, chaque taille affiche :
- **Disponible** : ce qui peut encore être vendu sur le site ;
- **Réservé** : des unités retenues par un paiement en cours ou une commande à remettre.

Une réservation diminue le disponible dès que le client lance son paiement. Si le paiement n'aboutit pas, l'unité revient au disponible une fois l'échec confirmé par FedaPay. « État du stock indisponible. » signale un problème de lecture : actualiser, puis prévenir l'administrateur.

## Enregistrer une livraison reçue
Bloc **Réceptionner des marchandises**, sur la taille reçue.
1. Compter les pièces reçues.
2. Saisir **Quantité reçue**.
3. Saisir **Référence de réception** : par exemple « Livraison du 16/11/2026 — bon n° 12 ».
4. Cliquer **Valider la réception**.

La quantité **s'ajoute** au disponible. Une même référence ne peut être utilisée qu'une fois par taille : cela empêche d'enregistrer deux fois la même livraison. Pour une livraison qui couvre plusieurs tailles, répéter l'opération sur chaque taille avec la même référence.

## Recevoir une taille qui n'existe pas encore
Bloc **Réceptionner une nouvelle taille** : choisir la **Taille** (ou **Unique**), le prix, la quantité et la référence. La taille est créée puis créditée.

## Corriger une quantité (inventaire)
Bloc **Corriger une quantité**.
1. Compter le rayon.
2. Saisir le **Stock disponible corrigé** : c'est la quantité réelle, pas la différence.
3. Saisir le **Motif de la correction** : « Inventaire du 20/11 », « Pièce abîmée », « Retour client validé ».
4. Cliquer **Enregistrer la correction**.

Si le stock a changé pendant la saisie (vente, autre collègue), l'opération est refusée : actualiser et recompter.

## Historique
**Derniers mouvements du personnel** liste les réceptions et corrections avec leur motif. Un mouvement ne s'efface pas : une erreur se rattrape par une nouvelle correction motivée.

## Règles
- Une réception correspond toujours à une livraison physique comptée. Jamais de réception « pour tester ».
- Une correction a toujours un motif compréhensible par quelqu'un d'autre.
- Les mouvements marqués « PROVISOIRE V1 » sont le stock de départ décidé le 16 novembre 2026 ; ils doivent être remplacés par un inventaire réel.

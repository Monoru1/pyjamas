# Prix officiels Noël 2026 — intégration du 20/11/2026

Grille validée par la boutique (identique pour les 4 modèles) : Bébé 3–12 mois 8 000 · Enfant 2–5 ans 10 000 · Enfant 6–10 ans 12 000 · Enfant 12–14 ans 15 000 · Femme S–3XL 20 000 · Homme S–3XL 20 000 FCFA.

Sauvegarde avant modification : `docs/catalogue-backup-2026-11-20.csv` (ID, SKU, prix, stock des 34 variantes).

## Rapprochement (vérifié sur les photos des fiches)

| Modèle officiel | Fiche existante | Indice |
|---|---|---|
| Carrelé rouge | Pyjama Noël — carreaux rouges + Pyjama bébé Noël — carreaux rouges | pantalon à carreaux rouges |
| Carrelé vert | Pyjama Noël — carreaux bleus | haut vert, pantalon tartan vert/bleu |
| Stitch | Pyjama Noël — bleu renne | imprimé Stitch sur le haut |
| Voiture de Noël | Pyjama Noël — imprimé festif | voiture rouge portant le sapin |

## Prix appliqués (back-office, formulaire « Enregistrer le prix », stock non modifié)

- `LMP-N-CARREAUX-ROUGES-{S,M,L,XL,XXL,3XL}` : 25 000 → 20 000
- `LMP-N-CARREAUX-BLEUS-{S,M,L,XL,XXL,3XL}` : 25 000 → 20 000
- `LMP-N-BLEU-RENNE-{S,M,L,XL,XXL,3XL}` : 28 000 → 20 000
- `LMP-N-IMPRIME-FESTIF-*` : déjà 20 000, inchangé
- `LMP-N-BEBE-CARREAUX-ROUGES-{03-06M,06-09M,09-12M}` : 10 000 → 8 000

Les tailles S–3XL existantes sont uniques (pas de distinction Femme/Homme) ; le prix étant le même, aucune variante n'a été créée.

## Non rapproché — décision nécessaire

- Bébé 12–18 et 18–24 mois (Carrelé rouge) : hors grille (8 000 s'arrête à 12 mois, 10 000 commence à 2 ans). Laissés à 10 000.
- Tailles Enfant 2–5, 6–10, 12–14 ans : aucune variante n'existe. Il faut le découpage exact des tailles et le stock réel avant création.
- Tailles Bébé pour Carrelé vert, Stitch et Voiture de Noël : n'existent pas.
- Hors périmètre, inchangés : Velours Bordeaux (masqué), Coffret cadeau Noël, Coffret cadeau premium (masqué).

Contrôles : 34 variantes relues après modification, stocks identiques à la sauvegarde ; fiches publiques à 20 000 / 8 000 ; devis serveur d'un panier de 7 articles = 118 000 FCFA exact.

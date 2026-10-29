# Activation FedaPay — compte marchand Live confirmé

Mise à jour du 29 octobre 2026. Le client confirme un compte Business en Live avec accès aux clés API. Cela ne prouve pas que les secrets sont renseignés dans Netlify ni que les transactions ont été testées.

## Architecture réelle et flux

Next.js 16 App Router, routes Node exécutées par l’adaptateur Next.js de Netlify, Supabase PostgreSQL/SSR et panier Zustand. La PR #11 implémente déjà le checkout dynamique ; aucune page de paiement statique n’est créée.

1. `POST /api/payments/checkout` valide le panier et les coordonnées.
2. La RPC `create_shop_payment` relit prix, devise et stock, puis crée atomiquement commande, articles, paiement et réservation.
3. Le serveur appelle `POST /v1/transactions`, puis `POST /v1/transactions/{id}/token` avec sa clé secrète.
4. Le client est redirigé vers le lien de cette transaction.
5. `POST /api/payments/webhook` vérifie signature, idempotence et état réel via GET FedaPay avant de confirmer.
6. `/paiement?reference=<jeton public>` affiche le suivi serveur sans jamais croire un statut ajouté à l’URL.
7. La réconciliation et la file de notifications reprennent les traitements différés.

## OAuth et clé publique

**Aucune application OAuth nécessaire pour ce flux du propre compte marchand.** Les références officielles montrent l’authentification par clé API secrète/Bearer. La boutique ne demande pas d’autorisation déléguée sur des comptes de marchands tiers : aucun client ID, client secret OAuth ou redirect URI OAuth n’est à créer.

La clé publique FedaPay n’est pas utilisée par cette intégration à redirection et création serveur ; ne pas l’ajouter au JavaScript sans besoin. La clé secrète FedaPay et la clé service Supabase restent exclusivement côté serveur.

Sources officielles vérifiées :

- https://docs.fedapay.com/fr/integration-api/authentication
- https://docs.fedapay.com/api-reference/transactions/create
- https://docs.fedapay.com/api-reference/transactions/create-token
- https://docs.fedapay.com/fr/integration-api/webhooks

## URL exactes

| Environnement FedaPay | URL du webhook (POST HTTPS) | État |
|---|---|---|
| Sandbox | `https://deploy-preview-11--pyjamas25.netlify.app/api/payments/webhook` | Code déployé en preview ; traitement bloqué tant que configuration et base isolée manquent |
| Live | `https://pyjamas25.netlify.app/api/payments/webhook` | URL définitive du domaine actuel ; nouvelle implémentation pas encore déployée en production |

Le secret de webhook est créé par FedaPay pour l’endpoint correspondant : le saisir dans `FEDAPAY_WEBHOOK_SECRET`, séparément pour sandbox et live. Un endpoint encore désactivé peut répondre 503 ; ne pas lancer d’essai de collecte avant configuration, migration et déploiement. Activer/contrôler le webhook lors du passage en Live afin d’éviter les échecs répétés et sa désactivation automatique.

Le callback navigateur est distinct du webhook : `https://pyjamas25.netlify.app/paiement?reference=<jeton généré par le serveur>`. FedaPay gère son retour/annulation avec le callback documenté. Aucun `cancel_url` ni URL OAuth n’est inventé.

## Préparation Netlify et état des accès

Deux modèles sans secrets sont versionnés :

- `config/fedapay/netlify-production.env.example` : valeurs à saisir uniquement dans le contexte production.
- `config/fedapay/netlify-sandbox.env.example` : valeurs de recette dans le contexte deploy-preview et projet Supabase isolé.

Les secrets doivent utiliser le stockage chiffré et le scope Functions. Les variables publiques Supabase doivent être disponibles au build et dans Functions. Ne pas envoyer les clés par commentaire GitHub, commit ou URL. Aucun fichier complété ne doit être versionné.

**Tentative de préparation des variables non secrètes via le connecteur Netlify : refus API 403. Aucune variable n’a été modifiée.** Les seules variables effectivement observées restent les deux variables publiques Supabase. La disponibilité des clés dans le dashboard FedaPay n’est donc pas confondue avec leur installation côté serveur.

## Contrôle de configuration sans paiement

Après configuration dans un environnement serveur sécurisé :

```bash
npm run payments:check -- --sandbox
npm run payments:check -- --live
```

Le script ne contacte aucun service, ne crée aucune transaction, ne modifie aucune base et n’affiche aucune valeur de variable. Il retourne les noms des vérifications bloquantes. Un code de sortie 1 est attendu tant que les secrets manquent ou que l’activation est volontairement désactivée. Un résultat « configuration ready » ne prouve ni un paiement fournisseur réussi ni une validation commerciale.

Les modèles restent avec `FEDAPAY_ENABLED=false`, `PAYMENT_CHECKOUT_ENABLED=false` et `FEDAPAY_LIVE_APPROVED=false`. En recette isolée uniquement, activer les deux premiers drapeaux après configuration et migration ; conserver le troisième à false. Le Live exige le contexte production, une clé live, l’approbation finale et les deux premiers drapeaux actifs.

## Recette et passage contrôlé

1. Créer/configurer une base de recette isolée avec le schéma réel et un compte staff de test ; vérifier l’historique avant d’appliquer la migration `20261029093122_fedapay_commerce.sql`.
2. Renseigner les secrets sandbox et l’identifiant marchand sandbox ; configurer le webhook sandbox et redéployer la preview. Ne jamais utiliser la clé Live pour un test sandbox.
3. Exécuter les vrais essais sandbox (réussite, refus, annulation, attente, expiration), double livraison de webhook, retour avant confirmation, réconciliation et notifications ; conserver les IDs de preuve sans secrets. Les tests automatisés ne remplacent pas cette étape.
4. Valider prix, stock physique, frais/zones de livraison et textes commerciaux. Le compte Business Live confirme l’accès marchand, pas ces éléments.
5. Obtenir la validation finale de déploiement. Sauvegarder, appliquer la migration validée puis déployer avec les paiements désactivés ; renseigner les secrets live et enregistrer l’URL Live ci-dessus.
6. Après autorisation explicite d’activation, ouvrir les checkouts. **Aucun paiement réel ne doit être lancé sans validation explicite de la transaction.** Vérifier ensuite fournisseur, commande, stock et logs avant de déclarer la boutique opérationnelle.
7. Si les ventes doivent être suspendues, couper `PAYMENT_CHECKOUT_ENABLED` tout en gardant le traitement des paiements engagés actif. Ne pas libérer un stock dont le paiement est encore incertain.

PR existante complétée : https://github.com/Monoru1/pyjamas/pull/11. Le rapport technique détaillé reste `docs/FEDAPAY_READINESS_2026-10-29.md`.

## Validation de ce complément

- `npm run lint` et `npm run typecheck` : réussis.
- `npm test -- --run` : **84 tests réussis dans 13 fichiers**, dont trois nouveaux contrôles du vérificateur de configuration (isolation, approbation Live, non-divulgation des secrets).
- `npm run build` : build Next.js réel réussi.
- `npm run payments:check -- --live` avec la configuration actuellement disponible : sortie 1 / NO-GO attendu, liste des paramètres manquants sans leurs valeurs.
- Aucun appel API FedaPay, aucun paiement réel et aucune migration de production exécutés pour ce complément. Les véritables essais sandbox restent bloqués par la configuration et la base isolée.

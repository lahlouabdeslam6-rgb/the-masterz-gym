# Workflows cibles

Ces parcours décrivent les frontières fonctionnelles sans créer d'API dans cette phase.

## Vente d'un abonnement — Phase 2

1. La réception identifie ou crée le membre.
2. Le système charge la formule et ses règles courantes.
3. Le service calcule l'instantané contractuel et le montant dû.
4. Une transaction enregistre souscription, paiement et reçu.
5. La demande éventuelle passe à « convertie » et les audits sont écrits dans la même transaction.

## Check-in

1. La réception identifie le membre.
2. Le service vérifie statut, validité et règles d'accès à l'heure courante.
3. La présence acceptée ou refusée est enregistrée avec son motif.
4. Un doublon dans la fenêtre configurée est empêché ; toute exception exige un motif audité.

## Réservation coaching ou recovery

1. Le client choisit une prestation et un créneau disponible.
2. Le service vérifie les règles, conflits, capacité et éligibilité ou solde.
3. Une transaction verrouille la ressource et crée la réservation.
4. Confirmation et rappels sont programmés après validation.
5. Annulation, absence ou réalisation appliquent la politique configurée et ajustent le solde atomiquement.

## Commande Healthy Cafe

1. L'employé compose une commande depuis le catalogue actif.
2. Le service vérifie prix applicables et stock.
3. Une transaction crée commande, lignes, paiement éventuel et mouvements de stock.
4. L'annulation crée des mouvements compensatoires, jamais une réécriture silencieuse.

## Dépense

1. Un utilisateur autorisé saisit montant, catégorie, date et justificatif.
2. Le service valide les règles comptables configurées.
3. La dépense est enregistrée et auditée ; toute correction conserve l'historique.

## Publication du site public

1. L'admin prépare contenu et paramètres.
2. Une validation empêche les contenus incomplets ou invalides.
3. La publication rend une version active et conserve l'historique éditorial.

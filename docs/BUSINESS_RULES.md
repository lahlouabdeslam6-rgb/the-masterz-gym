# Règles métier de référence

Ce document recense les règles à confirmer avant implémentation. Il ne constitue pas encore une configuration active.

## Principes obligatoires

- Aucun tarif, horaire, délai d'annulation ou capacité n'est codé en dur.
- Toute règle configurable possède une période de validité et, si nécessaire, un historique.
- Les opérations financières, de réservation, de stock et de packs sont atomiques et traçables.
- Les dates limites sont calculées dans le fuseau configuré de la salle.
- Les suppressions de données sensibles privilégient archivage ou annulation explicite.

## Abonnements et paiements

- Une formule définit ses prestations, durée, prix et conditions au moment de la vente.
- Une souscription conserve un instantané contractuel afin qu'un changement de formule ne réécrive pas l'historique.
- Un paiement validé produit un reçu numéroté ; annulation et remboursement sont des opérations distinctes et auditées.
- L'activation, le gel, le renouvellement et la résiliation suivent des politiques administrables.

## Présence et réservations

- L'éligibilité d'un accès dépend de la souscription et des règles valides à l'instant du contrôle.
- Une réservation vérifie simultanément disponibilité, capacité, éligibilité et éventuel solde de pack.
- Une place ou unité de pack n'est consommée qu'une fois ; annulation et absence suivent une politique configurable.
- Les conflits de réservation sont empêchés en transaction, y compris en cas de requêtes concurrentes.

## Coaching, recovery et mesures

- Disponibilités, durées, capacités et tarifs sont administrables.
- Les mesures corporelles sont des données privées, accessibles uniquement selon les permissions prévues.
- Les programmes sont versionnés ou historisés pour préserver le suivi du membre.

## Café et finance

- Chaque vente ou correction de stock crée des mouvements explicites ; le stock ne doit pas être modifié sans motif.
- Les seuils, unités, prix et taxes éventuelles sont configurables.
- Les dépenses conservent catégorie, date, montant, justificatif éventuel et auteur.

## Notifications et audit

- Une notification est idempotente, localisable et liée à une préférence de canal.
- Les actions sensibles futures incluent au minimum connexions, permissions, paiements, remboursements, réservations, stock, packs et paramètres.


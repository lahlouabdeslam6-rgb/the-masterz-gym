# Instructions pour les agents

## Périmètre

- Codex peut travailler sur l'ensemble du dépôt.
- Un agent spécialisé en design frontend peut uniquement modifier `apps/web` et `packages/ui`.
- L'architecture reste un monolithe modulaire. Ne pas créer de microservices.

## Contrats et responsabilités

- Le contrat OpenAPI du backend est la source de vérité.
- Les agents ne doivent jamais inventer de routes API. Toute nouvelle route doit être définie et validée côté backend avant son utilisation frontend.
- Les types du client frontend seront générés depuis le contrat OpenAPI FastAPI.
- Les routeurs FastAPI restent minces : logique métier dans les services, accès aux données dans les repositories.
- Utiliser des transactions PostgreSQL pour les paiements, réservations, mouvements de stock et packs recovery.
- Aucun prix, horaire, délai d'annulation ou capacité ne doit être codé en dur.
- Utiliser des dates et heures conscientes du fuseau horaire.
- Toute opération sensible devra produire une trace d'audit dans une phase ultérieure.

## Qualité

- Chaque phase doit exécuter les tests et contrôles de qualité concernés avant d'être déclarée terminée.
- Ne jamais ajouter de secrets ou d'identifiants de production.
- Préserver le périmètre de la phase : ne pas implémenter prématurément les modules métier.


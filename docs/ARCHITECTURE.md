# Architecture

## Style retenu

Le système est un **monolithe modulaire** : une API déployable, un frontend et un worker, partageant un modèle métier cohérent. Les limites de modules organisent le code sans introduire de réseau interne ni de microservices.

```text
apps/web  -> HTTP/OpenAPI -> apps/api -> PostgreSQL
                              |
                              +-------> Redis -> apps/worker
packages/api-client <- génération OpenAPI
packages/ui         <- composants visuels partagés
```

## Frontend

`apps/web` utilise Next.js, TypeScript et Tailwind CSS. Les appels API passeront par `packages/api-client`, généré depuis l'OpenAPI backend. Le frontend ne redéfinit pas manuellement les DTO ni les endpoints.

## Backend

Chaque module sous `apps/api/app/modules` est structuré progressivement autour de :

- `router.py` : transport HTTP, validation d'entrée et codes de réponse uniquement ;
- `schemas.py` : modèles d'entrée/sortie ;
- `service.py` : cas d'usage et règles métier ;
- `repository.py` : requêtes SQLAlchemy et persistance ;
- `models.py` : modèles de données du module.

Les routers ne contiennent pas de logique métier. Les services orchestrent les repositories au sein d'une transaction fournie par l'application.

## Transactions et cohérence

Paiements, réservations, consommations de packs et mouvements de stock s'exécutent dans des transactions PostgreSQL atomiques. Les écritures concurrentes utiliseront contraintes, verrouillage ou contrôle de version selon le cas. Les jobs asynchrones sont déclenchés après validation de la transaction, avec une stratégie idempotente à définir.

## Configuration

La configuration technique provient de l'environnement. Les prix, horaires, capacités et délais d'annulation seront stockés en base et administrables. Aucun secret de production n'est versionné.

## Temps, observabilité et audit

Les instants sont timezone-aware et stockés en UTC ; le fuseau IANA de la salle pilote l'affichage et les règles locales. Une future couche d'audit enregistrera acteur, action, cible, horodatage, résultat et changements pertinents sans exposer de secrets.

## Évolution

Les migrations sont gérées par Alembic. L'OpenAPI versionnée gouverne la compatibilité. L'extraction en service séparé n'est envisagée que si des contraintes opérationnelles mesurées la justifient ; elle n'est pas prévue actuellement.


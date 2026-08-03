# Contrat API

## Principes

- Base versionnée : `/api/v1`.
- OpenAPI généré par FastAPI est la source de vérité.
- Swagger UI est disponible sur `/docs` en environnement local.
- Les clients TypeScript seront générés dans `packages/api-client` ; aucun endpoint ou DTO ne doit être inventé côté frontend.
- JSON utilise des noms de champs en `snake_case` tant qu'aucune convention différente n'est décidée.
- Les dates/heures sont des chaînes ISO 8601 avec décalage ou `Z`.
- Les futures erreurs utiliseront une enveloppe stable avec code machine, message français, détails et identifiant de corrélation.

## Endpoint disponible

### `GET /api/v1/health`

Vérifie que le processus API répond. Ce contrôle ne promet pas encore la disponibilité des dépendances.

Réponse `200 OK` :

```json
{
  "status": "ok",
  "service": "masterz-gym-api"
}
```

## Endpoints futurs

Aucun autre endpoint n'est contracté pendant cette phase. Les modules seront ajoutés au contrat uniquement après définition des cas d'usage, permissions, règles métier, schémas et codes d'erreur.

## Compatibilité

Les changements additifs restent dans `v1`. Une rupture de contrat nécessite une stratégie de migration et, si indispensable, une nouvelle version majeure de l'API.


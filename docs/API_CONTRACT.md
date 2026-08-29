# Contrat API

## Principes

- Base versionnée : `/api/v1`.
- OpenAPI généré par FastAPI est la source de vérité.
- Swagger UI est disponible sur `/docs` en environnement local.
- Les clients TypeScript seront générés dans `packages/api-client` ; aucun endpoint ou DTO ne doit être inventé côté frontend.
- JSON utilise des noms de champs en `snake_case` tant qu'aucune convention différente n'est décidée.
- Les dates/heures sont des chaînes ISO 8601 avec décalage ou `Z`.
- Les futures erreurs utiliseront une enveloppe stable avec code machine, message français, détails et identifiant de corrélation.

## Endpoints Phase 2

### `GET /api/v1/health`

Vérifie que le processus API répond. Ce contrôle ne promet pas encore la disponibilité des dépendances.

Réponse `200 OK` :

```json
{
  "status": "ok",
  "service": "masterz-gym-api"
}
```

Le détail des corps, réponses et codes est généré dans Swagger. Les groupes contractés
sous `/api/v1` sont :

| Groupe | Endpoints |
|---|---|
| Santé | `GET /health` |
| Auth | `POST /auth/login`, `/refresh`, `/logout`, demandes et confirmations de reset/activation |
| Utilisateurs | `GET /users/me`, `GET/POST /users`, `PATCH /users/{id}/role-status` |
| Demandes | `POST/GET /membership-applications`, consultation et revue |
| Formules | `GET/POST /membership-plans`, modification et paramètres administrables |
| Abonnements | historique membre, changement de statut et événements |
| Paiements | `POST /payments/memberships`, `GET /payments/receipts/{id}` |
| Présences | recherche membre et `POST /attendance/check-ins` |
| Analytique Admin | `GET /admin/analytics/dashboard` pour les KPI et graphes de pilotage |
| Audit | `GET /audit-logs` pour l'admin |

`packages/api-client/openapi.json` est un export du contrat FastAPI et
`packages/api-client/src/schema.d.ts` est généré par `openapi-typescript`. Le frontend
ne définit aucun DTO ou chemin manuellement.

## Hors périmètre

Aucun endpoint café, finance avancée ou intelligence artificielle n'est contracté
dans cette phase.

## Compatibilité

Les changements additifs restent dans `v1`. Une rupture de contrat nécessite une stratégie de migration et, si indispensable, une nouvelle version majeure de l'API.

# Schéma de données

La migration `714b8fb996a5` matérialise les tables Phase 2 suivantes dans PostgreSQL :

- `users`, `refresh_sessions`, `otp_challenges` ;
- `membership_applications`, `membership_plans`, `system_settings` ;
- `subscriptions`, `subscription_events` ;
- `payments`, `receipts` ;
- `attendances`, `audit_logs`.

Les prix sont des `NUMERIC(12,2)`, les identifiants des UUID et les instants des
`TIMESTAMPTZ`. Les formules sont copiées dans l'abonnement pour préserver le contrat
historique. L'idempotence paiement, les numéros de téléphone, membre et reçu sont
protégés par des contraintes uniques.

Les entités ci-dessous restent la cible conceptuelle globale ; seules celles listées
ci-dessus sont implémentées à ce stade.

| Domaine | Entités prévues | Relations principales |
|---|---|---|
| Identité | User, Role, Permission, UserRole, OTPChallenge, Session | un utilisateur possède plusieurs rôles |
| Membres | MemberProfile, RecoveryClientProfile | profils liés à un utilisateur ou contact |
| Abonnements | MembershipPlan, PlanVersion, Subscription, SubscriptionEvent | une souscription référence un instantané de formule |
| Paiements | Payment, PaymentAllocation, Receipt, Refund | reçus et remboursements rattachés aux paiements |
| Présence | Attendance, AccessDecision | présence liée au membre et à la décision d'accès |
| Coaching | CoachProfile, CoachAvailability, CoachingService, CoachingReservation | réservation liée à coach, client et créneau |
| Suivi | TrainingProgram, ProgramVersion, ExercisePrescription, BodyMeasurement | historique par membre et coach |
| Recovery | RecoveryService, RecoveryPack, PackPurchase, PackLedgerEntry, RecoveryReservation | registre de consommation immuable par pack |
| Café | Product, ProductPrice, StockItem, StockMovement, CafeOrder, CafeOrderLine | commandes et mouvements de stock corrélés |
| Finance | Expense, ExpenseCategory, CashMovement | mouvements financiers explicites |
| Communication | Conversation, Message, Notification, NotificationDelivery | messages internes et livraisons multicanal |
| Gouvernance | AuditLog, Setting, ContentPage, ContentVersion | configuration versionnée et audit append-only |
| Analyse | MetricSnapshot ou vues matérialisées | données dérivées des sources transactionnelles |

## Conventions

- Identifiants UUID, sauf justification documentée.
- Colonnes `created_at` et `updated_at` en `TIMESTAMPTZ` ; instants stockés en UTC.
- Montants en type numérique décimal et devise explicite, jamais en flottant.
- Contraintes uniques, clés étrangères et checks au niveau PostgreSQL.
- États représentés par valeurs contrôlées et transitions appliquées par les services.
- Données historiques critiques conservées par événements, versions ou écritures compensatoires.

## Transactions prioritaires

Les agrégats Payment/Receipt, Reservation/Capacity, PackPurchase/PackLedgerEntry et CafeOrder/StockMovement définissent les premières frontières transactionnelles. Les migrations Alembic seront introduites module par module après validation détaillée du modèle.

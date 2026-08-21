import { CalendarCheck, CreditCard, UserRound } from "lucide-react";
import { Card, Pill } from "@masterz/ui";
import type { AuthSession } from "@/lib/auth";
import { ReceiptSummary } from "./ApplicationManager";
import { CoachingTrackingPanel } from "./CoachingTrackingPanel";
import { MemberRecoveryPanel } from "./RecoveryManager";
import { MemberNotifications } from "./MemberNotifications";
import { ComplaintCenter } from "./ComplaintCenter";
import { MemberStoreManager } from "./StoreManager";
import {
  type Attendance,
  type Receipt,
  type Subscription,
  type User,
  EmptyState,
  Info,
  Panel,
  formatDate,
  statusLabels,
} from "./dashboard-shared";

export function MemberDashboard({
  session,
  user,
  subscriptions,
  receipts,
  attendance,
}: {
  session: AuthSession;
  user: User;
  subscriptions: Subscription[];
  receipts: Receipt[];
  attendance: Attendance[];
}) {
  return (
    <div className="mt-8 space-y-6">
      <Panel
        title="Mes notifications"
        subtitle="Les alertes importantes concernant vos abonnements et vos packs."
      >
        <MemberNotifications session={session} />
      </Panel>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel
          title="Mon profil"
          subtitle="Vos informations personnelles et votre statut membre."
        >
          <dl className="space-y-4 text-sm">
            <Info label="Nom" value={user.full_name} />
            <Info label="Téléphone" value={user.phone} />
            <Info label="Email" value={user.email ?? "Non renseigné"} />
            <Info
              label="Numéro membre"
              value={user.member_number ?? "Non attribué"}
            />
            <Info
              label="Statut"
              value={statusLabels[user.status] ?? user.status}
            />
          </dl>
        </Panel>
        <Panel
          title="Mes abonnements"
          subtitle="Formules, dates et statut actuel."
        >
          {subscriptions.length ? (
            <div className="grid gap-4">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-white">
                        {subscription.plan_name}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        Du {subscription.starts_on} au {subscription.ends_on}
                      </p>
                      <p className="mt-2 text-sm font-bold text-primary">
                        {subscription.price} {subscription.currency}
                      </p>
                      {subscription.service_type === "recovery" ? (
                        <p className="mt-2 text-sm font-bold text-emerald-200">
                          {subscription.remaining_sessions ?? "—"} /{" "}
                          {subscription.total_sessions ?? "—"} seance(s)
                        </p>
                      ) : null}
                    </div>
                    <Pill>
                      {statusLabels[
                        subscription.effective_status ?? subscription.status
                      ] ?? subscription.status}
                    </Pill>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState text="Aucun abonnement enregistré sur ce compte." />
          )}
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Mes reçus"
          subtitle="Historique de vos paiements d’abonnement."
        >
          {receipts.length ? (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <ReceiptSummary key={receipt.receipt_id} receipt={receipt} />
              ))}
            </div>
          ) : (
            <EmptyState text="Aucun reçu disponible." />
          )}
        </Panel>
        <Panel
          title="Mes présences"
          subtitle="Historique des passages enregistrés à l’accueil."
        >
          {attendance.length ? (
            <div className="space-y-3">
              {attendance.map((entry) => (
                <Card
                  key={entry.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="flex items-center gap-3">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-bold text-white">
                        {formatDate(entry.checked_in_at)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {entry.subscription_status_at_entry}
                      </p>
                    </div>
                  </div>
                  <Pill>{statusLabels[entry.decision] ?? entry.decision}</Pill>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState text="Aucune présence enregistrée." />
          )}
        </Panel>
      </div>
      <Panel
        title="Ma progression coaching"
        subtitle="Votre objectif, vos tests et leur historique, sans modifier les donnees saisies par votre coach."
      >
        <CoachingTrackingPanel session={session} memberId={user.id} />
      </Panel>
      <Panel
        title="Mon pack recovery"
        subtitle="Vos seances sauna, bain froid et compression, avec le solde et l'historique des passages."
      >
        <MemberRecoveryPanel session={session} memberId={user.id} />
      </Panel>
      <Panel
        title="Mes reclamations"
        subtitle="Ecrivez a la Reception ou a l'Administration et suivez toutes les reponses dans la meme conversation."
      >
        <ComplaintCenter session={session} mode="member" />
      </Panel>
      <Panel
        title="Masterz Store"
        subtitle="Consultez les produits disponibles, reservez-les et suivez leur validation par la Reception."
      >
        <MemberStoreManager session={session} />
      </Panel>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <UserRound className="h-6 w-6 text-primary" />
          <p className="mt-4 text-sm font-black uppercase text-white">
            Profil sécurisé
          </p>
        </Card>
        <Card className="p-5">
          <CreditCard className="h-6 w-6 text-primary" />
          <p className="mt-4 text-sm font-black uppercase text-white">
            {receipts.length} reçu(s)
          </p>
        </Card>
        <Card className="p-5">
          <CalendarCheck className="h-6 w-6 text-primary" />
          <p className="mt-4 text-sm font-black uppercase text-white">
            {attendance.length} présence(s)
          </p>
        </Card>
      </div>
    </div>
  );
}

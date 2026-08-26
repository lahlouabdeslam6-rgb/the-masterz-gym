"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Alert, Button, Card, Input } from "@masterz/ui";
import { api } from "@/lib/api";
import {
  authorizationHeaders,
  updateSessionUser,
  type AuthSession,
} from "@/lib/auth";
import {
  type Plan,
  type Setting,
  type User,
  Field,
  roleLabels,
  selectClass,
  statusLabels,
} from "./dashboard-shared";

const roles: User["role"][] = [
  "admin",
  "receptionist",
  "coach",
  "member",
  "recovery_client",
  "cafe_employee",
];
const accountStatuses: User["status"][] = [
  "active",
  "pending_activation",
  "suspended",
  "disabled",
];
const userRoleFilters: Array<"all" | User["role"]> = [
  "all",
  "member",
  "coach",
  "receptionist",
  "admin",
  "recovery_client",
  "cafe_employee",
];
const usersPerPage = 10;

type UserEditForm = {
  full_name: string;
  phone: string;
  email: string;
  password: string;
  role: User["role"];
  status: User["status"];
  member_number: string;
  reason: string;
};

const serviceTypeLabels: Record<Plan["service_type"], string> = {
  gym: "Salle musculation",
  coaching: "Coaching",
  recovery: "Recovery (sauna, bain froid, compression)",
};

const settingPresentation: Record<
  string,
  { label: string; description: string }
> = {
  attendance_duplicate_window_minutes: {
    label: "Anti-double entree",
    description: "Delai minimum en minutes entre deux passages.",
  },
  subscription_expiring_soon_days: {
    label: "Abonnement bientot expire",
    description: "Nombre de jours avant l'alerte de renouvellement.",
  },
  subscription_grace_days: {
    label: "Delai de grace",
    description: "Jours accordes apres la fin de l'abonnement.",
  },
  store_low_stock_threshold: {
    label: "Alerte stock Store",
    description: "Alerte quand un produit atteint ce nombre d'unites.",
  },
  application_pending_retention_days: {
    label: "Nettoyage des demandes",
    description: "Jours avant de supprimer une demande encore en attente.",
  },
};

export function AdminUserManager({
  session,
  users,
  onReload,
}: {
  session: AuthSession;
  users: User[];
  onReload: () => Promise<void> | void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    role: "receptionist" as User["role"],
    status: "active" as User["status"],
    member_number: "",
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<UserEditForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | User["role"]>("all");
  const [page, setPage] = useState(1);
  const headers = authorizationHeaders(session.accessToken);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("fr");
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const searchable = [
        user.full_name,
        user.phone,
        user.email ?? "",
        user.member_number ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("fr");
      return matchesRole && (!query || searchable.includes(query));
    });
  }, [roleFilter, searchQuery, users]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / usersPerPage),
  );
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage,
  );

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const result = await api.POST("/api/v1/users", {
      headers,
      body: {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        date_of_birth: null,
        gender: null,
        password: form.password,
        role: form.role,
        status: form.status,
        member_number: form.member_number || null,
      },
    });
    setBusy(false);
    if (result.data) {
      setFeedback("Utilisateur créé.");
      setForm({
        full_name: "",
        phone: "",
        email: "",
        password: "",
        role: "receptionist",
        status: "active",
        member_number: "",
      });
      await onReload();
    } else
      setFeedback(
        "Création impossible. Vérifiez le téléphone, le mot de passe et le numéro membre.",
      );
  }

  function openEditor(user: User) {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone,
      email: user.email ?? "",
      password: "",
      role: user.role,
      status: user.status,
      member_number: user.member_number ?? "",
      reason: "Mise a jour du compte",
    });
    setConfirmDelete(false);
    setFeedback(null);
  }

  function closeEditor() {
    if (busy) return;
    setEditingUser(null);
    setEditForm(null);
    setConfirmDelete(false);
  }

  async function updateUser(event: React.FormEvent) {
    event.preventDefault();
    if (!editingUser || !editForm) return;
    if (editForm.reason.trim().length < 3) {
      setFeedback("Ajoutez un motif de modification.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH("/api/v1/users/{user_id}", {
      headers,
      params: { path: { user_id: editingUser.id } },
      body: {
        full_name: editForm.full_name,
        phone: editForm.phone,
        email: editForm.email || null,
        password: editForm.password || null,
        role: editForm.role,
        status: editForm.status,
        member_number:
          editForm.role === "member" ? editForm.member_number || null : null,
        reason: editForm.reason,
      },
    });
    setBusy(false);
    if (result.data) {
      if (editingUser.id === session.user.id) updateSessionUser(result.data);
      setFeedback("Compte mis a jour.");
      setEditingUser(null);
      setEditForm(null);
      await onReload();
      return;
    }
    setFeedback(
      "Le compte n'a pas pu etre modifie. Verifiez les informations saisies.",
    );
  }

  async function deleteUser() {
    if (!editingUser || editingUser.id === session.user.id) return;
    setBusy(true);
    setFeedback(null);
    const result = await api.DELETE("/api/v1/users/{user_id}", {
      headers,
      params: { path: { user_id: editingUser.id } },
    });
    setBusy(false);
    if (!result.error) {
      setFeedback("Compte supprime.");
      setEditingUser(null);
      setEditForm(null);
      setConfirmDelete(false);
      await onReload();
      return;
    }
    setFeedback(
      "Ce compte contient des donnees liees. Desactivez-le au lieu de le supprimer.",
    );
    setConfirmDelete(false);
  }

  return (
    <div className="space-y-6">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      <form
        onSubmit={createUser}
        className="grid gap-3 rounded-sm border border-primary/15 bg-primary/[0.03] p-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Field label="Nom complet">
          <Input
            required
            value={form.full_name}
            onChange={(event) =>
              setForm({ ...form, full_name: event.target.value })
            }
          />
        </Field>
        <Field label="Téléphone">
          <Input
            required
            placeholder="+212…"
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
        </Field>
        <Field label="Mot de passe">
          <Input
            type="password"
            minLength={10}
            required
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
        </Field>
        <Field label="Rôle">
          <select
            className={selectClass}
            value={form.role}
            onChange={(event) =>
              setForm({ ...form, role: event.target.value as User["role"] })
            }
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statut">
          <select
            className={selectClass}
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value as User["status"] })
            }
          >
            {accountStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </Field>
        {form.role === "member" ? (
          <Field label="Numéro membre">
            <Input
              required
              value={form.member_number}
              onChange={(event) =>
                setForm({ ...form, member_number: event.target.value })
              }
            />
          </Field>
        ) : (
          <div />
        )}
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={busy}>
            <UserPlus className="h-4 w-4" /> Créer utilisateur
          </Button>
        </div>
      </form>

      <section className="rounded-lg border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Liste des comptes
            </p>
            <p className="mt-2 text-sm text-gray-500">
              10 comptes maximum par page.
            </p>
          </div>
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              aria-label="Rechercher un utilisateur"
              placeholder="Nom, telephone, email ou numero membre"
              className="pl-11"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div
          className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4"
          role="tablist"
          aria-label="Filtrer les utilisateurs par role"
        >
          {userRoleFilters.map((filter) => {
            const active = roleFilter === filter;
            const count =
              filter === "all"
                ? users.length
                : users.filter((user) => user.role === filter).length;
            return (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setRoleFilter(filter);
                  setPage(1);
                }}
                className={`flex min-h-11 items-center gap-3 rounded-md border px-4 text-xs font-black uppercase tracking-[0.08em] transition ${
                  active
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {filter === "all" ? "Tous" : roleLabels[filter]}
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.65rem] ${
                    active
                      ? "bg-primary text-black"
                      : "bg-white/5 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="space-y-3">
        {visibleUsers.map((user) => (
          <Card key={user.id} className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-bold text-white">
                  {user.full_name}
                </p>
                <p className="mt-1 text-xs text-gray-500">{user.phone}</p>
                {user.email || user.member_number ? (
                  <p className="mt-1 truncate text-xs text-gray-600">
                    {[user.member_number, user.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em] text-primary">
                  {roleLabels[user.role]}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em] ${
                    user.status === "active"
                      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                      : "border-white/15 bg-white/5 text-gray-400"
                  }`}
                >
                  {statusLabels[user.status]}
                </span>
                <Button
                  variant="outline"
                  aria-label={`Modifier ${user.full_name}`}
                  onClick={() => openEditor(user)}
                >
                  <Pencil className="h-4 w-4" /> Modifier
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {visibleUsers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 px-6 py-12 text-center">
            <p className="font-bold text-white">Aucun compte trouve.</p>
            <p className="mt-2 text-sm text-gray-500">
              Changez le role choisi ou le texte de recherche.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-gray-500">
          {filteredUsers.length === 0
            ? "0 compte"
            : `${(currentPage - 1) * usersPerPage + 1}-${Math.min(
                currentPage * usersPerPage,
                filteredUsers.length,
              )} sur ${filteredUsers.length} compte(s)`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Precedent
          </Button>
          <span className="min-w-20 text-center text-xs font-black text-white">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {editingUser && editForm ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
        >
          <form
            onSubmit={updateUser}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/15 bg-[#07111a] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#07111a]/95 px-5 py-5 backdrop-blur sm:px-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  Gestion du compte
                </p>
                <h3
                  id="edit-user-title"
                  className="mt-2 text-2xl font-black text-white"
                >
                  Modifier {editingUser.full_name}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={closeEditor}
                className="rounded-md border border-white/10 p-2 text-gray-400 transition hover:border-white/25 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom complet">
                  <Input
                    required
                    value={editForm.full_name}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        full_name: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Telephone">
                  <Input
                    required
                    value={editForm.phone}
                    onChange={(event) =>
                      setEditForm({ ...editForm, phone: event.target.value })
                    }
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(event) =>
                      setEditForm({ ...editForm, email: event.target.value })
                    }
                  />
                </Field>
                <Field label="Nouveau mot de passe (optionnel)">
                  <Input
                    type="password"
                    minLength={10}
                    placeholder="Laissez vide pour ne pas le changer"
                    value={editForm.password}
                    onChange={(event) =>
                      setEditForm({ ...editForm, password: event.target.value })
                    }
                  />
                </Field>
                <Field label="Role">
                  <select
                    className={selectClass}
                    disabled={editingUser.id === session.user.id}
                    value={editForm.role}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        role: event.target.value as User["role"],
                      })
                    }
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Statut">
                  <select
                    className={selectClass}
                    disabled={editingUser.id === session.user.id}
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        status: event.target.value as User["status"],
                      })
                    }
                  >
                    {accountStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </Field>
                {editForm.role === "member" ? (
                  <Field label="Numero membre">
                    <Input
                      required
                      value={editForm.member_number}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          member_number: event.target.value,
                        })
                      }
                    />
                  </Field>
                ) : null}
              </div>

              <div className="rounded-md border border-white/10 bg-black/20 p-4">
                <Field label="Motif de modification">
                  <Input
                    required
                    minLength={3}
                    value={editForm.reason}
                    onChange={(event) =>
                      setEditForm({ ...editForm, reason: event.target.value })
                    }
                  />
                </Field>
                <p className="mt-2 text-xs leading-5 text-gray-600">
                  Ce petit motif reste dans le journal d&apos;audit pour
                  expliquer la modification.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {editingUser.id === session.user.id ? (
                    <p className="max-w-sm text-xs leading-5 text-gray-500">
                      Le compte Admin actuellement connecte ne peut pas etre
                      supprime ni desactive.
                    </p>
                  ) : confirmDelete ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-red-300">
                        Confirmer la suppression ?
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmDelete(false)}
                        disabled={busy}
                      >
                        Annuler
                      </Button>
                      <button
                        type="button"
                        onClick={() => void deleteUser()}
                        disabled={busy}
                        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-red-500 px-4 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" /> Supprimer definitivement
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-400/25 px-4 text-xs font-black uppercase tracking-[0.08em] text-red-300 transition hover:border-red-300/50 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" /> Supprimer le compte
                    </button>
                  )}
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEditor}
                    disabled={busy}
                  >
                    Fermer
                  </Button>
                  <Button type="submit" disabled={busy}>
                    <Save className="h-4 w-4" /> Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function AdminPlanManager({
  session,
  plans,
  onReload,
}: {
  session: AuthSession;
  plans: Plan[];
  onReload: () => Promise<void> | void;
}) {
  const [activeServiceType, setActiveServiceType] =
    useState<Plan["service_type"]>("gym");
  const [create, setCreate] = useState({
    name: "",
    duration: "1",
    price: "",
    currency: "MAD",
    service_type: "gym" as Plan["service_type"],
    session_count: "",
  });
  const initialEdits = useMemo(
    () =>
      Object.fromEntries(
        plans.map((plan) => [
          plan.id,
          {
            name: plan.name,
            duration: String(plan.duration_months),
            price: plan.price,
            currency: plan.currency,
            service_type: plan.service_type,
            session_count: plan.session_count ? String(plan.session_count) : "",
            active: plan.is_active,
            reason: "Mise à jour tarifaire",
          },
        ]),
      ),
    [plans],
  );
  const [edits, setEdits] = useState<
    Record<
      string,
      {
        name: string;
        duration: string;
        price: string;
        currency: string;
        service_type: Plan["service_type"];
        session_count: string;
        active: boolean;
        reason: string;
      }
    >
  >({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headers = authorizationHeaders(session.accessToken);

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await api.POST("/api/v1/membership-plans", {
      headers,
      body: {
        name: create.name,
        duration_months: Number(create.duration),
        price: create.price,
        currency: create.currency.toUpperCase(),
        service_type: create.service_type,
        session_count:
          create.service_type === "recovery"
            ? Number(create.session_count)
            : null,
        is_active: true,
      },
    });
    setBusy(false);
    setFeedback(
      result.data ? "Formule créée." : "La formule n’a pas pu être créée.",
    );
    if (result.data) {
      setCreate({
        name: "",
        duration: "1",
        price: "",
        currency: "MAD",
        service_type: activeServiceType,
        session_count: "",
      });
      await onReload();
    }
  }

  async function updatePlan(plan: Plan) {
    const edit = edits[plan.id] ?? initialEdits[plan.id];
    setBusy(true);
    const result = await api.PATCH("/api/v1/membership-plans/{plan_id}", {
      headers,
      params: { path: { plan_id: plan.id } },
      body: {
        name: edit.name,
        duration_months: Number(edit.duration),
        price: edit.price,
        currency: edit.currency.toUpperCase(),
        service_type: edit.service_type,
        session_count:
          edit.service_type === "recovery" ? Number(edit.session_count) : null,
        is_active: edit.active,
        reason: edit.reason,
      },
    });
    setBusy(false);
    setFeedback(
      result.data
        ? "Formule mise à jour."
        : "La formule n’a pas pu être modifiée.",
    );
    if (result.data) await onReload();
  }

  const serviceTypes = Object.keys(serviceTypeLabels) as Plan["service_type"][];
  const visiblePlans = plans.filter(
    (plan) => plan.service_type === activeServiceType,
  );

  return (
    <div className="space-y-6">
      {feedback ? <Alert type="info" message={feedback} /> : null}

      <div
        className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-2 md:grid-cols-3"
        role="tablist"
        aria-label="Categories des formules"
      >
        {serviceTypes.map((serviceType) => {
          const active = activeServiceType === serviceType;
          const count = plans.filter(
            (plan) => plan.service_type === serviceType,
          ).length;
          return (
            <button
              key={serviceType}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActiveServiceType(serviceType);
                setCreate((current) => ({
                  ...current,
                  service_type: serviceType,
                }));
              }}
              className={`flex items-center justify-between rounded-md border px-4 py-4 text-left transition ${
                active
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
              }`}
            >
              <span className="text-sm font-black uppercase tracking-[0.08em]">
                {serviceTypeLabels[serviceType]}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-black ${
                  active ? "bg-primary text-black" : "bg-white/5 text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <form
        onSubmit={createPlan}
        className="rounded-lg border border-primary/20 bg-primary/[0.035] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Nouvelle offre
            </p>
            <h3 className="mt-2 text-xl font-black text-white">
              {serviceTypeLabels[activeServiceType]}
            </h3>
          </div>
          <p className="max-w-lg text-xs leading-5 text-gray-500">
            Une offre active sera affichee automatiquement dans sa page du site.
          </p>
        </div>
        <input type="hidden" value={create.service_type} readOnly />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6 xl:items-end">
          <Field label="Nom de la formule">
            <Input
              required
              placeholder="Ex. Pack Recovery 1 mois"
              value={create.name}
              onChange={(event) =>
                setCreate({ ...create, name: event.target.value })
              }
            />
          </Field>
          <Field label="Duree en mois">
            <Input
              type="number"
              min={1}
              required
              value={create.duration}
              onChange={(event) =>
                setCreate({ ...create, duration: event.target.value })
              }
            />
          </Field>
          <Field label="Prix">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={create.price}
              onChange={(event) =>
                setCreate({ ...create, price: event.target.value })
              }
            />
          </Field>
          <Field label="Devise">
            <Input
              minLength={3}
              maxLength={3}
              required
              value={create.currency}
              onChange={(event) =>
                setCreate({ ...create, currency: event.target.value })
              }
            />
          </Field>
          {create.service_type === "recovery" ? (
            <Field label="Nombre de seances">
              <Input
                type="number"
                min={1}
                required
                placeholder="Ex. 10"
                value={create.session_count}
                onChange={(event) =>
                  setCreate({ ...create, session_count: event.target.value })
                }
              />
            </Field>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            <Plus className="h-4 w-4" /> Creer une offre
          </Button>
        </div>
      </form>

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white">
              Offres {serviceTypeLabels[activeServiceType]}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {visiblePlans.length} formule(s) dans cette categorie.
            </p>
          </div>
        </div>
        <div className="grid gap-4 2xl:grid-cols-2">
          {visiblePlans.map((plan) => {
            const edit = edits[plan.id] ?? initialEdits[plan.id];
            return (
              <Card key={plan.id} className="overflow-hidden">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.02] px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">
                      {plan.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {plan.duration_months} mois · {plan.price} {plan.currency}
                      {plan.service_type === "recovery"
                        ? ` · ${plan.session_count ?? "A configurer"} seance(s)`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em] ${
                      plan.is_active
                        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                        : "border-white/15 bg-white/5 text-gray-400"
                    }`}
                  >
                    {plan.is_active ? "Visible" : "Masquee"}
                  </span>
                </div>
                <div className="p-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
                    <Field label="Nom">
                      <Input
                        value={edit.name}
                        onChange={(event) =>
                          setEdits((current) => ({
                            ...current,
                            [plan.id]: { ...edit, name: event.target.value },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Categorie">
                      <select
                        className={selectClass}
                        value={edit.service_type}
                        onChange={(event) =>
                          setEdits((current) => ({
                            ...current,
                            [plan.id]: {
                              ...edit,
                              service_type: event.target
                                .value as Plan["service_type"],
                            },
                          }))
                        }
                      >
                        {Object.entries(serviceTypeLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                    <Field label="Duree en mois">
                      <Input
                        type="number"
                        value={edit.duration}
                        onChange={(event) =>
                          setEdits((current) => ({
                            ...current,
                            [plan.id]: {
                              ...edit,
                              duration: event.target.value,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Prix">
                      <Input
                        type="number"
                        step="0.01"
                        value={edit.price}
                        onChange={(event) =>
                          setEdits((current) => ({
                            ...current,
                            [plan.id]: { ...edit, price: event.target.value },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Devise">
                      <Input
                        value={edit.currency}
                        onChange={(event) =>
                          setEdits((current) => ({
                            ...current,
                            [plan.id]: {
                              ...edit,
                              currency: event.target.value,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Visibilite">
                      <select
                        className={selectClass}
                        value={edit.active ? "active" : "inactive"}
                        onChange={(event) =>
                          setEdits((current) => ({
                            ...current,
                            [plan.id]: {
                              ...edit,
                              active: event.target.value === "active",
                            },
                          }))
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </Field>
                    {edit.service_type === "recovery" ? (
                      <Field label="Nombre de seances">
                        <Input
                          type="number"
                          min={1}
                          required
                          value={edit.session_count}
                          onChange={(event) =>
                            setEdits((current) => ({
                              ...current,
                              [plan.id]: {
                                ...edit,
                                session_count: event.target.value,
                              },
                            }))
                          }
                        />
                      </Field>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <Field label="Motif de modification">
                      <Input
                        value={edit.reason}
                        onChange={(event) =>
                          setEdits((current) => ({
                            ...current,
                            [plan.id]: { ...edit, reason: event.target.value },
                          }))
                        }
                      />
                    </Field>
                    <Button
                      onClick={() => updatePlan(plan)}
                      disabled={
                        busy ||
                        edit.reason.trim().length < 3 ||
                        (edit.service_type === "recovery" &&
                          !edit.session_count)
                      }
                    >
                      <Save className="h-4 w-4" /> Enregistrer
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        {visiblePlans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 px-6 py-12 text-center">
            <p className="font-bold text-white">
              Aucune offre {serviceTypeLabels[activeServiceType]}.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Utilisez le formulaire ci-dessus pour creer la premiere.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminSettingsManager({
  session,
  settings,
  onReload,
}: {
  session: AuthSession;
  settings: Setting[];
  onReload: () => Promise<void> | void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const headers = authorizationHeaders(session.accessToken);
  async function save(setting: Setting) {
    const value = Number(values[setting.key] ?? setting.value.value);
    const result = await api.PUT("/api/v1/membership-settings/{key}", {
      headers,
      params: { path: { key: setting.key } },
      body: { value, reason: "Mise à jour depuis le tableau de bord" },
    });
    setFeedback(
      result.data
        ? "Paramètre mis à jour."
        : "Le paramètre n’a pas pu être modifié.",
    );
    if (result.data) await onReload();
  }
  return (
    <div className="space-y-4">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {settings.map((setting) => (
          <Card key={setting.key} className="p-5">
            <Settings2 className="h-6 w-6 text-primary" />
            <p className="mt-4 break-words text-sm font-black text-white">
              {settingPresentation[setting.key]?.label ?? setting.key}
            </p>
            <p className="mt-2 min-h-10 text-xs leading-5 text-gray-500">
              {settingPresentation[setting.key]?.description ??
                "Parametre configurable du systeme."}
            </p>
            <div className="mt-4 flex gap-2">
              <Input
                type="number"
                min={0}
                max={365}
                value={values[setting.key] ?? String(setting.value.value)}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [setting.key]: event.target.value,
                  }))
                }
              />
              <Button onClick={() => save(setting)}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

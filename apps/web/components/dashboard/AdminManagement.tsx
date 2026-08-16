"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Settings2, UserPlus } from "lucide-react";
import { Alert, Button, Card, Input } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
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

const serviceTypeLabels: Record<Plan["service_type"], string> = {
  gym: "Salle musculation",
  coaching: "Coaching",
  recovery: "Recovery (sauna, bain froid, compression)",
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
  const [edits, setEdits] = useState<
    Record<
      string,
      { role: User["role"]; status: User["status"]; reason: string }
    >
  >({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headers = authorizationHeaders(session.accessToken);

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

  async function updateUser(user: User) {
    const edit = edits[user.id] ?? {
      role: user.role,
      status: user.status,
      reason: "Mise à jour depuis le tableau de bord",
    };
    if (edit.reason.trim().length < 3) {
      setFeedback("Ajoutez un motif de modification.");
      return;
    }
    setBusy(true);
    const result = await api.PATCH("/api/v1/users/{user_id}/role-status", {
      headers,
      params: { path: { user_id: user.id } },
      body: edit,
    });
    setBusy(false);
    setFeedback(
      result.data ? "Compte mis à jour." : "Le compte n’a pas pu être modifié.",
    );
    if (result.data) await onReload();
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
      <div className="space-y-3">
        {users.map((user) => {
          const edit = edits[user.id] ?? {
            role: user.role,
            status: user.status,
            reason: "Mise à jour depuis le tableau de bord",
          };
          return (
            <Card key={user.id} className="p-4">
              <div className="grid gap-3 xl:grid-cols-[1.3fr_0.8fr_0.8fr_1.4fr_auto] xl:items-end">
                <div>
                  <p className="font-bold text-white">{user.full_name}</p>
                  <p className="mt-1 text-xs text-gray-500">{user.phone}</p>
                </div>
                <Field label="Rôle">
                  <select
                    className={selectClass}
                    value={edit.role}
                    onChange={(event) =>
                      setEdits((current) => ({
                        ...current,
                        [user.id]: {
                          ...edit,
                          role: event.target.value as User["role"],
                        },
                      }))
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
                    value={edit.status}
                    onChange={(event) =>
                      setEdits((current) => ({
                        ...current,
                        [user.id]: {
                          ...edit,
                          status: event.target.value as User["status"],
                        },
                      }))
                    }
                  >
                    {accountStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Motif">
                  <Input
                    value={edit.reason}
                    onChange={(event) =>
                      setEdits((current) => ({
                        ...current,
                        [user.id]: { ...edit, reason: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Button onClick={() => updateUser(user)} disabled={busy}>
                  <Save className="h-4 w-4" /> Sauver
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
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
  const [create, setCreate] = useState({
    name: "",
    duration: "1",
    price: "",
    currency: "MAD",
    service_type: "gym" as Plan["service_type"],
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
        service_type: "gym",
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

  return (
    <div className="space-y-5">
      {feedback ? <Alert type="info" message={feedback} /> : null}
      <form
        onSubmit={createPlan}
        className="grid gap-3 rounded-sm border border-primary/15 bg-primary/[0.03] p-4 sm:grid-cols-2 xl:grid-cols-6"
      >
        <Field label="Nom">
          <Input
            required
            value={create.name}
            onChange={(event) =>
              setCreate({ ...create, name: event.target.value })
            }
          />
        </Field>
        <Field label="Categorie">
          <select
            className={selectClass}
            value={create.service_type}
            onChange={(event) =>
              setCreate({
                ...create,
                service_type: event.target.value as Plan["service_type"],
              })
            }
          >
            {Object.entries(serviceTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Durée mois">
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
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={busy}>
            <Plus className="h-4 w-4" /> Créer
          </Button>
        </div>
      </form>
      <div className="space-y-3">
        {plans.map((plan) => {
          const edit = edits[plan.id] ?? initialEdits[plan.id];
          return (
            <Card key={plan.id} className="p-4">
              <div className="grid gap-3 xl:grid-cols-[1fr_0.9fr_0.45fr_0.6fr_0.4fr_0.6fr_1fr_auto] xl:items-end">
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
                    {Object.entries(serviceTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Mois">
                  <Input
                    type="number"
                    value={edit.duration}
                    onChange={(event) =>
                      setEdits((current) => ({
                        ...current,
                        [plan.id]: { ...edit, duration: event.target.value },
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
                        [plan.id]: { ...edit, currency: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Visibilité">
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
                <Field label="Motif">
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
                <Button onClick={() => updatePlan(plan)} disabled={busy}>
                  <Save className="h-4 w-4" /> Sauver
                </Button>
              </div>
            </Card>
          );
        })}
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
              {setting.key}
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

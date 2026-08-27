"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import {
  Activity,
  Apple,
  Dumbbell,
  History,
  Ruler,
  Save,
  Scale,
  Target,
} from "lucide-react";
import { Alert, Button, Card, Input, LoadingMessage, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import {
  type CoachingAssessment,
  type CoachingTestType,
  type CoachingTracking,
  EmptyState,
  Field,
  formatDate,
  selectClass,
  textareaClass,
} from "./dashboard-shared";

type MetricField = {
  key: string;
  label: string;
  type: "number" | "text";
  step?: string;
  placeholder?: string;
};

const testConfigs: Record<
  CoachingTestType,
  {
    label: string;
    shortLabel: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    fields: MetricField[];
  }
> = {
  impedance: {
    label: "Impedancemetre",
    shortLabel: "Impedance",
    description: "Poids, masse grasse, masse musculaire et graisse viscerale.",
    icon: Scale,
    fields: [
      { key: "weight_kg", label: "Poids (kg)", type: "number", step: "0.1" },
      {
        key: "body_fat_pct",
        label: "Masse grasse (%)",
        type: "number",
        step: "0.1",
      },
      {
        key: "muscle_mass_kg",
        label: "Masse musculaire (kg)",
        type: "number",
        step: "0.1",
      },
      {
        key: "visceral_fat_level",
        label: "Graisse viscerale",
        type: "number",
        step: "1",
      },
    ],
  },
  neuromuscular: {
    label: "Test neuromusculaire",
    shortLabel: "Neuromusculaire",
    description: "Score global, equilibre gauche/droite et explosivite.",
    icon: Activity,
    fields: [
      {
        key: "global_score",
        label: "Score global / 100",
        type: "number",
        step: "1",
      },
      {
        key: "left_balance",
        label: "Equilibre gauche / 100",
        type: "number",
        step: "1",
      },
      {
        key: "right_balance",
        label: "Equilibre droite / 100",
        type: "number",
        step: "1",
      },
      {
        key: "jump_height_cm",
        label: "Detente verticale (cm)",
        type: "number",
        step: "0.1",
      },
    ],
  },
  body_measurements: {
    label: "Mesures du corps",
    shortLabel: "Mesures",
    description: "Taille, poitrine, tour de taille, hanches, bras et cuisses.",
    icon: Ruler,
    fields: [
      { key: "height_cm", label: "Taille (cm)", type: "number", step: "0.1" },
      { key: "chest_cm", label: "Poitrine (cm)", type: "number", step: "0.1" },
      {
        key: "waist_cm",
        label: "Tour de taille (cm)",
        type: "number",
        step: "0.1",
      },
      { key: "hips_cm", label: "Hanches (cm)", type: "number", step: "0.1" },
      { key: "arm_cm", label: "Bras (cm)", type: "number", step: "0.1" },
      { key: "thigh_cm", label: "Cuisse (cm)", type: "number", step: "0.1" },
    ],
  },
  rm_strength: {
    label: "Test RM de force",
    shortLabel: "Force RM",
    description: "Exercice teste, charge maximale et repetitions de reference.",
    icon: Dumbbell,
    fields: [
      {
        key: "exercise",
        label: "Exercice",
        type: "text",
        placeholder: "Ex. Squat, developpe couche...",
      },
      {
        key: "one_rep_max_kg",
        label: "Charge 1RM (kg)",
        type: "number",
        step: "0.5",
      },
      {
        key: "reference_reps",
        label: "Repetitions de reference",
        type: "number",
        step: "1",
      },
    ],
  },
  nutrition_survey: {
    label: "Enquete alimentaire",
    shortLabel: "Alimentation",
    description: "Rythme des repas, hydratation, habitudes et allergies.",
    icon: Apple,
    fields: [
      {
        key: "meals_per_day",
        label: "Repas par jour",
        type: "number",
        step: "1",
      },
      {
        key: "water_liters",
        label: "Eau par jour (L)",
        type: "number",
        step: "0.1",
      },
      {
        key: "dietary_pattern",
        label: "Habitudes alimentaires",
        type: "text",
        placeholder: "Ex. equilibre, grignotage...",
      },
      {
        key: "allergies",
        label: "Allergies / intolerances",
        type: "text",
      },
    ],
  },
};

const testTypes = Object.keys(testConfigs) as CoachingTestType[];

function localDateTimeValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function metricLabel(testType: CoachingTestType, key: string) {
  return (
    testConfigs[testType].fields.find((field) => field.key === key)?.label ??
    key
  );
}

export function CoachingTrackingPanel({
  session,
  memberId,
  editable = false,
}: {
  session: AuthSession;
  memberId: string;
  editable?: boolean;
}) {
  const [tracking, setTracking] = useState<CoachingTracking | null>(null);
  const [objective, setObjective] = useState("");
  const [testType, setTestType] = useState<CoachingTestType>("impedance");
  const [metricDraft, setMetricDraft] = useState<Record<string, string>>({});
  const [measuredAt, setMeasuredAt] = useState(localDateTimeValue);
  const [notes, setNotes] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | CoachingTestType>(
    "all",
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const headers = authorizationHeaders(session.accessToken);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await api.GET(
      "/api/v1/coaching/members/{member_id}/tracking",
      {
        headers: authorizationHeaders(session.accessToken),
        params: { path: { member_id: memberId }, query: { limit: 300 } },
      },
    );
    setTracking(result.data ?? null);
    setObjective(result.data?.objective?.objective ?? "");
    setFeedback(
      result.error ? "Le suivi coaching n'a pas pu etre charge." : null,
    );
    setLoading(false);
  }, [memberId, session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const visibleAssessments = useMemo(
    () =>
      (tracking?.assessments ?? []).filter(
        (assessment) =>
          historyFilter === "all" || assessment.test_type === historyFilter,
      ),
    [historyFilter, tracking?.assessments],
  );

  async function saveObjective() {
    if (objective.trim().length < 3) return;
    setBusy(true);
    setFeedback(null);
    const result = await api.PATCH(
      "/api/v1/coaching/members/{member_id}/objective",
      {
        headers,
        params: { path: { member_id: memberId } },
        body: { objective: objective.trim() },
      },
    );
    setBusy(false);
    if (!result.data) {
      setFeedback("L'objectif n'a pas pu etre enregistre.");
      return;
    }
    await load();
    setFeedback("Objectif coaching enregistre.");
  }

  async function recordAssessment() {
    const metrics: Record<string, string | number> = {};
    for (const field of testConfigs[testType].fields) {
      const value = metricDraft[field.key]?.trim();
      if (value) {
        metrics[field.key] = field.type === "number" ? Number(value) : value;
      }
    }
    if (!Object.keys(metrics).length) {
      setFeedback("Renseignez au moins une mesure avant d'enregistrer.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    const result = await api.POST(
      "/api/v1/coaching/members/{member_id}/assessments",
      {
        headers,
        params: { path: { member_id: memberId } },
        body: {
          test_type: testType,
          measured_at: new Date(measuredAt).toISOString(),
          metrics,
          notes: notes.trim() || null,
        },
      },
    );
    setBusy(false);
    if (!result.data) {
      setFeedback("Le test n'a pas pu etre enregistre.");
      return;
    }
    setMetricDraft({});
    setNotes("");
    setMeasuredAt(localDateTimeValue());
    await load();
    setFeedback(`${testConfigs[testType].label} enregistre dans l'historique.`);
  }

  if (loading)
    return <LoadingMessage message="Chargement du suivi coaching..." />;
  if (!tracking) return <EmptyState text="Suivi coaching indisponible." />;

  return (
    <div className="space-y-5" data-testid="coaching-tracking-panel">
      {feedback ? <Alert type="info" message={feedback} /> : null}

      <Card className="border-primary/20 bg-primary/[0.025] p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(13rem,0.34fr)_minmax(0,0.66fr)] lg:items-start">
          <div className="min-w-0 lg:border-r lg:border-white/10 lg:pr-5">
            <div className="flex items-start justify-between gap-3">
              <Pill>Dossier coaching</Pill>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[0.65rem] font-black uppercase text-primary">
                {tracking.assessments.length} test(s)
              </span>
            </div>
            <h3 className="mt-4 truncate text-xl font-black text-white">
              {tracking.member_name}
            </h3>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {tracking.member_number}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Coach : {tracking.coach_name ?? "Non affecte"}
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <h4 className="font-black uppercase text-white">
                  Objectif du client
                </h4>
                <p className="mt-0.5 text-xs text-gray-500">
                  Direction principale du parcours coaching.
                </p>
              </div>
            </div>
            {editable ? (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <textarea
                  aria-label="Objectif du client"
                  className={`${textareaClass} min-h-24 flex-1`}
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                  placeholder="Ex. perdre du poids, gagner en force, reprendre la forme..."
                />
                <Button
                  className="shrink-0 sm:h-12"
                  onClick={saveObjective}
                  disabled={busy || objective.trim().length < 3}
                >
                  <Save className="h-4 w-4" /> Enregistrer l&apos;objectif
                </Button>
              </div>
            ) : tracking.objective ? (
              <div className="mt-3 rounded-sm border border-white/10 bg-black/20 p-4">
                <p className="leading-7 text-gray-200">
                  {tracking.objective.objective}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Mis a jour par {tracking.objective.updated_by_name} le{" "}
                  {formatDate(tracking.objective.updated_at)}
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <EmptyState text="Aucun objectif coaching enregistre." />
              </div>
            )}
          </div>
        </div>
      </Card>

      {editable ? (
        <Card className="p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              Nouveau resultat
            </p>
            <h4 className="mt-2 text-xl font-black uppercase text-white">
              Ajouter un test
            </h4>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Type de test">
              <select
                aria-label="Type de test"
                className={selectClass}
                value={testType}
                onChange={(event) => {
                  setTestType(event.target.value as CoachingTestType);
                  setMetricDraft({});
                }}
              >
                {testTypes.map((value) => (
                  <option key={value} value={value}>
                    {testConfigs[value].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date et heure du test">
              <Input
                type="datetime-local"
                value={measuredAt}
                onChange={(event) => setMeasuredAt(event.target.value)}
              />
            </Field>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {testConfigs[testType].description}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {testConfigs[testType].fields.map((field) => (
              <Field key={field.key} label={field.label}>
                <Input
                  type={field.type}
                  step={field.step}
                  placeholder={field.placeholder}
                  value={metricDraft[field.key] ?? ""}
                  onChange={(event) =>
                    setMetricDraft((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              </Field>
            ))}
          </div>
          <Field label="Notes du coach">
            <textarea
              aria-label="Notes du coach"
              className={`${textareaClass} mt-4 min-h-24`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observation, contexte du test, recommandation..."
            />
          </Field>
          <Button className="mt-5" onClick={recordAssessment} disabled={busy}>
            <Save className="h-4 w-4" /> Enregistrer dans l&apos;historique
          </Button>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-primary" />
          <div>
            <h4 className="font-black uppercase text-white">
              Historique des tests
            </h4>
            <p className="mt-1 text-xs text-gray-500">
              Les anciens resultats restent conserves pour comparer la
              progression.
            </p>
          </div>
        </div>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filtrer les tests"
        >
          <HistoryFilterButton
            active={historyFilter === "all"}
            onClick={() => setHistoryFilter("all")}
            label={`Tous (${tracking.assessments.length})`}
          />
          {testTypes.map((value) => (
            <HistoryFilterButton
              key={value}
              active={historyFilter === value}
              onClick={() => setHistoryFilter(value)}
              label={`${testConfigs[value].shortLabel} (${tracking.assessments.filter((item) => item.test_type === value).length})`}
            />
          ))}
        </div>
        <div className="mt-5 space-y-3">
          {visibleAssessments.length ? (
            visibleAssessments.map((assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} />
            ))
          ) : (
            <EmptyState text="Aucun test dans cette categorie." />
          )}
        </div>
      </Card>
    </div>
  );
}

function HistoryFilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-[0.06em] transition ${
        active
          ? "border-primary bg-primary text-black"
          : "border-white/10 text-gray-400 hover:border-primary/40 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function AssessmentCard({ assessment }: { assessment: CoachingAssessment }) {
  const config = testConfigs[assessment.test_type];
  const Icon = config.icon;
  return (
    <div className="rounded-sm border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-sm bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-black text-white">{config.label}</p>
            <p className="mt-1 text-xs text-gray-500">
              {formatDate(assessment.measured_at)} · {assessment.coach_name}
            </p>
          </div>
        </div>
        <Pill>{Object.keys(assessment.metrics).length} mesure(s)</Pill>
      </div>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(assessment.metrics).map(([key, value]) => (
          <div
            key={key}
            className="rounded-sm border border-white/10 px-3 py-2"
          >
            <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-600">
              {metricLabel(assessment.test_type, key)}
            </dt>
            <dd className="mt-1 text-sm font-bold text-white">
              {String(value ?? "-")}
            </dd>
          </div>
        ))}
      </dl>
      {assessment.notes ? (
        <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-gray-400">
          {assessment.notes}
        </p>
      ) : null}
    </div>
  );
}

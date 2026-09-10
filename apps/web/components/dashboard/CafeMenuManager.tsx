"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  Coffee,
  Eye,
  EyeOff,
  ImagePlus,
  LoaderCircle,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, Input, LoadingMessage } from "@masterz/ui";
import { api, authenticatedFetch, resolveApiMediaUrl } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { SALLE_1_ID } from "./ClubSwitcher";
import { Field, selectClass, textareaClass } from "./dashboard-shared";

type MenuItem = components["schemas"]["CafeMenuItemRead"];
type MenuCreate = components["schemas"]["CafeMenuItemCreate"];

type MenuDraft = {
  name: string;
  category: string;
  description: string;
  mediaUrls: string[];
  price: string;
  currency: string;
  order: string;
  active: boolean;
};

const emptyDraft: MenuDraft = {
  name: "",
  category: "",
  description: "",
  mediaUrls: [],
  price: "",
  currency: "MAD",
  order: "0",
  active: true,
};

export function CafeMenuManager({ session }: { session: AuthSession }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [draft, setDraft] = useState<MenuDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.GET("/api/v1/cafe/menu-items", {
      headers: authorizationHeaders(session.accessToken),
    });
    setItems(result.data ?? []);
    setError(
      result.error ? "La carte Healthy Cafe n'a pas pu etre chargee." : null,
    );
    setLoading(false);
  }, [session.accessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function uploadMedia(file: File) {
    const formData = new FormData();
    formData.append("media", file);
    const response = await authenticatedFetch("/api/v1/cafe/menu-media", {
      method: "POST",
      headers: authorizationHeaders(session.accessToken),
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as
      components["schemas"]["CafeMenuMediaRead"] | null;
    if (!response.ok || !payload?.media_url) {
      throw new Error("upload_failed");
    }
    return payload.media_url;
  }

  async function createItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await api.POST("/api/v1/cafe/menu-items", {
      headers: authorizationHeaders(session.accessToken),
      body: toCreatePayload(draft),
    });
    setSaving(false);
    if (result.error) {
      setError("Verifiez le nom, la categorie et le prix du repas.");
      return;
    }
    setDraft(emptyDraft);
    setSuccess("Le repas a ete ajoute a la carte publique.");
    await load();
  }

  async function updateItem(item: MenuItem, draftItem: MenuDraft) {
    setError(null);
    setSuccess(null);
    const result = await api.PATCH("/api/v1/cafe/menu-items/{item_id}", {
      headers: authorizationHeaders(session.accessToken),
      params: { path: { item_id: item.id } },
      body: {
        name: draftItem.name.trim(),
        category: draftItem.category.trim(),
        description: draftItem.description.trim() || null,
        image_url: draftItem.mediaUrls[0] || null,
        media_urls: draftItem.mediaUrls,
        price: draftItem.price,
        currency: draftItem.currency.trim().toUpperCase(),
        display_order: Number(draftItem.order || 0),
        is_active: draftItem.active,
      },
    });
    if (result.error) {
      setError("La modification n'a pas pu etre enregistree.");
      return false;
    }
    setSuccess("La carte publique a ete mise a jour.");
    await load();
    return true;
  }

  async function deleteItem(item: MenuItem) {
    if (
      !window.confirm(`Supprimer definitivement ${item.name} de la carte ?`)
    ) {
      return false;
    }
    setError(null);
    setSuccess(null);
    const result = await api.DELETE("/api/v1/cafe/menu-items/{item_id}", {
      headers: authorizationHeaders(session.accessToken),
      params: { path: { item_id: item.id } },
    });
    if (result.error) {
      setError("Le repas n'a pas pu etre supprime.");
      return false;
    }
    setSuccess("Le repas a ete supprime de la carte.");
    await load();
    return true;
  }

  return (
    <div className="space-y-8">
      {error ? <Alert type="error" message={error} /> : null}
      {success ? <Alert type="success" message={success} /> : null}

      <form
        onSubmit={createItem}
        className="overflow-hidden rounded-lg border border-primary/25 bg-[linear-gradient(135deg,rgba(0,212,255,.1),rgba(0,212,255,.02)_45%,rgba(0,0,0,.12))]"
      >
        <div className="grid gap-6 border-b border-white/10 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary">
              Nouveau repas
            </p>
            <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">
              Ajouter a la carte
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Choisissez le repas, son prix et sa photo. Il apparaitra
              automatiquement dans Healthy Cafe.
            </p>
          </div>
          <CafeMediaField
            value={draft.mediaUrls}
            uploadMedia={uploadMedia}
            onChange={(mediaUrls) =>
              setDraft((current) => ({ ...current, mediaUrls }))
            }
            onUploadingChange={setUploading}
            onError={setError}
          />
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7 xl:grid-cols-4">
          <Field label="Nom du repas *">
            <Input
              required
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ex. Bowl poulet"
            />
          </Field>
          <Field label="Categorie *">
            <Input
              required
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder="Ex. Repas, boissons..."
            />
          </Field>
          <Field label="Prix *">
            <Input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={draft.price}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  price: event.target.value,
                }))
              }
              placeholder="0.00"
            />
          </Field>
          <Field label="Devise">
            <Input
              required
              maxLength={3}
              value={draft.currency}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  currency: event.target.value.toUpperCase(),
                }))
              }
            />
          </Field>
          <label className="space-y-2 text-xs font-black uppercase tracking-[0.12em] text-gray-400 sm:col-span-2">
            <span>Description</span>
            <textarea
              className={`${textareaClass} min-h-28`}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Composition ou details utiles..."
            />
          </label>
          <Field label="Ordre d'affichage">
            <Input
              min="0"
              type="number"
              value={draft.order}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  order: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Visibilite">
            <select
              className={selectClass}
              value={draft.active ? "active" : "hidden"}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  active: event.target.value === "active",
                }))
              }
            >
              <option value="active">Visible sur le site</option>
              <option value="hidden">Masque</option>
            </select>
          </Field>
        </div>
        <div className="flex justify-end border-t border-white/10 px-5 py-4 sm:px-7">
          <Button type="submit" disabled={saving || uploading}>
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Coffee className="h-4 w-4" />
            )}
            Ajouter le repas
          </Button>
        </div>
      </form>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary">
              Carte actuelle
            </p>
            <h3 className="mt-2 font-display text-3xl font-black uppercase text-white">
              Repas publies
            </h3>
          </div>
          <span className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-gray-400">
            {items.length} article(s)
          </span>
        </div>
        {loading ? (
          <LoadingMessage message="Chargement de la carte..." />
        ) : items.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => (
              <EditableMenuItem
                key={item.id}
                item={item}
                uploadMedia={uploadMedia}
                onSave={updateItem}
                onDelete={deleteItem}
                onError={setError}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 p-10 text-center text-sm text-gray-500">
            Aucun repas ajoute. Utilisez le formulaire ci-dessus.
          </div>
        )}
      </section>
    </div>
  );
}

function EditableMenuItem({
  item,
  uploadMedia,
  onSave,
  onDelete,
  onError,
}: {
  item: MenuItem;
  uploadMedia: (file: File) => Promise<string>;
  onSave: (item: MenuItem, draft: MenuDraft) => Promise<boolean>;
  onDelete: (item: MenuItem) => Promise<boolean>;
  onError: (message: string | null) => void;
}) {
  const [draft, setDraft] = useState(() => itemToDraft(item));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await onSave(item, draft);
    setSaving(false);
  }

  return (
    <form
      onSubmit={save}
      className={`overflow-hidden rounded-lg border bg-[#081119] ${
        item.is_active ? "border-white/10" : "border-white/[0.06] opacity-75"
      }`}
    >
      <div className="border-b border-white/10">
        <div className="flex min-w-0 flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-primary">
                {item.category}
              </p>
              <h4 className="mt-2 truncate font-display text-2xl font-black uppercase text-white">
                {item.name}
              </h4>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[0.55rem] font-black uppercase tracking-[0.1em] text-gray-400">
              {item.is_active ? "Visible" : "Masque"}
            </span>
          </div>
          <p className="mt-3 font-display text-2xl font-black text-white">
            {item.price}{" "}
            <span className="text-sm text-primary">{item.currency}</span>
          </p>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CafeMediaField
            value={draft.mediaUrls}
            uploadMedia={uploadMedia}
            onChange={(mediaUrls) => setDraft({ ...draft, mediaUrls })}
            onUploadingChange={setUploading}
            onError={onError}
          />
        </div>
        <Field label="Nom">
          <Input
            required
            value={draft.name}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
          />
        </Field>
        <Field label="Categorie">
          <Input
            required
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value })
            }
          />
        </Field>
        <Field label="Prix">
          <Input
            required
            min="0.01"
            step="0.01"
            type="number"
            value={draft.price}
            onChange={(event) =>
              setDraft({ ...draft, price: event.target.value })
            }
          />
        </Field>
        <Field label="Ordre">
          <Input
            min="0"
            type="number"
            value={draft.order}
            onChange={(event) =>
              setDraft({ ...draft, order: event.target.value })
            }
          />
        </Field>
        <label className="space-y-2 text-xs font-black uppercase tracking-[0.12em] text-gray-400 sm:col-span-2">
          <span>Description</span>
          <textarea
            className={`${textareaClass} min-h-24`}
            value={draft.description}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
          />
        </label>
      </div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 p-4">
        <Button
          type="button"
          variant="outline"
          className="border-red-400/35 text-red-300 hover:border-red-300 hover:text-red-200"
          disabled={saving || uploading}
          onClick={() => void onDelete(item)}
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const nextDraft = { ...draft, active: !item.is_active };
            setDraft(nextDraft);
            void onSave(item, nextDraft);
          }}
        >
          {item.is_active ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {item.is_active ? "Masquer" : "Publier"}
        </Button>
        <Button type="submit" disabled={saving || uploading}>
          {saving ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

function CafeMediaField({
  value,
  uploadMedia,
  onChange,
  onUploadingChange,
  onError,
}: {
  value: string[];
  uploadMedia: (file: File) => Promise<string>;
  onChange: (value: string[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string | null) => void;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    onUploadingChange(true);
    onError(null);
    try {
      const uploadedUrls = await Promise.all(files.map(uploadMedia));
      onChange(Array.from(new Set([...value, ...uploadedUrls])).slice(0, 12));
    } catch {
      onError(
        "Les medias n'ont pas pu etre importes. Utilisez JPG, PNG, WEBP, MP4 ou WEBM.",
      );
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }

  function setAsCover(index: number) {
    const selected = value[index];
    if (!selected) return;
    onChange([
      selected,
      ...value.filter((_, itemIndex) => itemIndex !== index),
    ]);
  }

  function removeMedia(index: number) {
    if (!window.confirm("Supprimer cette photo ou video du repas ?")) return;
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <Field label="Photos ou videos du repas">
      <div className="space-y-3">
        {value.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {value.map((mediaUrl, index) => {
              const resolvedUrl = resolveApiMediaUrl(mediaUrl);
              return (
                <div
                  key={`${mediaUrl}-${index}`}
                  className="overflow-hidden rounded-sm border border-white/10 bg-black/30"
                >
                  {resolvedUrl && isCafeVideo(resolvedUrl) ? (
                    <video
                      className="h-32 w-full bg-black object-contain"
                      src={resolvedUrl}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <div
                      role="img"
                      aria-label={`Apercu media ${index + 1}`}
                      className="h-32 bg-white bg-contain bg-center bg-no-repeat"
                      style={
                        resolvedUrl
                          ? { backgroundImage: `url("${resolvedUrl}")` }
                          : undefined
                      }
                    />
                  )}
                  <div className="border-t border-white/10 p-2">
                    <div className="mb-2 min-h-6">
                      {index === 0 ? (
                        <span className="rounded-full bg-primary px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-black">
                          Couverture
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-[0.6rem] font-black uppercase tracking-[0.06em] text-primary hover:underline"
                          onClick={() => setAsCover(index)}
                        >
                          Mettre en couverture
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="flex min-h-9 items-center justify-center gap-1.5 rounded-sm border border-white/15 text-[0.6rem] font-black uppercase text-white hover:border-primary hover:text-primary"
                        onClick={() => setPreviewUrl(mediaUrl)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir
                      </button>
                      <button
                        type="button"
                        className="flex min-h-9 items-center justify-center gap-1.5 rounded-sm border border-red-400/25 text-[0.6rem] font-black uppercase text-red-300 hover:bg-red-500/10"
                        onClick={() => removeMedia(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-primary/50 px-4 text-xs font-black uppercase tracking-[0.08em] text-primary hover:bg-primary/10 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {uploading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {uploading ? "Chargement..." : "Ajouter photos ou videos"}
        </label>
        <input
          id={inputId}
          className="sr-only"
          type="file"
          multiple
          aria-label="Ajouter photos ou videos"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          disabled={uploading}
          onChange={(event) => {
            void uploadFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <p className="text-xs normal-case tracking-normal text-gray-500">
          Jusqu&apos;a 12 photos ou videos. Le premier media devient la
          couverture.
        </p>
      </div>

      {previewUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Apercu du media"
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewUrl(null);
          }}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-5xl items-center justify-center rounded-lg border border-white/15 bg-[#050a0f] p-4 sm:p-8">
            <button
              type="button"
              aria-label="Fermer l'apercu"
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black hover:bg-primary"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="h-5 w-5" />
            </button>
            {isCafeVideo(previewUrl) ? (
              <video
                src={resolveApiMediaUrl(previewUrl) ?? undefined}
                className="max-h-[78vh] w-full object-contain"
                controls
                autoPlay
              />
            ) : (
              <div
                role="img"
                aria-label="Apercu du repas"
                className="h-[78vh] w-full bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url("${resolveApiMediaUrl(previewUrl)}")`,
                }}
              />
            )}
          </div>
        </div>
      ) : null}
    </Field>
  );
}

function getCafeMediaUrls(item: Pick<MenuItem, "image_url" | "media_urls">) {
  if (item.media_urls?.length) return item.media_urls;
  return item.image_url ? [item.image_url] : [];
}

function isCafeVideo(mediaUrl: string) {
  return /\.(mp4|webm)(?:\?|$)/i.test(mediaUrl);
}

function toCreatePayload(draft: MenuDraft): MenuCreate {
  return {
    club_id: SALLE_1_ID,
    name: draft.name.trim(),
    category: draft.category.trim(),
    description: draft.description.trim() || null,
    image_url: draft.mediaUrls[0] || null,
    media_urls: draft.mediaUrls,
    price: draft.price,
    currency: draft.currency.trim().toUpperCase(),
    display_order: Number(draft.order || 0),
    is_active: draft.active,
  };
}

function itemToDraft(item: MenuItem): MenuDraft {
  return {
    name: item.name,
    category: item.category,
    description: item.description ?? "",
    mediaUrls: getCafeMediaUrls(item),
    price: item.price,
    currency: item.currency,
    order: String(item.display_order),
    active: item.is_active,
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, RefreshCw, Upload, UserRound, X } from "lucide-react";
import { Alert, Button } from "@masterz/ui";
import type { AuthSession } from "@/lib/auth";
import { authorizationHeaders } from "@/lib/auth";
import { authenticatedFetch, resolveApiMediaUrl } from "@/lib/api";
import type { User } from "./dashboard-shared";

type PhotoMember = {
  id: string;
  full_name: string;
  profile_photo_url?: string | null;
  profile_photo_verified_at?: string | null;
};

export type MemberPhotoUploadResult = {
  ok: boolean;
  message?: string;
  user?: User;
};

export function MemberAvatar({
  member,
  className = "h-16 w-16",
}: {
  member: PhotoMember;
  className?: string;
}) {
  const photoUrl = resolveApiMediaUrl(member.profile_photo_url);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [expanded]);

  const frameClass = `relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-black/30 ${member.profile_photo_verified_at ? "border-emerald-300/35" : "border-white/15"} ${className}`;

  if (!photoUrl) {
    return (
      <span className={frameClass}>
        <UserRound className="h-1/2 w-1/2 text-gray-600" />
      </span>
    );
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label={`Agrandir la photo de ${member.full_name}`}
        className={`${frameClass} cursor-zoom-in outline-none transition hover:border-primary focus-visible:ring-2 focus-visible:ring-primary`}
        onClick={(event) => {
          event.stopPropagation();
          setExpanded(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(true);
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={`Photo de ${member.full_name}`}
          className="h-full w-full object-cover"
        />
      </span>
      {expanded
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Photo de ${member.full_name}`}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 sm:p-8"
              onClick={() => setExpanded(false)}
            >
              <div
                className="relative flex h-full max-h-[90vh] w-full max-w-5xl items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-[#071018] p-3 shadow-2xl sm:p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label="Fermer la photo"
                  className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setExpanded(false)}
                >
                  <X className="h-6 w-6" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt={`Photo agrandie de ${member.full_name}`}
                  className="max-h-full max-w-full rounded-md object-contain"
                />
                <p className="absolute bottom-4 left-1/2 max-w-[75%] -translate-x-1/2 rounded-full border border-white/10 bg-black/75 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.08em] text-white">
                  {member.full_name}
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function MemberPhotoCapture({
  session,
  member,
  onUploaded,
  uploadOverride,
  onValidated,
  compact = false,
}: {
  session?: AuthSession;
  member: PhotoMember;
  onUploaded?: (user: User) => void;
  uploadOverride?: (photo: Blob) => Promise<MemberPhotoUploadResult>;
  onValidated?: () => void;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setCameraOpen(false);
  }

  function clearPendingPhoto() {
    setPendingPhoto(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const timeoutId = window.setTimeout(() => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        setFeedback(
          "La camera est ouverte mais l'image ne demarre pas. Fermez-la puis reessayez ou importez une photo.",
        );
      }
    }, 5000);
    void video.play().catch(() => {
      setFeedback(
        "L'image de la camera n'a pas pu demarrer. Fermez-la puis reessayez.",
      );
    });
    return () => window.clearTimeout(timeoutId);
  }, [cameraOpen]);

  async function openCamera() {
    setFeedback(null);
    clearPendingPhoto();
    if (!navigator.mediaDevices?.getUserMedia) {
      setFeedback(
        "Camera indisponible sur cet appareil. Importez une photo a la place.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraReady(false);
      setCameraOpen(true);
    } catch {
      setFeedback(
        "La camera n'a pas pu etre ouverte. Autorisez-la ou importez une photo.",
      );
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (
      !video ||
      !canvas ||
      !cameraReady ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setFeedback("Attendez que la camera affiche le visage avant la photo.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        clearPendingPhoto();
        setPendingPhoto(blob);
        setPreviewUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92,
    );
  }

  function importPhoto(file: File | undefined) {
    if (!file) return;
    stopCamera();
    clearPendingPhoto();
    setFeedback(null);
    setPendingPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadPhoto() {
    if (!pendingPhoto) return;
    setBusy(true);
    setFeedback(null);
    if (uploadOverride) {
      try {
        const result = await uploadOverride(pendingPhoto);
        if (!result.ok) {
          setFeedback(result.message ?? "La photo n'a pas pu etre validee.");
          return;
        }
        clearPendingPhoto();
        if (result.user) onUploaded?.(result.user);
        setFeedback(
          result.message ?? "Photo de visage validee et enregistree.",
        );
        onValidated?.();
      } catch {
        setFeedback("Le serveur est indisponible. Reessayez dans un instant.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!session) {
      setFeedback(
        "La verification de votre identite a expire. Recommencez l'activation.",
      );
      setBusy(false);
      return;
    }
    const body = new FormData();
    body.append("photo", pendingPhoto, "photo-membre.jpg");
    try {
      const response = await authenticatedFetch(
        `/api/v1/users/${member.id}/profile-photo`,
        {
          method: "POST",
          headers: authorizationHeaders(session.accessToken),
          body,
        },
      );
      const payload = (await response.json()) as
        User | { detail?: { message?: string } };
      if (!response.ok) {
        const message =
          "detail" in payload
            ? payload.detail?.message
            : "La photo n'a pas pu etre validee.";
        setFeedback(message ?? "La photo n'a pas pu etre validee.");
        return;
      }
      clearPendingPhoto();
      onUploaded?.(payload as User);
      setFeedback("Photo de visage validee et enregistree.");
      onValidated?.();
    } catch {
      setFeedback("Le serveur est indisponible. Reessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  const verified = Boolean(
    member.profile_photo_url && member.profile_photo_verified_at,
  );

  return (
    <section
      className={`rounded-md border p-4 ${verified ? "border-emerald-300/25 bg-emerald-300/[0.04]" : "border-amber-300/30 bg-amber-300/[0.05]"}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {previewUrl ? (
          <span className="h-28 w-28 shrink-0 overflow-hidden rounded-md border border-primary/40 bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Apercu de la photo choisie"
              className="h-full w-full object-cover"
            />
          </span>
        ) : (
          <MemberAvatar
            member={member}
            className={compact ? "h-20 w-20" : "h-28 w-28"}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {verified ? (
              <Check className="h-5 w-5 text-emerald-300" />
            ) : (
              <Camera className="h-5 w-5 text-amber-200" />
            )}
            <h3 className="font-black uppercase text-white">
              {verified ? "Photo membre validee" : "Photo visage obligatoire"}
            </h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            {verified
              ? "Le visage est visible dans le dossier. Vous pouvez remplacer la photo si necessaire."
              : "Avant la premiere entree, prenez ou importez une photo nette avec un seul visage bien eclaire."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={openCamera} disabled={busy}>
              <Camera className="h-4 w-4" /> Ouvrir la camera
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              <Upload className="h-4 w-4" /> Importer
            </Button>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              aria-label="Importer une photo visage"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              onChange={(event) => importPhoto(event.target.files?.[0])}
            />
          </div>
        </div>
      </div>

      {cameraOpen ? (
        <div className="mt-4 overflow-hidden rounded-md border border-primary/30 bg-black p-3">
          <div className="relative mx-auto aspect-[4/3] max-w-2xl overflow-hidden rounded-sm bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              onPlaying={() => {
                setCameraReady(true);
                setFeedback(null);
              }}
              className="h-full w-full -scale-x-100 object-cover"
            />
            {!cameraReady ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs font-black uppercase tracking-[0.1em] text-gray-300">
                Demarrage de la camera...
              </div>
            ) : null}
            <div className="pointer-events-none absolute inset-[12%_25%] rounded-[50%] border-2 border-primary/70" />
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={capturePhoto}>
              <Camera className="h-4 w-4" /> Prendre la photo
            </Button>
            <Button type="button" variant="secondary" onClick={stopCamera}>
              <X className="h-4 w-4" /> Fermer
            </Button>
          </div>
        </div>
      ) : null}

      {pendingPhoto ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <Button type="button" onClick={uploadPhoto} disabled={busy}>
            <Check className="h-4 w-4" />
            {busy ? "Verification..." : "Valider cette photo"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={clearPendingPhoto}
            disabled={busy}
          >
            <RefreshCw className="h-4 w-4" /> Recommencer
          </Button>
        </div>
      ) : null}
      {feedback ? (
        <div className="mt-4">
          <Alert type="info" message={feedback} />
        </div>
      ) : null}
      <canvas ref={canvasRef} className="hidden" />
    </section>
  );
}

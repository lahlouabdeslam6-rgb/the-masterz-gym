"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ImageIcon,
  MessageCircleMore,
  Mic,
  RefreshCw,
  Send,
  ShieldCheck,
  Square,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { components } from "@masterz/api-client";
import { Alert, Button, Input, LoadingMessage, Pill } from "@masterz/ui";
import { authenticatedFetch, resolveApiMediaUrl } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { EmptyState, textareaClass } from "./dashboard-shared";

type Conversation = components["schemas"]["CoachingConversationRead"];
type Message = components["schemas"]["CoachingMessageRead"];

export function CoachingConversationPanel({
  session,
  readOnly = false,
}: {
  session: AuthSession;
  readOnly?: boolean;
}) {
  const headers = useMemo(
    () => authorizationHeaders(session.accessToken),
    [session.accessToken],
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);
  const audioPreviewUrlRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    const response = await authenticatedFetch(
      "/api/v1/coaching/conversations",
      {
        headers,
      },
    );
    if (!response.ok) {
      setFeedback("Les conversations coaching n'ont pas pu etre chargees.");
      setLoading(false);
      return;
    }
    const loaded = (await response.json()) as Conversation[];
    setConversations(loaded);
    setSelectedId((current) =>
      loaded.some((item) => item.assignment_id === current)
        ? current
        : (loaded[0]?.assignment_id ?? ""),
    );
    setLoading(false);
  }, [headers]);

  const loadMessages = useCallback(
    async (assignmentId: string, quiet = false) => {
      if (!assignmentId) {
        setMessages([]);
        return;
      }
      if (!quiet) setLoadingMessages(true);
      const response = await authenticatedFetch(
        `/api/v1/coaching/conversations/${assignmentId}/messages?limit=300`,
        { headers },
      );
      if (response.ok) {
        setMessages((await response.json()) as Message[]);
        setFeedback(null);
      } else if (!quiet) {
        setFeedback(
          "Les messages de cette conversation n'ont pas pu etre charges.",
        );
      }
      if (!quiet) setLoadingMessages(false);
    },
    [headers],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadConversations(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    const timeoutId = window.setTimeout(() => void loadMessages(selectedId), 0);
    const intervalId = window.setInterval(
      () => void loadMessages(selectedId, true),
      15_000,
    );
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [loadMessages, selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioPreviewUrlRef.current) {
        URL.revokeObjectURL(audioPreviewUrlRef.current);
      }
    };
  }, []);

  const selected = conversations.find(
    (item) => item.assignment_id === selectedId,
  );
  const visibleConversations = conversations.filter((conversation) =>
    `${conversation.member_name} ${conversation.member_number} ${conversation.coach_name}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );

  async function sendMessage() {
    if (!selectedId || recording || (!body.trim() && !media)) return;
    setSending(true);
    setFeedback(null);
    const form = new FormData();
    if (body.trim()) form.set("body", body.trim());
    if (media) form.set("media", media);
    const response = await authenticatedFetch(
      `/api/v1/coaching/conversations/${selectedId}/messages`,
      { method: "POST", headers, body: form },
    );
    setSending(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        detail?: { message?: string };
      } | null;
      setFeedback(
        payload?.detail?.message ?? "Le message n'a pas pu etre envoye.",
      );
      return;
    }
    setBody("");
    setMedia(null);
    clearAudioPreview();
    await Promise.all([loadMessages(selectedId), loadConversations()]);
  }

  function clearAudioPreview() {
    if (audioPreviewUrlRef.current) {
      URL.revokeObjectURL(audioPreviewUrlRef.current);
      audioPreviewUrlRef.current = null;
    }
    setAudioPreviewUrl(null);
  }

  function choosePhoto(file: File | null) {
    clearAudioPreview();
    setMedia(file);
  }

  function stopMicrophone() {
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
  }

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  async function startRecording() {
    setFeedback(null);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setFeedback("Ce navigateur ne permet pas l'enregistrement audio direct.");
      return;
    }
    const supportedMimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    if (!supportedMimeType) {
      setFeedback("Ce navigateur ne propose pas un format audio compatible.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
      });
      clearAudioPreview();
      setMedia(null);
      microphoneStreamRef.current = stream;
      recorderRef.current = recorder;
      recordingChunksRef.current = [];
      discardRecordingRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopRecordingTimer();
        stopMicrophone();
        setRecording(false);
        if (discardRecordingRef.current) {
          recordingChunksRef.current = [];
          return;
        }
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType,
        });
        recordingChunksRef.current = [];
        if (!blob.size) {
          setFeedback("Aucun son n'a ete enregistre. Reessayez.");
          return;
        }
        const extension = recorder.mimeType.startsWith("audio/mp4")
          ? "m4a"
          : "webm";
        const file = new File(
          [blob],
          `message-audio-${Date.now()}.${extension}`,
          {
            type: recorder.mimeType.split(";")[0],
          },
        );
        const previewUrl = URL.createObjectURL(blob);
        audioPreviewUrlRef.current = previewUrl;
        setAudioPreviewUrl(previewUrl);
        setMedia(file);
      };
      recorder.start(250);
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = setInterval(
        () => setRecordingSeconds((current) => current + 1),
        1000,
      );
    } catch {
      stopMicrophone();
      setFeedback(
        "Le microphone n'a pas pu etre ouvert. Autorisez son acces puis reessayez.",
      );
    }
  }

  function finishRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  function cancelRecording() {
    discardRecordingRef.current = true;
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  function removeMedia() {
    clearAudioPreview();
    setMedia(null);
  }

  if (loading) {
    return (
      <LoadingMessage message="Chargement des conversations coaching..." />
    );
  }

  return (
    <div className="space-y-4">
      {readOnly ? (
        <div className="flex items-start gap-3 rounded-sm border border-primary/25 bg-primary/[0.06] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-black text-white">Supervision Admin</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Vous pouvez consulter les echanges pour le suivi et la securite.
              Seuls le coach et son client peuvent ecrire ici.
            </p>
          </div>
        </div>
      ) : null}
      {feedback ? <Alert type="error" message={feedback} /> : null}

      <div className="grid min-h-[38rem] overflow-hidden rounded-lg border border-white/10 bg-[#050b10] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-[#081119] xl:border-b-0 xl:border-r">
          <div className="border-b border-white/10 p-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">
              Conversations coaching
            </p>
            <Input
              aria-label="Rechercher une conversation coaching"
              className="mt-3"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Client, numero ou coach"
            />
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto p-3 xl:max-h-[34rem]">
            {visibleConversations.length ? (
              visibleConversations.map((conversation) => {
                const active = selectedId === conversation.assignment_id;
                const primaryName =
                  session.user.role === "member"
                    ? conversation.coach_name
                    : conversation.member_name;
                return (
                  <button
                    key={conversation.assignment_id}
                    type="button"
                    onClick={() => setSelectedId(conversation.assignment_id)}
                    className={`w-full rounded-sm border p-4 text-left transition ${
                      active
                        ? "border-primary bg-primary/[0.1]"
                        : "border-white/10 bg-black/20 hover:border-primary/35"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-white">
                          {primaryName}
                        </span>
                        <span className="mt-1 block truncate text-xs text-gray-600">
                          {session.user.role === "admin"
                            ? `${conversation.coach_name} · ${conversation.member_number}`
                            : conversation.member_number}
                        </span>
                        <span className="mt-2 block truncate text-xs text-gray-500">
                          {conversation.last_message?.body ??
                            (conversation.last_message?.media_type === "audio"
                              ? "Message audio"
                              : conversation.last_message?.media_type ===
                                  "image"
                                ? "Photo"
                                : "Aucun message")}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyState text="Aucune conversation coaching." />
            )}
          </div>
        </aside>

        <section className="flex min-h-[38rem] min-w-0 flex-col">
          {selected ? (
            <>
              <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#081119]/80 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-black text-white">
                    {selected.member_name}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    Coach {selected.coach_name} · {selected.member_number}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill>{selected.is_active ? "Suivi actif" : "Fermee"}</Pill>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Actualiser les messages"
                    onClick={() => void loadMessages(selected.assignment_id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6 xl:max-h-[29rem]">
                {loadingMessages ? (
                  <LoadingMessage message="Chargement des messages..." />
                ) : messages.length ? (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      mine={message.sender_id === session.user.id}
                      adminView={readOnly}
                    />
                  ))
                ) : (
                  <EmptyState text="Aucun message. Commencez la conversation avec votre coach ou votre client." />
                )}
                <div ref={endRef} />
              </div>

              {!readOnly && selected.is_active ? (
                <footer className="border-t border-white/10 bg-[#081119] p-4">
                  {media ? (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-primary/25 bg-primary/[0.06] px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-white">
                          {media.type.startsWith("audio/")
                            ? "Audio pret"
                            : "Photo"}{" "}
                          · {media.name}
                        </span>
                        {audioPreviewUrl ? (
                          <audio
                            className="mt-2 h-9 w-full max-w-sm"
                            controls
                            src={audioPreviewUrl}
                          />
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label="Retirer le fichier"
                        className="text-gray-500 hover:text-white"
                        onClick={removeMedia}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                  <textarea
                    aria-label="Message coaching"
                    className={`${textareaClass} min-h-20`}
                    value={body}
                    maxLength={4000}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Ecrivez a votre coach ou votre client..."
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      ref={imageInput}
                      className="hidden"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        choosePhoto(event.target.files?.[0] ?? null)
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => imageInput.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4" /> Photo
                    </Button>
                    {recording ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-9 items-center gap-2 rounded-sm border border-red-400/30 bg-red-400/10 px-3 text-[0.7rem] font-black uppercase text-red-200">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                          {formatRecordingTime(recordingSeconds)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={finishRecording}
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />{" "}
                          Stopper
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={cancelRecording}
                        >
                          <Trash2 className="h-4 w-4" /> Annuler
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void startRecording()}
                      >
                        <Mic className="h-4 w-4" />{" "}
                        {audioPreviewUrl ? "Refaire l'audio" : "Micro"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="ml-auto"
                      disabled={
                        sending || recording || (!body.trim() && !media)
                      }
                      onClick={() => void sendMessage()}
                    >
                      <Send className="h-4 w-4" /> Envoyer
                    </Button>
                  </div>
                </footer>
              ) : null}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState text="Choisissez une conversation pour voir les messages." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function formatRecordingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function MessageBubble({
  message,
  mine,
  adminView,
}: {
  message: Message;
  mine: boolean;
  adminView: boolean;
}) {
  const mediaUrl = resolveApiMediaUrl(message.media_url);
  return (
    <article
      className={`flex ${mine && !adminView ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[88%] rounded-lg border p-4 sm:max-w-[72%] ${
          mine && !adminView
            ? "border-primary/35 bg-primary/[0.12]"
            : "border-white/10 bg-white/[0.035]"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <MessageCircleMore className="h-4 w-4 text-primary" />
          <span className="text-xs font-black text-white">
            {message.sender_name}
          </span>
          {adminView ? (
            <span className="text-[0.65rem] font-bold uppercase text-gray-600">
              {message.sender_role === "coach" ? "Coach" : "Client"}
            </span>
          ) : null}
        </div>
        {message.body ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-300">
            {message.body}
          </p>
        ) : null}
        {message.media_type === "image" && mediaUrl ? (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block overflow-hidden rounded-sm border border-white/10 bg-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl}
              alt="Photo partagee dans le suivi coaching"
              className="max-h-72 w-full object-contain"
            />
          </a>
        ) : null}
        {message.media_type === "audio" && mediaUrl ? (
          <audio className="mt-3 w-full min-w-56" controls preload="metadata">
            <source src={mediaUrl} />
          </audio>
        ) : null}
        <time className="mt-3 block text-[0.65rem] text-gray-600">
          {new Intl.DateTimeFormat("fr-MA", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(message.created_at))}
        </time>
      </div>
    </article>
  );
}

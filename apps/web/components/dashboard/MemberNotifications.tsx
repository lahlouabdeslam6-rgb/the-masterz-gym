"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronRight } from "lucide-react";
import type { components } from "@masterz/api-client";
import { Button, Card, Pill } from "@masterz/ui";
import { api } from "@/lib/api";
import { authorizationHeaders, type AuthSession } from "@/lib/auth";
import { notifyNavigationBadgesChanged } from "@/lib/navigation-badges";
import { EmptyState, formatDate } from "./dashboard-shared";

type Notification = components["schemas"]["NotificationRead"];

export function MemberNotifications({
  session,
  onOpen,
}: {
  session: AuthSession;
  onOpen?: (kind: string) => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const headers = useMemo(
    () => authorizationHeaders(session.accessToken),
    [session.accessToken],
  );

  useEffect(() => {
    let active = true;
    async function load() {
      const notificationsResult = await api.GET("/api/v1/notifications", {
        headers,
        params: { query: { unread_only: false, limit: 20 } },
      });
      const readResult = await api.PATCH("/api/v1/notifications/read-all", {
        headers,
      });
      if (active) {
        setNotifications(
          Array.isArray(notificationsResult.data)
            ? notificationsResult.data.map((notification) => ({
                ...notification,
                read_at:
                  notification.read_at ??
                  (readResult.data ? new Date().toISOString() : null),
              }))
            : [],
        );
        setLoading(false);
        notifyNavigationBadgesChanged();
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [headers]);

  async function markRead(notificationId: string) {
    setBusyId(notificationId);
    const result = await api.PATCH(
      "/api/v1/notifications/{notification_id}/read",
      {
        headers,
        params: { path: { notification_id: notificationId } },
      },
    );
    setBusyId(null);
    if (!result.data) return;
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === result.data?.id ? result.data : notification,
      ),
    );
    notifyNavigationBadgesChanged();
  }

  async function openNotification(notification: Notification) {
    if (!notification.read_at) await markRead(notification.id);
    onOpen?.(notification.kind);
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement...</p>;
  }
  if (notifications.length === 0) {
    return <EmptyState text="Aucune notification pour le moment." />;
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at,
  ).length;
  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex justify-end">
        <Pill>{unreadCount} non lue(s)</Pill>
      </div>
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          role={onOpen ? "button" : undefined}
          tabIndex={onOpen ? 0 : undefined}
          onClick={
            onOpen ? () => void openNotification(notification) : undefined
          }
          onKeyDown={
            onOpen
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void openNotification(notification);
                  }
                }
              : undefined
          }
          className={`p-5 ${onOpen ? "cursor-pointer transition hover:border-primary hover:bg-primary/[0.07]" : ""} ${notification.read_at ? "opacity-65" : "border-primary/35 bg-primary/[0.04]"}`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <Bell className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-black text-white">{notification.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {notification.body}
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  {formatDate(notification.created_at)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {!notification.read_at ? (
                <Button
                  variant="outline"
                  disabled={busyId === notification.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    void markRead(notification.id);
                  }}
                >
                  <Check className="h-4 w-4" /> Marquer comme lue
                </Button>
              ) : null}
              {onOpen ? (
                <span className="flex h-10 w-10 items-center justify-center rounded-sm border border-primary/25 text-primary">
                  <ChevronRight className="h-5 w-5" />
                </span>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { components } from "@masterz/api-client";
import { api } from "./api";
import { authorizationHeaders, type AuthSession } from "./auth";

type Notification = components["schemas"]["NotificationRead"];

export type NavigationBadgeKey =
  | "notifications"
  | "messages"
  | "applications"
  | "coaching"
  | "schedule"
  | "clients"
  | "recovery"
  | "complaints"
  | "store";

export type NavigationBadges = Partial<Record<NavigationBadgeKey, number>>;

export const NAVIGATION_BADGES_CHANGED_EVENT =
  "masterz:navigation-badges-changed";

export function notifyNavigationBadgesChanged() {
  window.dispatchEvent(new Event(NAVIGATION_BADGES_CHANGED_EVENT));
}

export function useNavigationBadges(
  session: AuthSession | null,
  refreshKey = "",
) {
  const [badges, setBadges] = useState<NavigationBadges>({});
  const rawBadges = useRef<NavigationBadges>({});
  const dismissedCounts = useRef<NavigationBadges>({});
  const rawNotifications = useRef<Notification[]>([]);

  const showBadges = useCallback((nextBadges: NavigationBadges) => {
    rawBadges.current = nextBadges;
    const visibleBadges: NavigationBadges = {};
    (Object.keys(nextBadges) as NavigationBadgeKey[]).forEach((key) => {
      const currentCount = nextBadges[key] ?? 0;
      const dismissedCount = dismissedCounts.current[key] ?? 0;
      if (currentCount < dismissedCount) {
        dismissedCounts.current[key] = currentCount;
      }
      const visibleCount = currentCount - (dismissedCounts.current[key] ?? 0);
      if (visibleCount > 0) visibleBadges[key] = visibleCount;
    });
    setBadges(visibleBadges);
  }, []);

  const showNotificationBadges = useCallback(
    (notifications: Notification[], role: "member" | "coach") => {
      const idsByBadge = notificationIdsByBadge(notifications, role);
      rawNotifications.current = notifications;
      const visibleBadges: NavigationBadges = {};
      (Object.keys(idsByBadge) as NavigationBadgeKey[]).forEach((key) => {
        const visibleCount = idsByBadge[key]?.length ?? 0;
        if (visibleCount > 0) visibleBadges[key] = visibleCount;
      });
      setBadges(visibleBadges);
    },
    [],
  );

  const load = useCallback(async () => {
    if (!session) {
      setBadges({});
      return;
    }

    const headers = authorizationHeaders(session.accessToken);

    if (session.user.role === "member" || session.user.role === "coach") {
      const result = await api.GET("/api/v1/notifications", {
        headers,
        params: { query: { unread_only: true, limit: 100 } },
      });
      const notifications = Array.isArray(result.data)
        ? (result.data as Notification[])
        : [];
      showNotificationBadges(notifications, session.user.role);
      return;
    }

    if (session.user.role === "admin" || session.user.role === "receptionist") {
      const [applications, assignments, bookings, complaints, reservations] =
        await Promise.all([
          api.GET("/api/v1/membership-applications", { headers }),
          api.GET("/api/v1/coaching/assignment-requests", {
            headers,
            params: { query: { request_status: "pending", limit: 100 } },
          }),
          api.GET("/api/v1/coaching/bookings", {
            headers,
            params: { query: { booking_status: "requested", limit: 100 } },
          }),
          api.GET("/api/v1/complaints", {
            headers,
            params: { query: { limit: 100 } },
          }),
          api.GET("/api/v1/store/reservations", {
            headers,
            params: { query: { limit: 100 } },
          }),
        ]);

      showBadges({
        applications: (applications.data ?? []).filter((application) =>
          ["pending", "more_information_required"].includes(application.status),
        ).length,
        coaching:
          (assignments.data ?? []).length + (bookings.data ?? []).length,
        complaints: (complaints.data ?? []).filter((complaint) =>
          ["open", "in_progress"].includes(complaint.status),
        ).length,
        store: (reservations.data ?? []).filter(
          (reservation) => reservation.status === "pending",
        ).length,
      });
      return;
    }

    setBadges({});
  }, [session, showBadges, showNotificationBadges]);

  const clearBadge = useCallback(
    (key: NavigationBadgeKey) => {
      if (session?.user.role === "member" || session?.user.role === "coach") {
        const headers = authorizationHeaders(session.accessToken);
        const notificationIds =
          notificationIdsByBadge(rawNotifications.current, session.user.role)[
            key
          ] ?? [];
        if (notificationIds.length) {
          const request =
            key === "notifications"
              ? api.PATCH("/api/v1/notifications/read-all", { headers })
              : Promise.all(
                  notificationIds.map((notificationId) =>
                    api.PATCH("/api/v1/notifications/{notification_id}/read", {
                      headers,
                      params: { path: { notification_id: notificationId } },
                    }),
                  ),
                );
          void request.then(() => notifyNavigationBadgesChanged());
        }
      } else {
        dismissedCounts.current[key] = rawBadges.current[key] ?? 0;
      }
      setBadges((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [session],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    const reload = () => void load();
    const reloadAfterChange = () => void load();
    window.addEventListener(NAVIGATION_BADGES_CHANGED_EVENT, reloadAfterChange);
    window.addEventListener("focus", reload);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(
        NAVIGATION_BADGES_CHANGED_EVENT,
        reloadAfterChange,
      );
      window.removeEventListener("focus", reload);
    };
  }, [load, refreshKey]);

  return { badges, clearBadge, reload: load };
}

function notificationIdsByBadge(
  notifications: Notification[],
  role: "member" | "coach",
): Partial<Record<NavigationBadgeKey, string[]>> {
  const ids = (predicate: (notification: Notification) => boolean) =>
    notifications.filter(predicate).map((notification) => notification.id);

  if (role === "coach") {
    return {
      notifications: notifications.map((notification) => notification.id),
      schedule: ids(
        (notification) => notification.kind === "coaching_booking_requested",
      ),
      clients: ids(
        (notification) => notification.kind === "coaching_member_assigned",
      ),
      messages: ids(
        (notification) => notification.kind === "coaching_message_received",
      ),
    };
  }

  return {
    notifications: notifications.map((notification) => notification.id),
    coaching: ids((notification) => notification.kind.startsWith("coaching_")),
    recovery: ids((notification) => notification.kind.startsWith("recovery_")),
    complaints: ids((notification) =>
      notification.kind.startsWith("complaint_"),
    ),
    store: ids((notification) => notification.kind.startsWith("store_")),
  };
}

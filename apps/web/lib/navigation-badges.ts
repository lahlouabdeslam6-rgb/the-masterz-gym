"use client";

import { useCallback, useEffect, useState } from "react";
import type { components } from "@masterz/api-client";
import { api } from "./api";
import { authorizationHeaders, type AuthSession } from "./auth";

type Notification = components["schemas"]["NotificationRead"];

export type NavigationBadgeKey =
  | "notifications"
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
      const notifications = (result.data ?? []) as Notification[];
      setBadges(notificationBadges(notifications, session.user.role));
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

      setBadges({
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
  }, [session]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    const reload = () => void load();
    window.addEventListener(NAVIGATION_BADGES_CHANGED_EVENT, reload);
    window.addEventListener("focus", reload);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(NAVIGATION_BADGES_CHANGED_EVENT, reload);
      window.removeEventListener("focus", reload);
    };
  }, [load, refreshKey]);

  return { badges, reload: load };
}

function notificationBadges(
  notifications: Notification[],
  role: "member" | "coach",
): NavigationBadges {
  const count = (predicate: (notification: Notification) => boolean) =>
    notifications.filter(predicate).length;

  if (role === "coach") {
    return {
      notifications: notifications.length,
      schedule: count(
        (notification) => notification.kind === "coaching_booking_requested",
      ),
      clients: count(
        (notification) => notification.kind === "coaching_member_assigned",
      ),
    };
  }

  return {
    notifications: notifications.length,
    coaching: count((notification) =>
      notification.kind.startsWith("coaching_"),
    ),
    recovery: count((notification) =>
      notification.kind.startsWith("recovery_"),
    ),
    complaints: count((notification) =>
      notification.kind.startsWith("complaint_"),
    ),
    store: count((notification) => notification.kind.startsWith("store_")),
  };
}

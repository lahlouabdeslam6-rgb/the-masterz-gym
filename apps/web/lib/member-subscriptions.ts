"use client";

import { useCallback, useEffect, useState } from "react";
import type { components } from "@masterz/api-client";
import { api } from "./api";
import {
  AUTH_CHANGED_EVENT,
  authorizationHeaders,
  getSession,
  type AuthSession,
} from "./auth";

export type MemberSubscription = components["schemas"]["SubscriptionRead"];
export type ServiceType = components["schemas"]["ServiceType"];

const currentStatuses = new Set(["active", "expiring_soon", "grace_period"]);

export function isCurrentSubscription(subscription: MemberSubscription) {
  const status = subscription.effective_status ?? subscription.status;
  if (!currentStatuses.has(status)) return false;
  return !(
    subscription.service_type === "recovery" &&
    subscription.remaining_sessions === 0
  );
}

export function useMemberSubscriptions() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const current = getSession();
    setSession(current);

    if (!current || current.user.role !== "member") {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await api.GET("/api/v1/members/{member_id}/subscriptions", {
      headers: authorizationHeaders(current.accessToken),
      params: { path: { member_id: current.user.id } },
    });
    setSubscriptions(result.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    const reload = () => void load();
    window.addEventListener(AUTH_CHANGED_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(AUTH_CHANGED_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, [load]);

  return { session, subscriptions, loading, reload: load };
}

export function currentSubscriptionFor(
  subscriptions: MemberSubscription[],
  serviceType: ServiceType,
) {
  return subscriptions.find(
    (subscription) =>
      subscription.service_type === serviceType &&
      isCurrentSubscription(subscription),
  );
}

export function latestSubscriptionFor(
  subscriptions: MemberSubscription[],
  serviceType: ServiceType,
) {
  return subscriptions.find(
    (subscription) => subscription.service_type === serviceType,
  );
}

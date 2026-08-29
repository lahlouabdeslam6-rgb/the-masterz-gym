"use client";

import { useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import type { components } from "@masterz/api-client";
import { formatDate } from "./dashboard-shared";

type Notification = components["schemas"]["NotificationRead"];

export function AccountNotificationBell({
  accountLabel,
  notifications,
  unreadCount,
  testId,
  onClear,
  onOpenNotification,
}: {
  accountLabel: "membre" | "coach";
  notifications: Notification[];
  unreadCount: number;
  testId: string;
  onClear: () => void;
  onOpenNotification: (kind: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleNotifications, setVisibleNotifications] = useState<
    Notification[]
  >([]);

  function toggleNotifications() {
    if (!open) {
      setVisibleNotifications(notifications);
      onClear();
    }
    setOpen((current) => !current);
  }

  return (
    <div className="fixed right-5 top-5 z-50 sm:right-8 sm:top-6">
      <button
        type="button"
        aria-label={`Notifications ${accountLabel}`}
        aria-expanded={open}
        onClick={toggleNotifications}
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#081119] text-white shadow-2xl transition hover:border-primary hover:text-primary"
      >
        <Bell className="h-5 w-5" />
        {unreadCount ? (
          <span
            data-testid={testId}
            className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1 text-[0.62rem] font-black text-black"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-white/15 bg-[#081119] shadow-2xl">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Notifications {accountLabel}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Ouvrez une alerte pour aller directement a la rubrique concernee.
            </p>
          </div>
          <div className="max-h-[min(30rem,70vh)] overflow-y-auto p-2">
            {visibleNotifications.length ? (
              visibleNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenNotification(notification.kind);
                  }}
                  className="flex w-full items-start gap-3 rounded-md border border-transparent px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.07]"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bell className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm text-white">
                      {notification.title}
                    </strong>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-gray-500">
                      {notification.body}
                    </span>
                    <span className="mt-1.5 block text-[0.65rem] text-gray-600">
                      {formatDate(notification.created_at)}
                    </span>
                  </span>
                  <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-primary" />
                </button>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                Aucune nouvelle notification.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

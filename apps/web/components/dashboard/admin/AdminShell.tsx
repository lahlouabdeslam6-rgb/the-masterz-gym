"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  Bell,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Coffee,
  CreditCard,
  Dumbbell,
  FileClock,
  Gauge,
  KeyRound,
  LogOut,
  Menu,
  MessageSquareWarning,
  Megaphone,
  ShoppingBag,
  Settings2,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  Waves,
  X,
} from "lucide-react";
import { Alert, LoadingMessage, Pill, buttonStyles } from "@masterz/ui";
import { BrandLogo } from "@/components/BrandLogo";
import { api } from "@/lib/api";
import {
  type NavigationBadgeKey,
  type NavigationBadges,
  useNavigationBadges,
} from "@/lib/navigation-badges";
import {
  AUTH_CHANGED_EVENT,
  authorizationHeaders,
  clearSession,
  dashboardPath,
  getSession,
  updateSessionUser,
  type AuthSession,
} from "@/lib/auth";

type AdminNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: NavigationBadgeKey;
};

type AdminNavigationGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: AdminNavigationItem[];
};

const adminOverview: AdminNavigationItem = {
  label: "Vue d'ensemble",
  href: "/espace/admin",
  icon: Gauge,
};

const navigationGroups: AdminNavigationGroup[] = [
  {
    id: "people",
    label: "Equipe & membres",
    icon: UsersRound,
    items: [
      {
        label: "Utilisateurs",
        href: "/espace/admin/utilisateurs",
        icon: UserRoundCog,
      },
      { label: "Membres", href: "/espace/admin/membres", icon: UsersRound },
      {
        label: "Coachs",
        href: "/espace/admin/coachs",
        icon: Dumbbell,
        badgeKey: "coaching",
      },
    ],
  },
  {
    id: "memberships",
    label: "Abonnements & caisse",
    icon: CreditCard,
    items: [
      {
        label: "Demandes",
        href: "/espace/admin/demandes",
        icon: ClipboardCheck,
        badgeKey: "applications",
      },
      { label: "Formules", href: "/espace/admin/formules", icon: CreditCard },
      {
        label: "Promotions",
        href: "/espace/admin/promotions",
        icon: Megaphone,
      },
      {
        label: "Paiements",
        href: "/espace/admin/paiements",
        icon: BadgeDollarSign,
      },
      { label: "Entrees", href: "/espace/admin/acces", icon: ShieldCheck },
    ],
  },
  {
    id: "services",
    label: "Services & suivi",
    icon: Waves,
    items: [
      {
        label: "Cours Salle 2",
        href: "/espace/admin/cours-collectifs",
        icon: CalendarRange,
      },
      { label: "Recovery", href: "/espace/admin/recovery", icon: Waves },
      {
        label: "Reclamations",
        href: "/espace/admin/reclamations",
        icon: MessageSquareWarning,
        badgeKey: "complaints",
      },
    ],
  },
  {
    id: "purchases",
    label: "Achats",
    icon: ShoppingBag,
    items: [
      {
        label: "Store",
        href: "/espace/admin/store",
        icon: ShoppingBag,
        badgeKey: "store",
      },
      { label: "Healthy Cafe", href: "/espace/admin/cafe", icon: Coffee },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: Settings2,
    items: [
      {
        label: "Parametres",
        href: "/espace/admin/parametres",
        icon: Settings2,
      },
      {
        label: "Journal d'audit",
        href: "/espace/admin/audit",
        icon: FileClock,
      },
    ],
  },
];

type AdminSessionContextValue = {
  session: AuthSession;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(
  null,
);

export function useAdminSession() {
  const context = useContext(AdminSessionContext);
  if (!context)
    throw new Error("useAdminSession doit etre utilise dans AdminShell");
  return context;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { badges, clearBadge } = useNavigationBadges(session, pathname);

  useEffect(() => {
    let active = true;

    function syncStoredSession() {
      if (!active) return;
      const current = getSession();
      if (!current) {
        setSession(null);
        setError("Votre session a expire. Reconnectez-vous pour continuer.");
        router.replace("/connexion");
        return;
      }
      if (current.user.role === "admin") setSession(current);
    }

    window.addEventListener(AUTH_CHANGED_EVENT, syncStoredSession);

    async function validateSession() {
      const current = getSession();
      if (!current) {
        router.replace("/connexion");
        return;
      }
      if (current.user.role !== "admin") {
        router.replace(dashboardPath(current.user.role));
        return;
      }

      try {
        const result = await api.GET("/api/v1/users/me", {
          headers: authorizationHeaders(current.accessToken),
        });
        if (!active) return;

        if (!result.data || result.data.role !== "admin") {
          clearSession();
          setError("Votre session a expire. Reconnectez-vous pour continuer.");
          setLoading(false);
          return;
        }

        updateSessionUser(result.data);
        setSession({ ...current, user: result.data });
        setLoading(false);
      } catch {
        if (!active) return;
        setError("Le serveur est indisponible. Reessayez dans un instant.");
        setLoading(false);
      }
    }

    void validateSession();
    return () => {
      active = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, syncStoredSession);
    };
  }, [router]);

  async function logout() {
    if (session) {
      await api.POST("/api/v1/auth/logout", {
        headers: authorizationHeaders(session.accessToken),
        body: { refresh_token: session.refreshToken },
      });
    }
    clearSession();
    router.push("/connexion");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050a0f]">
        <LoadingMessage message="Chargement de l'administration..." />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-5">
        <Alert type="error" message={error ?? "Session indisponible."} />
      </div>
    );
  }

  return (
    <AdminSessionContext.Provider value={{ session }}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,212,255,0.1),transparent_25%),#050a0f] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden h-screen flex-col overflow-hidden border-r border-white/10 bg-[#071018]/95 px-5 py-4 lg:sticky lg:top-0 lg:flex">
          <BrandLogo compact />
          <div className="mt-4 shrink-0 border-y border-white/10 py-4">
            <Pill>Administration</Pill>
            <p className="mt-3 truncate font-bold text-white">
              {session.user.full_name}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Controle global Masterz Gym
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <AdminNavigation
              pathname={pathname}
              badges={badges}
              onBadgeOpen={clearBadge}
            />
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className={buttonStyles({
              variant: "outline",
              className: "mt-3 w-full shrink-0",
            })}
          >
            <LogOut className="h-4 w-4" /> Se deconnecter
          </button>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#071018]/95 px-4 backdrop-blur lg:hidden">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-primary" />
              <span className="text-sm font-black uppercase tracking-[0.1em] text-white">
                Admin
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
              className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/15 text-white"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {mobileOpen ? (
            <div className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto border-t border-white/10 bg-[#071018] p-5 lg:hidden">
              <AdminNavigation
                pathname={pathname}
                badges={badges}
                onBadgeOpen={clearBadge}
                onNavigate={() => setMobileOpen(false)}
              />
              <button
                type="button"
                onClick={() => void logout()}
                className={buttonStyles({
                  variant: "outline",
                  className: "mt-6 w-full",
                })}
              >
                <LogOut className="h-4 w-4" /> Se deconnecter
              </button>
            </div>
          ) : null}

          <AdminNotificationBell badges={badges} onBadgeOpen={clearBadge} />

          <div className="mx-auto w-full max-w-[1500px] p-5 sm:p-8 xl:p-10">
            {children}
          </div>
        </div>
      </div>
    </AdminSessionContext.Provider>
  );
}

const adminNotificationItems: Array<{
  key: NavigationBadgeKey;
  label: string;
  description: string;
  href: string;
}> = [
  {
    key: "applications",
    label: "Demandes d'inscription",
    description: "Nouvelles demandes a verifier et traiter.",
    href: "/espace/admin/demandes",
  },
  {
    key: "coaching",
    label: "Coaching",
    description: "Affectations ou reservations en attente.",
    href: "/espace/admin/coachs",
  },
  {
    key: "complaints",
    label: "Reclamations",
    description: "Reclamations ouvertes qui demandent une reponse.",
    href: "/espace/admin/reclamations",
  },
  {
    key: "store",
    label: "Reservations Store",
    description: "Produits reserves a preparer ou valider.",
    href: "/espace/admin/store",
  },
];

function AdminNotificationBell({
  badges,
  onBadgeOpen,
}: {
  badges: NavigationBadges;
  onBadgeOpen: (key: NavigationBadgeKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleItems, setVisibleItems] = useState<
    Array<(typeof adminNotificationItems)[number] & { count: number }>
  >([]);
  const currentItems = useMemo(
    () =>
      adminNotificationItems
        .map((item) => ({ ...item, count: badges[item.key] ?? 0 }))
        .filter((item) => item.count > 0),
    [badges],
  );
  const unreadCount = currentItems.reduce(
    (total, item) => total + item.count,
    0,
  );

  function toggleNotifications() {
    if (!open) {
      setVisibleItems(currentItems);
      currentItems.forEach((item) => onBadgeOpen(item.key));
    }
    setOpen((current) => !current);
  }

  return (
    <div className="fixed right-20 top-2 z-50 lg:right-8 lg:top-6">
      <button
        type="button"
        aria-label="Notifications administration"
        aria-expanded={open}
        onClick={toggleNotifications}
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#081119] text-white shadow-2xl transition hover:border-primary hover:text-primary"
      >
        <Bell className="h-5 w-5" />
        {unreadCount ? (
          <span
            data-testid="admin-notification-badge"
            className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1 text-[0.62rem] font-black text-black"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-white/15 bg-[#081119] shadow-2xl">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Notifications Admin
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Les nouvelles actions qui demandent votre attention.
            </p>
          </div>
          <div className="max-h-[min(28rem,70vh)] overflow-y-auto p-2">
            {visibleItems.length ? (
              visibleItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md border border-transparent px-3 py-3 transition hover:border-primary/30 hover:bg-primary/[0.07]"
                >
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-primary text-xs font-black text-black">
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm text-white">
                      {item.label}
                    </strong>
                    <span className="mt-1 block text-xs leading-5 text-gray-500">
                      {item.description}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                </Link>
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

function AdminNavigation({
  pathname,
  badges,
  onBadgeOpen,
  onNavigate,
}: {
  pathname: string;
  badges: NavigationBadges;
  onBadgeOpen: (key: NavigationBadgeKey) => void;
  onNavigate?: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<
    Record<string, boolean | undefined>
  >({});

  const overviewActive = pathname === adminOverview.href;

  return (
    <nav
      className="mt-4 grid gap-1.5 pb-2"
      aria-label="Navigation administration"
    >
      <Link
        href={adminOverview.href}
        onClick={onNavigate}
        aria-current={overviewActive ? "page" : undefined}
        className={`flex items-center gap-3 rounded-sm border-l-2 px-3 py-2.5 text-sm font-bold transition ${
          overviewActive
            ? "border-primary bg-primary/10 text-primary"
            : "border-transparent text-gray-400 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
        }`}
      >
        <Gauge className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{adminOverview.label}</span>
      </Link>

      {navigationGroups.map((group) => {
        const groupActive = group.items.some((item) =>
          pathname.startsWith(item.href),
        );
        const expanded = openGroups[group.id] ?? groupActive;
        const groupBadgeCount = group.items.reduce(
          (total, item) =>
            total + (item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0),
          0,
        );
        const groupBadgeKeys = group.items.flatMap((item) =>
          item.badgeKey ? [item.badgeKey] : [],
        );
        const GroupIcon = group.icon;

        return (
          <div
            key={group.id}
            className={`overflow-hidden rounded-sm border ${
              groupActive
                ? "border-primary/25 bg-primary/[0.035]"
                : "border-white/[0.06] bg-white/[0.015]"
            }`}
          >
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`admin-navigation-${group.id}`}
              onClick={() =>
                setOpenGroups((current) => ({
                  ...current,
                  [group.id]: !current[group.id],
                }))
              }
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-black transition hover:bg-white/[0.04] hover:text-white ${
                groupActive ? "text-primary" : "text-gray-300"
              }`}
            >
              <GroupIcon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
              {groupBadgeCount ? (
                <span
                  data-testid={
                    groupBadgeKeys.length === 1 && !expanded
                      ? `navigation-badge-${groupBadgeKeys[0]}`
                      : `navigation-group-badge-${group.id}`
                  }
                  className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[0.58rem] font-black text-black"
                >
                  {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                </span>
              ) : null}
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                  expanded ? "rotate-180 text-primary" : "text-gray-500"
                }`}
              />
            </button>

            {expanded ? (
              <div
                id={`admin-navigation-${group.id}`}
                className="grid gap-0.5 border-t border-white/[0.06] p-1.5"
              >
                {group.items.map(({ label, href, icon: Icon, badgeKey }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => {
                        if (badgeKey) onBadgeOpen(badgeKey);
                        onNavigate?.();
                      }}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-sm border-l-2 px-3 py-2 text-[0.82rem] font-bold transition ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent text-gray-400 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {badgeKey && badges[badgeKey] ? (
                        <span
                          data-testid={`navigation-badge-${badgeKey}`}
                          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[0.58rem] font-black text-black"
                        >
                          {badges[badgeKey]! > 99 ? "99+" : badges[badgeKey]}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

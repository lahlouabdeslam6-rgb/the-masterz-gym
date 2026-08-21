"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  FileClock,
  Gauge,
  KeyRound,
  LogOut,
  Menu,
  MessageSquareWarning,
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
  AUTH_CHANGED_EVENT,
  authorizationHeaders,
  clearSession,
  dashboardPath,
  getSession,
  updateSessionUser,
  type AuthSession,
} from "@/lib/auth";

const navigation = [
  { label: "Vue d'ensemble", href: "/espace/admin", icon: Gauge },
  {
    label: "Utilisateurs",
    href: "/espace/admin/utilisateurs",
    icon: UserRoundCog,
  },
  { label: "Membres", href: "/espace/admin/membres", icon: UsersRound },
  { label: "Coachs", href: "/espace/admin/coachs", icon: Dumbbell },
  { label: "Demandes", href: "/espace/admin/demandes", icon: ClipboardCheck },
  { label: "Formules", href: "/espace/admin/formules", icon: CreditCard },
  {
    label: "Paiements",
    href: "/espace/admin/paiements",
    icon: BadgeDollarSign,
  },
  { label: "Entrees", href: "/espace/admin/acces", icon: ShieldCheck },
  { label: "Recovery", href: "/espace/admin/recovery", icon: Waves },
  {
    label: "Reclamations",
    href: "/espace/admin/reclamations",
    icon: MessageSquareWarning,
  },
  { label: "Parametres", href: "/espace/admin/parametres", icon: Settings2 },
  { label: "Journal d'audit", href: "/espace/admin/audit", icon: FileClock },
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
            <AdminNavigation pathname={pathname} />
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

          <div className="mx-auto w-full max-w-[1500px] p-5 sm:p-8 xl:p-10">
            {children}
          </div>
        </div>
      </div>
    </AdminSessionContext.Provider>
  );
}

function AdminNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav
      className="mt-4 grid gap-0.5 pb-2"
      aria-label="Navigation administration"
    >
      {navigation.map(({ label, href, icon: Icon }) => {
        const active =
          href === "/espace/admin"
            ? pathname === href
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-sm border-l-2 px-3 py-2.5 text-sm font-bold transition ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-gray-400 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

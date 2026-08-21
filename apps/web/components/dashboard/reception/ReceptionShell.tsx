"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  ClipboardCheck,
  Gauge,
  LogOut,
  Menu,
  ShieldCheck,
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
  { label: "Vue d'ensemble", href: "/espace/reception", icon: Gauge },
  {
    label: "Demandes",
    href: "/espace/reception/demandes",
    icon: ClipboardCheck,
  },
  { label: "Membres", href: "/espace/reception/membres", icon: UsersRound },
  {
    label: "Paiements",
    href: "/espace/reception/paiements",
    icon: BadgeDollarSign,
  },
  {
    label: "Entrees",
    href: "/espace/reception/acces",
    icon: ShieldCheck,
  },
  {
    label: "Recovery",
    href: "/espace/reception/recovery",
    icon: Waves,
  },
];

const ReceptionSessionContext = createContext<AuthSession | null>(null);

export function useReceptionSession() {
  const session = useContext(ReceptionSessionContext);
  if (!session) {
    throw new Error(
      "useReceptionSession doit etre utilise dans ReceptionShell",
    );
  }
  return session;
}

export function ReceptionShell({ children }: { children: React.ReactNode }) {
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
        router.replace("/connexion");
        return;
      }
      if (current.user.role === "receptionist") setSession(current);
    }

    window.addEventListener(AUTH_CHANGED_EVENT, syncStoredSession);

    async function validateSession() {
      const current = getSession();
      if (!current) {
        router.replace("/connexion");
        return;
      }
      if (current.user.role !== "receptionist") {
        router.replace(dashboardPath(current.user.role));
        return;
      }

      try {
        const result = await api.GET("/api/v1/users/me", {
          headers: authorizationHeaders(current.accessToken),
        });
        if (!active) return;
        if (!result.data || result.data.role !== "receptionist") {
          clearSession();
          setError("Votre session a expire. Reconnectez-vous pour continuer.");
          setLoading(false);
          return;
        }
        updateSessionUser(result.data);
        setSession({ ...current, user: result.data });
      } catch {
        if (active) {
          setError("Le serveur est indisponible. Reessayez dans un instant.");
        }
      } finally {
        if (active) setLoading(false);
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
        <LoadingMessage message="Chargement de la reception..." />
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
    <ReceptionSessionContext.Provider value={session}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,212,255,0.1),transparent_25%),#050a0f] lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="hidden h-screen flex-col border-r border-white/10 bg-[#071018]/95 px-5 py-5 lg:sticky lg:top-0 lg:flex">
          <BrandLogo compact />
          <div className="mt-5 border-y border-white/10 py-5">
            <Pill>Reception</Pill>
            <p className="mt-3 truncate font-bold text-white">
              {session.user.full_name}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Accueil et caisse Masterz Gym
            </p>
          </div>
          <ReceptionNavigation pathname={pathname} />
          <button
            type="button"
            onClick={() => void logout()}
            className={buttonStyles({
              variant: "outline",
              className: "mt-auto w-full",
            })}
          >
            <LogOut className="h-4 w-4" /> Se deconnecter
          </button>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#071018]/95 px-4 backdrop-blur lg:hidden">
            <span className="text-sm font-black uppercase tracking-[0.12em] text-primary">
              Reception
            </span>
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
            <div className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto bg-[#071018] p-5 lg:hidden">
              <ReceptionNavigation
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

          <div className="mx-auto w-full max-w-[1450px] p-5 sm:p-8 xl:p-10">
            {children}
          </div>
        </div>
      </div>
    </ReceptionSessionContext.Provider>
  );
}

function ReceptionNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="mt-5 grid gap-1" aria-label="Navigation reception">
      {navigation.map(({ label, href, icon: Icon }) => {
        const active =
          href === "/espace/reception"
            ? pathname === href
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-sm border-l-2 px-3 py-3 text-sm font-bold transition ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-gray-400 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

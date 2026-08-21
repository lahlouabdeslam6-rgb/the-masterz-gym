"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogIn, LogOut, Menu, X } from "lucide-react";
import { buttonStyles } from "@masterz/ui";
import { api } from "@/lib/api";
import {
  AUTH_CHANGED_EVENT,
  clearSession,
  dashboardPath,
  getSession,
  type AuthSession,
} from "@/lib/auth";
import { BrandLogo } from "./BrandLogo";
import { TopBanner } from "./TopBanner";

const navLinks = [
  { name: "Accueil", href: "/" },
  { name: "La salle", href: "/la-salle" },
  { name: "Abonnements", href: "/abonnements" },
  { name: "Coaching", href: "/coaching" },
  { name: "Recovery", href: "/recovery" },
  { name: "Store", href: "/store" },
  { name: "Analyse corporelle", href: "/analyse-corporelle" },
  { name: "Healthy Café", href: "/healthy-cafe" },
  { name: "Contact", href: "/contact" },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const syncSession = () => setSession(getSession());
    syncSession();
    window.addEventListener(AUTH_CHANGED_EVENT, syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [pathname]);

  async function handleLogout() {
    if (session) {
      await api.POST("/api/v1/auth/logout", {
        body: { refresh_token: session.refreshToken },
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    }
    clearSession();
    setSession(null);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a1118]/95 shadow-[0_12px_40px_rgba(0,0,0,0.26)] backdrop-blur-xl">
      <TopBanner />
      <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-5 px-4 sm:px-6">
        <BrandLogo compact />

        <nav
          className="ml-auto hidden min-w-0 items-center gap-3.5 xl:flex 2xl:gap-5"
          aria-label="Navigation principale"
        >
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap border-b py-2 text-[0.67rem] font-extrabold uppercase tracking-[0.055em] transition-colors hover:text-primary 2xl:text-[0.72rem] ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-300"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-2 xl:ml-2 xl:flex">
          {session ? (
            <>
              <Link
                href={dashboardPath(session.user.role)}
                className={buttonStyles({ size: "sm" })}
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Mon espace
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                <LogOut className="h-3.5 w-3.5" /> Sortir
              </button>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                <LogIn className="h-3.5 w-3.5" /> Connexion
              </Link>
              <Link
                href="/inscription"
                className={buttonStyles({ size: "sm" })}
              >
                S’inscrire
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-sm border border-white/15 text-white transition hover:border-primary hover:text-primary xl:hidden"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div
          id="mobile-navigation"
          className="absolute left-0 top-full h-[calc(100svh-120px)] w-full overflow-y-auto border-t border-white/10 bg-[#071018] shadow-2xl sm:h-[calc(100svh-107px)] xl:hidden"
        >
          <nav
            className="mx-auto grid max-w-3xl gap-1 p-5 sm:p-7"
            aria-label="Navigation mobile"
          >
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`border-l-2 px-4 py-3 text-sm font-black uppercase tracking-[0.1em] transition-colors hover:border-primary hover:bg-white/5 hover:text-primary ${
                    active
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-transparent text-gray-300"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="mt-4 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
              {session ? (
                <>
                  <Link
                    href={dashboardPath(session.user.role)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={buttonStyles({ className: "w-full" })}
                  >
                    Mon espace
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      void handleLogout();
                    }}
                    className={buttonStyles({
                      variant: "outline",
                      className: "w-full",
                    })}
                  >
                    Se déconnecter
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/connexion"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={buttonStyles({
                      variant: "outline",
                      className: "w-full",
                    })}
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/inscription"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={buttonStyles({ className: "w-full" })}
                  >
                    S’inscrire
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

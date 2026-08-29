"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ChevronDown,
  Dumbbell,
  HeartPulse,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  X,
} from "lucide-react";
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

const mainNavLinks = [
  { name: "Accueil", href: "/" },
  { name: "La salle", href: "/la-salle" },
  { name: "Store", href: "/store" },
  { name: "Healthy Café", href: "/healthy-cafe" },
  { name: "Contact", href: "/contact" },
];

const membershipLinks = [
  {
    name: "Salle musculation",
    description: "Les formules d'accès à la salle",
    href: "/abonnements",
    icon: Dumbbell,
  },
  {
    name: "Coaching",
    description: "Suivi, tests et analyse corporelle",
    href: "/coaching",
    icon: Activity,
  },
  {
    name: "Recovery",
    description: "Sauna, bain froid et compression",
    href: "/recovery",
    icon: HeartPulse,
  },
];

const membershipPaths = membershipLinks.map((link) => link.href);

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMembershipMenuOpen, setIsMembershipMenuOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const membershipActive = membershipPaths.includes(pathname);

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
      <div className="mx-auto flex h-[78px] max-w-[1500px] items-center gap-5 px-4 sm:px-6">
        <BrandLogo compact />

        <nav
          className="ml-auto hidden min-w-0 items-center gap-4 lg:flex 2xl:gap-6"
          aria-label="Navigation principale"
        >
          {mainNavLinks.slice(0, 2).map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap border-b py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.065em] transition-colors hover:text-primary 2xl:text-[0.73rem] ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-300"
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          <div
            className="relative"
            onMouseEnter={() => setIsMembershipMenuOpen(true)}
            onMouseLeave={() => setIsMembershipMenuOpen(false)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsMembershipMenuOpen(false);
              }
            }}
          >
            <button
              type="button"
              aria-expanded={isMembershipMenuOpen}
              aria-controls="membership-navigation"
              onClick={() => setIsMembershipMenuOpen((open) => !open)}
              className={`flex cursor-pointer list-none items-center gap-1.5 border-b py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.065em] transition-colors marker:content-none hover:text-primary 2xl:text-[0.73rem] [&::-webkit-details-marker]:hidden ${
                membershipActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-300"
              }`}
            >
              Abonnements
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${isMembershipMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div
              id="membership-navigation"
              className={`absolute left-1/2 top-[calc(100%+18px)] z-50 w-[720px] -translate-x-1/2 border border-white/10 bg-[#0a121a]/[0.98] p-3 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl transition duration-200 before:absolute before:-top-[18px] before:left-0 before:h-[18px] before:w-full before:content-[''] ${
                isMembershipMenuOpen
                  ? "visible translate-y-0 opacity-100"
                  : "invisible translate-y-2 opacity-0"
              }`}
            >
              <div className="grid grid-cols-3 gap-2">
                {membershipLinks.map(({ icon: Icon, ...link }) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMembershipMenuOpen(false)}
                      className={`group/item flex min-h-[92px] gap-3 border p-4 transition hover:border-primary/40 hover:bg-primary/[0.07] ${
                        active
                          ? "border-primary/50 bg-primary/[0.08]"
                          : "border-white/10 bg-black/20"
                      }`}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>
                        <span className="block text-xs font-black uppercase tracking-[0.08em] text-white group-hover/item:text-primary">
                          {link.name}
                        </span>
                        <span className="mt-1.5 block text-[0.68rem] normal-case leading-5 tracking-normal text-gray-500">
                          {link.description}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {mainNavLinks.slice(2).map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap border-b py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.065em] transition-colors hover:text-primary 2xl:text-[0.73rem] ${
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

        <div className="ml-auto hidden shrink-0 items-center gap-2 lg:ml-2 lg:flex">
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
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-sm border border-white/15 text-white transition hover:border-primary hover:text-primary lg:hidden"
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
          className="absolute left-0 top-full h-[calc(100svh-126px)] w-full overflow-y-auto border-t border-white/10 bg-[#071018] shadow-2xl sm:h-[calc(100svh-113px)] lg:hidden"
        >
          <nav
            className="mx-auto grid max-w-3xl gap-1 p-5 sm:p-7"
            aria-label="Navigation mobile"
          >
            {mainNavLinks.slice(0, 2).map((link) => {
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

            <details className="group border-y border-white/10 py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-black uppercase tracking-[0.1em] text-white marker:content-none [&::-webkit-details-marker]:hidden">
                Abonnements
                <ChevronDown className="h-4 w-4 text-primary transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-1 pb-2 pl-3">
                {membershipLinks.map(({ icon: Icon, ...link }) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 border-l-2 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] transition hover:bg-white/5 hover:text-primary ${
                      pathname === link.href
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-white/10 text-gray-300"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" /> {link.name}
                  </Link>
                ))}
              </div>
            </details>

            {mainNavLinks.slice(2).map((link) => {
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

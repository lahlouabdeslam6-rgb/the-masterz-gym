"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  Coffee,
  Dumbbell,
  HeartPulse,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  ShoppingBag,
  UsersRound,
  X,
} from "lucide-react";
import { buttonStyles } from "@masterz/ui";
import { api } from "@/lib/api";
import { publicClubs } from "@/lib/clubs";
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
  { name: "Contact", href: "/contact" },
];

const membershipGroups = [
  {
    club: publicClubs[0],
    links: [
      {
        name: "Salle musculation",
        description: "Accès musculation et cardio",
        href: "/abonnements?club=salle-1",
        icon: Dumbbell,
      },
      {
        name: "Coaching",
        description: "Suivi et analyse corporelle",
        href: "/coaching",
        icon: Activity,
      },
      {
        name: "Recovery",
        description: "Sauna, bain froid et compression",
        href: "/recovery",
        icon: HeartPulse,
      },
    ],
  },
  {
    club: publicClubs[1],
    links: [
      {
        name: "Pass 4 Fit & Arts martiaux",
        description: "Deux abonnements separes pour Salle 2",
        href: "/abonnements?club=salle-2",
        icon: UsersRound,
      },
    ],
  },
];

const membershipLinks = membershipGroups.flatMap((group) => group.links);
const membershipPaths = membershipLinks.map((link) => link.href);

const commerceLinks = [
  {
    name: "Masterz Store",
    description: "Produits et nutrition sportive",
    href: "/store",
    icon: ShoppingBag,
  },
  {
    name: "Healthy Café",
    description: "Menu, repas et boissons avec prix",
    href: "/healthy-cafe",
    icon: Coffee,
  },
];

export function Header() {
  const [isClubMenuOpen, setIsClubMenuOpen] = useState(false);
  const [isMembershipMenuOpen, setIsMembershipMenuOpen] = useState(false);
  const [isCommerceMenuOpen, setIsCommerceMenuOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const membershipMenuRef = useRef<HTMLDivElement>(null);
  const clubMenuRef = useRef<HTMLDivElement>(null);
  const commerceMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const membershipMenuPinnedRef = useRef(false);
  const clubMenuPinnedRef = useRef(false);
  const commerceMenuPinnedRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
  const membershipActive = membershipPaths.some(
    (href) => href.split("?")[0] === pathname,
  );
  const clubActive = pathname.startsWith("/clubs/") || pathname === "/la-salle";
  const commerceActive = commerceLinks.some((link) => link.href === pathname);

  const closeMobileMenu = () => {
    mobileMenuRef.current?.removeAttribute("open");
    document.body.style.overflow = "";
  };

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

  useEffect(() => {
    closeMobileMenu();
    return () => {
      document.body.style.overflow = "";
    };
  }, [pathname]);

  useEffect(() => {
    const closePinnedMenu = (event: PointerEvent) => {
      if (
        membershipMenuRef.current &&
        !membershipMenuRef.current.contains(event.target as Node)
      ) {
        membershipMenuPinnedRef.current = false;
        setIsMembershipMenuOpen(false);
      }
      if (
        clubMenuRef.current &&
        !clubMenuRef.current.contains(event.target as Node)
      ) {
        clubMenuPinnedRef.current = false;
        setIsClubMenuOpen(false);
      }
      if (
        commerceMenuRef.current &&
        !commerceMenuRef.current.contains(event.target as Node)
      ) {
        commerceMenuPinnedRef.current = false;
        setIsCommerceMenuOpen(false);
      }
    };
    const closeMenuWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        membershipMenuPinnedRef.current = false;
        clubMenuPinnedRef.current = false;
        commerceMenuPinnedRef.current = false;
        setIsMembershipMenuOpen(false);
        setIsClubMenuOpen(false);
        setIsCommerceMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closePinnedMenu);
    document.addEventListener("keydown", closeMenuWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closePinnedMenu);
      document.removeEventListener("keydown", closeMenuWithEscape);
    };
  }, []);

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
    <header className="site-header sticky top-0 z-50 border-b border-white/10 bg-[#0a1118]/95 shadow-[0_12px_40px_rgba(0,0,0,0.26)] backdrop-blur-xl">
      <TopBanner />
      <div className="mx-auto flex h-[78px] max-w-[1500px] items-center gap-5 px-4 sm:px-6">
        <BrandLogo compact />

        <nav
          className="ml-auto hidden min-w-0 items-center gap-4 lg:flex 2xl:gap-6"
          aria-label="Navigation principale"
        >
          {mainNavLinks.slice(0, 1).map((link) => {
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
            ref={clubMenuRef}
            className="relative"
            onMouseEnter={() => setIsClubMenuOpen(true)}
            onMouseLeave={() => {
              if (!clubMenuPinnedRef.current) setIsClubMenuOpen(false);
            }}
          >
            <button
              type="button"
              aria-expanded={isClubMenuOpen}
              aria-controls="club-navigation"
              onClick={() => {
                clubMenuPinnedRef.current = !clubMenuPinnedRef.current;
                setIsClubMenuOpen(clubMenuPinnedRef.current);
              }}
              className={`flex items-center gap-1.5 border-b py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.065em] transition-colors hover:text-primary 2xl:text-[0.73rem] ${
                clubActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-300"
              }`}
            >
              Nos clubs
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${isClubMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div
              id="club-navigation"
              data-nav-panel
              className={`absolute left-1/2 top-[calc(100%+18px)] z-50 w-[620px] -translate-x-1/2 border border-white/10 bg-[#0a121a]/[0.98] p-3 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl transition duration-200 before:absolute before:-top-[18px] before:left-0 before:h-[18px] before:w-full before:content-[''] ${
                isClubMenuOpen
                  ? "visible translate-y-0 opacity-100"
                  : "invisible translate-y-2 opacity-0"
              }`}
            >
              <div className="grid grid-cols-2 gap-2">
                {publicClubs.map((club, index) => {
                  const Icon = index === 0 ? Dumbbell : UsersRound;
                  return (
                    <Link
                      key={club.id}
                      href={club.href}
                      onClick={() => {
                        clubMenuPinnedRef.current = false;
                        setIsClubMenuOpen(false);
                      }}
                      className={`group/item flex min-h-[108px] gap-3 border p-4 transition hover:border-primary/40 hover:bg-primary/[0.07] ${
                        pathname === club.href
                          ? "border-primary/50 bg-primary/[0.08]"
                          : "border-white/10 bg-black/20"
                      }`}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>
                        <span className="block text-xs font-black uppercase tracking-[0.08em] text-white group-hover/item:text-primary">
                          {club.name}
                        </span>
                        <span className="mt-1 block text-[0.62rem] font-black uppercase tracking-[0.1em] text-primary">
                          {club.signature}
                        </span>
                        <span className="mt-1.5 block text-[0.68rem] normal-case leading-5 tracking-normal text-gray-500">
                          {club.description}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            ref={membershipMenuRef}
            className="relative"
            onMouseEnter={() => setIsMembershipMenuOpen(true)}
            onMouseLeave={() => {
              if (!membershipMenuPinnedRef.current) {
                setIsMembershipMenuOpen(false);
              }
            }}
            onBlur={(event) => {
              if (
                !membershipMenuPinnedRef.current &&
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                setIsMembershipMenuOpen(false);
              }
            }}
          >
            <button
              type="button"
              aria-expanded={isMembershipMenuOpen}
              aria-controls="membership-navigation"
              onClick={() => {
                membershipMenuPinnedRef.current =
                  !membershipMenuPinnedRef.current;
                setIsMembershipMenuOpen(membershipMenuPinnedRef.current);
              }}
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
              data-nav-panel
              className={`absolute left-1/2 top-[calc(100%+18px)] z-50 w-[760px] -translate-x-1/2 border border-white/10 bg-[#0a121a]/[0.98] p-3 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl transition duration-200 before:absolute before:-top-[18px] before:left-0 before:h-[18px] before:w-full before:content-[''] ${
                isMembershipMenuOpen
                  ? "visible translate-y-0 opacity-100"
                  : "invisible translate-y-2 opacity-0"
              }`}
            >
              <div className="grid grid-cols-2 gap-3">
                {membershipGroups.map((group) => (
                  <section
                    key={group.club.id}
                    className="border border-white/10 bg-black/20 p-3"
                    aria-label={`Abonnements ${group.club.internalName}`}
                  >
                    <div className="mb-3 border-b border-white/10 px-1 pb-3">
                      <span className="block text-[0.62rem] font-black uppercase tracking-[0.14em] text-primary">
                        {group.club.internalName}
                      </span>
                      <span className="mt-1 block text-xs font-black uppercase text-white">
                        {group.club.name}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {group.links.map(({ icon: Icon, ...link }) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => {
                            membershipMenuPinnedRef.current = false;
                            setIsMembershipMenuOpen(false);
                          }}
                          className="group/item flex min-h-[68px] gap-3 border border-white/10 bg-[#071018] p-3 transition hover:border-primary/40 hover:bg-primary/[0.07]"
                        >
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>
                            <span className="block text-[0.68rem] font-black uppercase tracking-[0.07em] text-white group-hover/item:text-primary">
                              {link.name}
                            </span>
                            <span className="mt-1 block text-[0.62rem] normal-case leading-4 tracking-normal text-gray-500">
                              {link.description}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>

          <div
            ref={commerceMenuRef}
            className="relative"
            onMouseEnter={() => setIsCommerceMenuOpen(true)}
            onMouseLeave={() => {
              if (!commerceMenuPinnedRef.current) setIsCommerceMenuOpen(false);
            }}
          >
            <button
              type="button"
              aria-expanded={isCommerceMenuOpen}
              aria-controls="commerce-navigation"
              onClick={() => {
                commerceMenuPinnedRef.current = !commerceMenuPinnedRef.current;
                setIsCommerceMenuOpen(commerceMenuPinnedRef.current);
              }}
              className={`flex items-center gap-1.5 border-b py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.065em] transition-colors hover:text-primary 2xl:text-[0.73rem] ${
                commerceActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-300"
              }`}
            >
              Store & Café
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${isCommerceMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div
              id="commerce-navigation"
              data-nav-panel
              className={`absolute left-1/2 top-[calc(100%+18px)] z-50 w-[470px] -translate-x-1/2 border border-white/10 bg-[#0a121a]/[0.98] p-3 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl transition duration-200 before:absolute before:-top-[18px] before:left-0 before:h-[18px] before:w-full before:content-[''] ${
                isCommerceMenuOpen
                  ? "visible translate-y-0 opacity-100"
                  : "invisible translate-y-2 opacity-0"
              }`}
            >
              <div className="mb-3 flex items-center justify-between px-2 pt-1">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary">
                  L’expérience Masterz
                </span>
                <span className="text-[0.65rem] text-gray-400">
                  Store & Café
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {commerceLinks.map(({ icon: Icon, ...link }) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => {
                      commerceMenuPinnedRef.current = false;
                      setIsCommerceMenuOpen(false);
                    }}
                    className={`group/item flex min-h-[92px] gap-3 border p-4 transition hover:border-primary/40 hover:bg-primary/[0.07] ${
                      pathname === link.href
                        ? "border-primary/50 bg-primary/[0.08]"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <span className="commerce-icon flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 text-gray-500 transition group-hover/item:text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <span>
                      <span className="block text-xs font-black uppercase tracking-[0.08em] text-white group-hover/item:text-primary">
                        {link.name}
                      </span>
                      <span className="mt-1.5 block text-[0.68rem] normal-case leading-5 tracking-normal text-gray-500">
                        {link.description}
                      </span>
                      <span className="mt-4 block text-[0.65rem] font-semibold text-primary">
                        {link.href === "/store"
                          ? "Explorer les produits"
                          : "Découvrir le menu"}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {mainNavLinks.slice(1).map((link) => {
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

        <details
          ref={mobileMenuRef}
          suppressHydrationWarning
          className="group/mobile relative ml-auto lg:hidden"
          onToggle={(event) => {
            document.body.style.overflow = event.currentTarget.open
              ? "hidden"
              : "";
          }}
        >
          <summary
            className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-white/15 bg-white/[0.025] text-white transition marker:content-none hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
            aria-controls="mobile-navigation"
            aria-label="Ouvrir ou fermer le menu"
          >
            <Menu className="h-6 w-6 group-open/mobile:hidden" />
            <X className="hidden h-6 w-6 group-open/mobile:block" />
          </summary>
          <div
            id="mobile-navigation"
            className="absolute right-0 top-[calc(100%+17px)] hidden max-h-[calc(100dvh-7rem)] w-screen overflow-y-auto overscroll-contain border-t border-white/10 bg-[#071018] shadow-2xl group-open/mobile:block"
          >
            <nav
              className="mx-auto grid max-w-3xl gap-1 p-5 sm:p-7"
              aria-label="Navigation mobile"
            >
              {mainNavLinks.slice(0, 1).map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
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
                  Nos clubs
                  <ChevronDown className="h-4 w-4 text-primary transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-1 pb-2 pl-3">
                  {publicClubs.map((club, index) => {
                    const Icon = index === 0 ? Dumbbell : UsersRound;
                    return (
                      <Link
                        key={club.id}
                        href={club.href}
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 border-l-2 border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-gray-300 transition hover:border-primary hover:bg-white/5 hover:text-primary"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>
                          <span className="block">{club.name}</span>
                          <span className="mt-1 block text-[0.58rem] text-primary">
                            {club.signature}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </details>

              <details className="group border-y border-white/10 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-black uppercase tracking-[0.1em] text-white marker:content-none [&::-webkit-details-marker]:hidden">
                  Abonnements
                  <ChevronDown className="h-4 w-4 text-primary transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-4 px-3 pb-3">
                  {membershipGroups.map((group) => (
                    <section
                      key={group.club.id}
                      aria-label={group.club.internalName}
                    >
                      <p className="px-4 py-2 text-[0.62rem] font-black uppercase tracking-[0.14em] text-primary">
                        {group.club.internalName} · {group.club.name}
                      </p>
                      <div className="grid gap-1">
                        {group.links.map(({ icon: Icon, ...link }) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={closeMobileMenu}
                            className="flex items-center gap-3 border-l-2 border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-gray-300 transition hover:border-primary hover:bg-white/5 hover:text-primary"
                          >
                            <Icon className="h-4 w-4 shrink-0" /> {link.name}
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </details>

              <details className="group border-b border-white/10 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-black uppercase tracking-[0.1em] text-white marker:content-none [&::-webkit-details-marker]:hidden">
                  Store & Café
                  <ChevronDown className="h-4 w-4 text-primary transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-1 pb-2 pl-3">
                  {commerceLinks.map(({ icon: Icon, ...link }) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 border-l-2 border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-gray-300 transition hover:border-primary hover:bg-white/5 hover:text-primary"
                    >
                      <Icon className="h-4 w-4 shrink-0" /> {link.name}
                    </Link>
                  ))}
                </div>
              </details>

              {mainNavLinks.slice(1).map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
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
                      onClick={closeMobileMenu}
                      className={buttonStyles({ className: "w-full" })}
                    >
                      Mon espace
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        closeMobileMenu();
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
                      onClick={closeMobileMenu}
                      className={buttonStyles({
                        variant: "outline",
                        className: "w-full",
                      })}
                    >
                      Se connecter
                    </Link>
                    <Link
                      href="/inscription"
                      onClick={closeMobileMenu}
                      className={buttonStyles({ className: "w-full" })}
                    >
                      S’inscrire
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Dumbbell } from "lucide-react";
import { Button } from "@masterz/ui";

const navLinks = [
  { name: "Accueil", href: "/" },
  { name: "La salle", href: "/la-salle" },
  { name: "Abonnements", href: "/abonnements" },
  { name: "Coaching", href: "/coaching" },
  { name: "Recovery", href: "/recovery" },
  { name: "Analyse corporelle", href: "/analyse-corporelle" },
  { name: "Healthy Café", href: "/healthy-cafe" },
  { name: "Contact", href: "/contact" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-md shadow-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 text-white">
          <Dumbbell className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold uppercase tracking-wider">
            The Masterz Gym
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center space-x-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href ? "text-primary" : "text-gray-300"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden items-center space-x-4 lg:flex">
          <Link href="/connexion">
            <Button variant="ghost" className="text-gray-300 hover:text-white">
              Se connecter
            </Button>
          </Link>
          <Link href="/inscription">
            <Button variant="primary">S&apos;inscrire</Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden text-white hover:text-primary"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-20 left-0 w-full bg-background border-t border-border lg:hidden shadow-lg">
          <nav className="flex flex-col p-6 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-lg font-medium transition-colors hover:text-primary ${
                  pathname === link.href ? "text-primary" : "text-gray-300"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="flex flex-col space-y-4 pt-4 border-t border-border">
              <Link href="/connexion" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  Se connecter
                </Button>
              </Link>
              <Link href="/inscription" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full">
                  S&apos;inscrire
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

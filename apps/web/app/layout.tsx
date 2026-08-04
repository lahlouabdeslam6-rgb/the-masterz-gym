import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { FloatingWhatsApp } from "../components/FloatingWhatsApp";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Masterz Gym | Kénitra",
  description: "Dépassez vos limites. Une expérience complète dédiée à votre force, votre performance et votre récupération à Kénitra.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-black">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingWhatsApp />
      </body>
    </html>
  );
}

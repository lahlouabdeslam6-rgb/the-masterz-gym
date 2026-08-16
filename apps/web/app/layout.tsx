import type { Metadata } from "next";
import { AppFrame } from "../components/AppFrame";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "The Masterz Gym | Kénitra",
    template: "%s | The Masterz Gym",
  },
  description:
    "Entraînement, coaching, analyse corporelle et récupération dans une expérience fitness premium à Kénitra.",
  openGraph: {
    title: "The Masterz Gym | Élevez votre niveau",
    description:
      "Une expérience complète dédiée à votre force, votre performance et votre récupération.",
    locale: "fr_MA",
    type: "website",
    images: [{ url: "/media/masterz-hero.png", width: 2048, height: 1024 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-black">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}

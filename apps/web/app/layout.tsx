import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Masterz Gym | Kénitra",
  description: "Le futur espace digital de The Masterz Gym à Kénitra.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

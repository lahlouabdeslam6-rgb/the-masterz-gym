"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { FloatingWhatsApp } from "./FloatingWhatsApp";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPrivateSpace = pathname.startsWith("/espace/");

  if (isPrivateSpace) {
    return <main className="min-h-screen flex-1">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}

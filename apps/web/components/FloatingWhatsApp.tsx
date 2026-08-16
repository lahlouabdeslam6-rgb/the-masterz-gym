import React from "react";
import { MessageCircle } from "lucide-react";

export function FloatingWhatsApp() {
  return (
    <a
      href="https://wa.me/212764536280"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#16a66a] text-white shadow-[0_12px_35px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:bg-[#20bd7a] md:bottom-8 md:right-8 md:h-14 md:w-14"
      aria-label="Contactez-nous sur WhatsApp"
    >
      <MessageCircle className="h-6 w-6 md:h-7 md:w-7" />
    </a>
  );
}

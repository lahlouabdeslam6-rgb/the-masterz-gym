"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button, Input, Label } from "@masterz/ui";

export function ContactForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = `Bonjour The Masterz Gym, je suis ${name}. ${message}`;
    window.open(
      `https://wa.me/212764536280?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2.5">
        <Label htmlFor="contact-name">Nom complet</Label>
        <Input
          id="contact-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Votre nom"
          required
        />
      </div>
      <div className="space-y-2.5">
        <Label htmlFor="contact-message">Votre message</Label>
        <textarea
          id="contact-message"
          rows={5}
          className="w-full rounded-sm border border-white/15 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Parlez-nous de votre objectif ou posez votre question…"
          required
        />
      </div>
      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Envoyer via WhatsApp <Send className="h-4 w-4" />
      </Button>
      <p className="text-xs leading-5 text-gray-500">
        Votre message sera ouvert dans WhatsApp. Aucune donnée n’est envoyée à
        un service intermédiaire.
      </p>
    </form>
  );
}

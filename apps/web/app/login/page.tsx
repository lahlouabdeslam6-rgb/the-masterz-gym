"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { createMasterzClient } from "@masterz/api-client";

const configuredApiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const api = createMasterzClient(configuredApiUrl.replace(/\/api\/v1\/?$/, ""));

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const { data, error } = await api.POST("/api/v1/auth/login", {
      body: { phone, password },
    });
    setLoading(false);
    if (error || !data) {
      setMessage("Connexion impossible. Vérifiez vos identifiants.");
      return;
    }
    sessionStorage.setItem("masterz_access_token", data.access_token);
    setMessage(`Bienvenue, ${data.user.full_name}. Connexion validée.`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16 text-sand">
      <section className="w-full max-w-md border border-gold/30 bg-black/20 p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
          Espace interne
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase">Connexion</h1>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label className="block text-sm" htmlFor="phone">
            Téléphone
            <input
              className="mt-2 w-full border border-sand/20 bg-ink px-4 py-3 outline-none focus:border-gold"
              id="phone"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+212600000001"
              required
              type="tel"
              value={phone}
            />
          </label>
          <label className="block text-sm" htmlFor="password">
            Mot de passe
            <input
              className="mt-2 w-full border border-sand/20 bg-ink px-4 py-3 outline-none focus:border-gold"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button
            className="w-full bg-gold px-5 py-3 font-bold uppercase tracking-wider text-ink disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        {message ? <p className="mt-5 text-sm text-sand/80">{message}</p> : null}
        <Link className="mt-8 inline-block text-sm text-gold hover:underline" href="/">
          Retour au site
        </Link>
      </section>
    </main>
  );
}

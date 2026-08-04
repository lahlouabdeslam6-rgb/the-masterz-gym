"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { SectionTitle, Card, CardContent, Button, Input, Label, Alert, LoadingMessage } from "@masterz/ui";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: apiError } = await api.POST("/api/v1/auth/login", {
        body: { phone, password }
      });

      if (apiError) {
        // Handling potentially structured error from API
        setError("Numéro de téléphone ou mot de passe incorrect.");
      } else if (data) {
        // Success: store token, redirect based on role (for this phase, just redirect to home)
        // Usually, we would set a cookie or localStorage here, but since this is frontend only and no specific backend setup for cookies is detailed:
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", data.access_token);
        }
        router.push("/");
      }
    } catch {
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-background flex flex-col items-center justify-center">
      <Link href="/" className="flex items-center space-x-2 text-white mb-12">
        <Dumbbell className="h-10 w-10 text-primary" />
        <span className="text-2xl font-black uppercase tracking-wider">
          The Masterz Gym
        </span>
      </Link>
      
      <Card className="bg-surface border-border w-full max-w-md">
        <CardContent className="pt-8">
          <SectionTitle title="Connexion" className="!mb-8 !md:mb-8" />
          
          {error && <Alert type="error" message={error} className="mb-6" />}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="+212600000003" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link href="/mot-de-passe-oublie" className="text-sm text-primary hover:underline">
                  Oublié ?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button variant="primary" className="w-full" disabled={loading}>
              {loading ? <LoadingMessage message="Connexion..." className="p-0 text-black" /> : "Se connecter"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-400">
            Vous n&apos;avez pas de compte ?{" "}
            <Link href="/inscription" className="text-primary font-semibold hover:underline">
              S&apos;inscrire
            </Link>
          </div>
          <div className="mt-4 text-center text-sm text-gray-400">
            Déjà membre mais pas de compte en ligne ?{" "}
            <Link href="/activation-membre" className="text-primary font-semibold hover:underline">
              Activer mon compte
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

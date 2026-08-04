"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { SectionTitle, Card, CardContent, Button, Input, Label, Alert, LoadingMessage } from "@masterz/ui";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function MotDePasseOubliePage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Request, 2: Confirm OTP, 3: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string>("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: apiError } = await api.POST("/api/v1/auth/password-reset/request", {
        body: { phone }
      });

      if (apiError) {
        setError("Numéro de téléphone introuvable ou invalide.");
      } else if (data && typeof data === 'object' && 'challenge_id' in data) {
        setChallengeId(data.challenge_id as string);
        setStep(2);
      }
    } catch {
      setError("Erreur inattendue de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: apiError } = await api.POST("/api/v1/auth/password-reset/confirm", {
        body: {
          challenge_id: challengeId,
          otp,
          new_password: newPassword
        }
      });

      if (apiError) {
        setError("Code OTP incorrect ou mot de passe invalide.");
      } else {
        setStep(3);
      }
    } catch {
      setError("Erreur inattendue de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-background flex flex-col items-center justify-center">
      <Card className="bg-surface border-border w-full max-w-md">
        <CardContent className="pt-8">
          <SectionTitle title="Mot de passe" subtitle="Réinitialisez votre accès" className="!mb-8" />
          
          {error && <Alert type="error" message={error} className="mb-6" />}
          
          {step === 1 && (
            <form onSubmit={handleRequest} className="space-y-6">
              <p className="text-sm text-gray-400">
                Entrez le numéro de téléphone associé à votre compte. Un code de réinitialisation vous sera envoyé.
              </p>
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="+212..." 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <Button variant="primary" className="w-full" disabled={loading}>
                {loading ? <LoadingMessage message="Envoi..." className="p-0 text-black" /> : "Recevoir le code"}
              </Button>
              <div className="mt-4 text-center text-sm">
                <Link href="/connexion" className="text-gray-400 hover:text-white">Retour à la connexion</Link>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleConfirm} className="space-y-6">
              <p className="text-sm text-gray-400">
                Entrez le code OTP reçu et choisissez un nouveau mot de passe.
              </p>
              <div className="space-y-2">
                <Label htmlFor="otp">Code OTP (6 chiffres)</Label>
                <Input 
                  id="otp" 
                  type="text" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input 
                  id="newPassword" 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={10}
                />
              </div>
              <Button variant="primary" className="w-full" disabled={loading}>
                {loading ? <LoadingMessage message="Validation..." className="p-0 text-black" /> : "Réinitialiser"}
              </Button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
              <h3 className="text-2xl font-bold text-white">Mot de passe modifié !</h3>
              <p className="text-gray-400">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <Button variant="primary" className="w-full" onClick={() => router.push("/connexion")}>
                Se connecter
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

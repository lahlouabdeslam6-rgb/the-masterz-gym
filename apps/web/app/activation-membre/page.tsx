"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { SectionTitle, Card, CardContent, Button, Input, Label, Alert, LoadingMessage } from "@masterz/ui";
import { CheckCircle2 } from "lucide-react";

export default function ActivationMembrePage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Request, 2: Confirm OTP + Password, 3: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string>("");

  // Step 1 Data
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");

  // Step 2 Data
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // NOTE: Using "any" if the openapi-fetch typing is strict on exact paths, or relying on auto-completion
      const { data, error: apiError } = await api.POST("/api/v1/auth/member-activation/request", {
        body: { phone, full_name: fullName }
      });

      if (apiError) {
        setError("Impossible de vérifier votre identité. Vérifiez vos informations.");
      } else if (data && data.challenge_id) {
        setChallengeId(data.challenge_id);
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
      const { error: apiError } = await api.POST("/api/v1/auth/member-activation/confirm", {
        body: {
          challenge_id: challengeId,
          otp,
          new_password: newPassword
        }
      });

      if (apiError) {
        setError("Code OTP incorrect ou mot de passe invalide (min 10 caractères).");
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
          <SectionTitle title="Activation" subtitle="Activez votre compte membre en ligne" className="!mb-8" />
          
          {error && <Alert type="error" message={error} className="mb-6" />}
          
          {step === 1 && (
            <form onSubmit={handleRequest} className="space-y-6">
              <p className="text-sm text-gray-400">
                Pour activer votre compte, nous devons vérifier votre identité dans notre système.
              </p>
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
                <Label htmlFor="fullName">Nom complet</Label>
                <Input 
                  id="fullName" 
                  placeholder="Votre nom complet exact" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <Button variant="primary" className="w-full" disabled={loading}>
                {loading ? <LoadingMessage message="Vérification..." className="p-0 text-black" /> : "Vérifier mon identité"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleConfirm} className="space-y-6">
              <p className="text-sm text-gray-400">
                Un code (OTP) a été généré. Dans l&apos;environnement local, vérifiez les logs du backend.
              </p>
              <div className="space-y-2">
                <Label htmlFor="otp">Code de vérification (6 chiffres)</Label>
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
                <Label htmlFor="newPassword">Créer un mot de passe</Label>
                <Input 
                  id="newPassword" 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={10}
                />
                <p className="text-xs text-gray-500">Minimum 10 caractères.</p>
              </div>
              <Button variant="primary" className="w-full" disabled={loading}>
                {loading ? <LoadingMessage message="Activation..." className="p-0 text-black" /> : "Activer mon compte"}
              </Button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
              <h3 className="text-2xl font-bold text-white">Compte activé !</h3>
              <p className="text-gray-400">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <Button variant="primary" className="w-full" onClick={() => router.push("/connexion")}>
                Aller à la connexion
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

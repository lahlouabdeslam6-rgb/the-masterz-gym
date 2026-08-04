"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { SectionTitle, Card, CardContent, Button, Input, Label, Alert, LoadingMessage } from "@masterz/ui";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

function InscriptionContent() {
  const searchParams = useSearchParams();
  const preselectedPlanId = searchParams?.get("plan");

  const [plans, setPlans] = useState<{ id: string, name: string, price: number | string }[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "",
    selected_plan_id: preselectedPlanId || "",
    fitness_objective: "",
    message: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data } = await api.GET("/api/v1/membership-plans", { params: { query: { active_only: true } } });
        if (data && Array.isArray(data)) {
          setPlans((data as unknown as { id: string, name: string, price: number | string }[]).sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString())));
          if (!preselectedPlanId && data.length > 0) {
            setFormData(prev => ({ ...prev, selected_plan_id: data[0].id }));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPlans();
  }, [preselectedPlanId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: apiError } = await api.POST("/api/v1/membership-applications", {
        body: {
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email || null,
          date_of_birth: formData.date_of_birth || null,
          gender: (formData.gender as "female" | "male" | "other" | "undisclosed" | null) || null,
          selected_plan_id: formData.selected_plan_id,
          fitness_objective: formData.fitness_objective,
          message: formData.message || null
        }
      });

      if (apiError) {
        setError("Erreur de validation. Veuillez vérifier vos informations.");
      } else if (data) {
        setSuccess(true);
      }
    } catch {
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="pt-32 pb-24 px-6 min-h-screen bg-background flex flex-col items-center justify-center text-center">
        <CheckCircle2 className="h-20 w-20 text-green-500 mb-6" />
        <h2 className="text-3xl font-bold text-white mb-4">Demande Envoyée !</h2>
        <p className="text-gray-400 max-w-md mx-auto mb-8">
          Votre demande d&apos;adhésion a bien été enregistrée. Le paiement et la validation finale se feront à la réception de The Masterz Gym.
        </p>
        <Link href="/">
          <Button variant="primary">Retour à l&apos;accueil</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-2xl">
        <SectionTitle title="S&apos;inscrire" subtitle="Rejoignez The Masterz Gym dès aujourd'hui." />
        
        <Card className="bg-surface border-border">
          <CardContent className="pt-8">
            {error && <Alert type="error" message={error} className="mb-6" />}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet *</Label>
                  <Input id="full_name" required value={formData.full_name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone *</Label>
                  <Input id="phone" type="tel" placeholder="+212..." required value={formData.phone} onChange={handleChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <Input id="email" type="email" value={formData.email} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date de naissance (optionnel)</Label>
                  <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="selected_plan_id">Formule d&apos;abonnement *</Label>
                {loadingPlans ? (
                  <div className="h-11 bg-background rounded-md flex items-center px-3 text-sm text-gray-500">Chargement des formules...</div>
                ) : (
                  <select 
                    id="selected_plan_id" 
                    className="flex h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    required
                    value={formData.selected_plan_id}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Sélectionnez une formule</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.name} - {plan.price} MAD</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fitness_objective">Objectif sportif *</Label>
                <Input id="fitness_objective" required placeholder="Ex: Perte de poids, prise de masse..." value={formData.fitness_objective} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optionnel)</Label>
                <textarea 
                  id="message" 
                  rows={3}
                  className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={formData.message}
                  onChange={handleChange}
                ></textarea>
              </div>
              
              <div className="pt-4">
                <Button variant="primary" className="w-full" disabled={loading || loadingPlans}>
                  {loading ? <LoadingMessage message="Envoi..." className="p-0 text-black" /> : "Soumettre la demande"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-white">Chargement...</div>}>
      <InscriptionContent />
    </Suspense>
  );
}

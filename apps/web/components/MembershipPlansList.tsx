"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@masterz/ui";
import { Check } from "lucide-react";

export interface MembershipPlan {
  id: string;
  name: string;
  price: number | string;
  duration_months?: number;
}

export function MembershipPlansList() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data, error: apiError } = await api.GET("/api/v1/membership-plans", {
          params: { query: { active_only: true } }
        });
        
        if (apiError) {
          setError("Impossible de charger les formules d'abonnement.");
        } else if (data && Array.isArray(data)) {
          const formattedPlans = (data as unknown as MembershipPlan[]).sort(
            (a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString())
          );
          setPlans(formattedPlans);
        } else {
          setPlans([]);
        }
      } catch {
        setError("Une erreur de connexion est survenue.");
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-gray-400">Chargement des formules...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-10 bg-red-500/10 rounded-xl border border-red-500/20">
        {error}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center text-gray-400 py-10 bg-surface rounded-xl border border-border">
        Les formules ne sont pas disponibles pour le moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {plans.map((plan) => (
        <Card key={plan.id} className="bg-background flex flex-col border-border hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <div className="mt-4 flex items-baseline text-4xl font-black text-white">
              {plan.price} <span className="ml-2 text-xl font-medium text-gray-400">MAD</span>
            </div>
            {plan.duration_months && (
              <p className="text-sm text-gray-500 mt-2">Pour {plan.duration_months} mois</p>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ul className="mt-4 space-y-3 flex-1">
              <li className="flex items-center text-sm text-gray-300">
                <Check className="h-5 w-5 text-primary mr-3" /> Accès complet à la salle
              </li>
              <li className="flex items-center text-sm text-gray-300">
                <Check className="h-5 w-5 text-primary mr-3" /> Vestiaires & douches
              </li>
            </ul>
            <Link href={`/inscription?plan=${plan.id}`} className="mt-8 w-full block">
              <Button variant="primary" className="w-full">Choisir cette formule</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

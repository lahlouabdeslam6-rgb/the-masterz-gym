export const recoveryPacks = [
  { id: "rec-1", name: "1 Séance", price: 200, description: "Sauna, bain glacé et massage par compression." },
  { id: "rec-5", name: "Pack 5 Séances", price: 850, description: "Idéal pour une récupération régulière post-effort." },
  { id: "rec-10", name: "Pack 10 Séances", price: 1500, description: "Pour les athlètes engagés dans un cycle intense." },
  { id: "rec-20", name: "Pack 20 Séances", price: 2800, description: "Le pack ultime pour une récupération optimale tout au long de l'année." },
];

export const coaches = [
  {
    id: "c-1",
    name: "Yassine",
    specialty: "Force & Hypertrophie",
    image: "/media/placeholder-coach-1.jpg",
    bio: "Expert en biomécanique, Yassine vous aide à dépasser vos plateaux en toute sécurité.",
  },
  {
    id: "c-2",
    name: "Sarah",
    specialty: "Mobilité & Conditioning",
    image: "/media/placeholder-coach-2.jpg",
    bio: "Améliorez votre endurance et votre souplesse pour des mouvements plus fluides.",
  },
  {
    id: "c-3",
    name: "Amine",
    specialty: "Cross-training & Perte de poids",
    image: "/media/placeholder-coach-3.jpg",
    bio: "Des séances intenses et dynamiques pour atteindre vos objectifs rapidement.",
  },
];

export const cafeMenu = [
  {
    category: "Shakes Protéinés",
    items: [
      { id: "m-1", name: "Whey Isolate (Dose)", price: 25, description: "Vanille, Chocolat, Fraise" },
      { id: "m-2", name: "Mass Gainer Shake", price: 35, description: "Avoine, beurre de cacahuète, banane, whey" },
    ],
  },
  {
    category: "Smoothies & Jus",
    items: [
      { id: "m-3", name: "Energy Boost", price: 30, description: "Orange, carotte, gingembre" },
      { id: "m-4", name: "Green Detox", price: 30, description: "Pomme verte, céleri, épinard, citron" },
    ],
  },
  {
    category: "Healthy Food",
    items: [
      { id: "m-5", name: "Avoine Bowl", price: 40, description: "Flocons d'avoine, fruits rouges, miel, amandes" },
      { id: "m-6", name: "Salade Protéinée", price: 55, description: "Poulet grillé, quinoa, avocat, légumes de saison" },
    ],
  },
  {
    category: "Snacks",
    items: [
      { id: "m-7", name: "Barre Protéinée", price: 25, description: "Diverses saveurs disponibles" },
      { id: "m-8", name: "Pre-Workout (Dose)", price: 20, description: "Booster d'énergie avant l'entraînement" },
    ],
  },
];

export const reviews = [
  {
    id: "r-1",
    rating: 5,
    text: "La meilleure salle de Kénitra ! Le matériel est incroyable et l'ambiance motive vraiment à se dépasser.",
    date: "Il y a 1 semaine",
  },
  {
    id: "r-2",
    rating: 5,
    text: "L'espace recovery est un énorme plus. Après une grosse séance jambes, le bain glacé fait des miracles.",
    date: "Il y a 2 semaines",
  },
  {
    id: "r-3",
    rating: 5,
    text: "Staff super professionnel, salle très propre et le Healthy Café propose de super bons shakes post-workout.",
    date: "Il y a 1 mois",
  },
];

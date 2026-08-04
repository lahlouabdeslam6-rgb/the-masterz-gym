import { SectionTitle, Card, CardHeader, CardTitle, CardContent, Button } from "@masterz/ui";
import { cafeMenu } from "@/lib/mock-data";

export default function HealthyCafePage() {
  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-background">
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="Healthy Café" subtitle="L'alimentation au service de vos performances." />
        
        <div className="mt-16 space-y-16">
          {cafeMenu.map((category) => (
            <div key={category.category}>
              <h3 className="text-2xl font-bold text-white mb-8 border-l-4 border-primary pl-4">{category.category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.items.map((item) => (
                  <Card key={item.id} className="bg-surface border-border">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <span className="text-primary font-bold">{item.price} MAD</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16 flex justify-center">
          <Button variant="primary" size="lg">Voir le menu complet (Bientôt)</Button>
        </div>
      </div>
    </div>
  );
}

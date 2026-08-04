import { SectionTitle } from "@masterz/ui";
import { MembershipPlansList } from "@/components/MembershipPlansList";

export default function AbonnementsPage() {
  return (
    <div className="pt-32 pb-24 px-6 min-h-screen bg-background">
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="Abonnements" subtitle="Trouvez la formule adaptée à vos objectifs." />
        <div className="mt-16">
          <MembershipPlansList />
        </div>
      </div>
    </div>
  );
}

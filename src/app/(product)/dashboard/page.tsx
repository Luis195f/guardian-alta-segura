import { ProfessionalDashboard } from "@/presentation/components/professional-dashboard";
import { PageHeader } from "@/presentation/components/page-header";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { isProfessionalRole } from "@/presentation/navigation/role-navigation";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";

export default async function DashboardPage() {
  const session = await getDemoPageSession();
  if (!session || !isProfessionalRole(session.role)) return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Seguimiento postalta"
        title="Buenos días"
        description="Consulta estados administrativos y fuentes canónicas de tus episodios asignados."
      />
      <ProfessionalDashboard />
    </>
  );
}

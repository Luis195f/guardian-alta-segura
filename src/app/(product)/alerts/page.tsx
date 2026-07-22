import { ExplainableAlertsPanel } from "@/presentation/components/explainable-alerts-panel";
import { PageHeader } from "@/presentation/components/page-header";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { isProfessionalRole } from "@/presentation/navigation/role-navigation";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";

export default async function AlertsPage() {
  const session = await getDemoPageSession();
  if (!session || !isProfessionalRole(session.role)) return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Revisión humana"
        title="Avisos"
        description="Consulta la explicación y registra una revisión antes de crear cualquier tarea separada."
      />
      <ExplainableAlertsPanel enabled />
    </>
  );
}

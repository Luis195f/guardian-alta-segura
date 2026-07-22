import { NursingWorkQueuePanel } from "@/presentation/components/nursing-workqueue-panel";
import { PageHeader } from "@/presentation/components/page-header";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { isProfessionalRole } from "@/presentation/navigation/role-navigation";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";

export default async function WorkQueuePage() {
  const session = await getDemoPageSession();
  if (!session || !isProfessionalRole(session.role)) return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Actividad operativa"
        title="Seguimiento"
        description="Prioriza resultados, abre un episodio y registra tareas o actividad mediante acciones humanas explícitas."
      />
      <NursingWorkQueuePanel enabled />
    </>
  );
}

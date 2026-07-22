import { PageHeader } from "@/presentation/components/page-header";
import { PatientSafetyPlanPanel } from "@/presentation/components/patient-safety-plan-panel";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";
export default async function MyPlanPage() {
  const session = await getDemoPageSession();
  if (session?.role !== "patient") return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Mi seguimiento"
        title="Mi Plan"
        description="Consulta la versión activa de tu Plan de Seguridad y el historial permitido."
      />
      <PatientSafetyPlanPanel enabled />
    </>
  );
}

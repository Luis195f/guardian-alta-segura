import { PageHeader } from "@/presentation/components/page-header";
import { PatientCheckInPanel } from "@/presentation/components/patient-check-in-panel";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";
export default async function MyCheckInsPage() {
  const session = await getDemoPageSession();
  if (session?.role !== "patient") return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Mi seguimiento"
        title="Mis Check-ins"
        description="Responde solo cuando haya una ventana disponible y consulta tus estados anteriores."
      />
      <PatientCheckInPanel enabled />
    </>
  );
}

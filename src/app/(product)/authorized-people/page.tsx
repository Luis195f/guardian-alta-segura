import { CaregiverAccessPanel } from "@/presentation/components/caregiver-access-panel";
import { PageHeader } from "@/presentation/components/page-header";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";
export default async function AuthorizedPeoplePage() {
  const session = await getDemoPageSession();
  if (session?.role !== "patient") return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Privacidad y control"
        title="Personas autorizadas"
        description="Consulta, limita o revoca el contenido compartido sin borrar documentación histórica."
      />
      <CaregiverAccessPanel enabled mode="patient" />
    </>
  );
}

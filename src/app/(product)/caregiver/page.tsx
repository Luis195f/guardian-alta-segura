import { CaregiverAccessPanel } from "@/presentation/components/caregiver-access-panel";
import { PageHeader } from "@/presentation/components/page-header";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";
export default async function CaregiverPage() {
  const session = await getDemoPageSession();
  if (session?.role !== "caregiver") return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Portal separado"
        title="Contenido autorizado"
        description="El acceso depende de una autorización vigente, puede ser revocado y nunca incluye módulos profesionales."
      />
      <CaregiverAccessPanel enabled mode="caregiver" />
    </>
  );
}

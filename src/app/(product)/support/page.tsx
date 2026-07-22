import { PageHeader } from "@/presentation/components/page-header";
import { TechnicalStatusPanel } from "@/presentation/components/technical-status-panel";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";
export default async function SupportPage() {
  const session = await getDemoPageSession();
  if (session?.role !== "support") return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Superficie sanitizada"
        title="Estado técnico"
        description="Comprueba la disponibilidad local sin acceder a datos, notas ni documentación clínica."
      />
      <TechnicalStatusPanel />
    </>
  );
}

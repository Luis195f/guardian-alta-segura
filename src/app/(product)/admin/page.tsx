import { CheckInProtocolAdminPanel } from "@/presentation/components/check-in-protocol-admin-panel";
import { PageHeader } from "@/presentation/components/page-header";
import { RuleCatalogPanel } from "@/presentation/components/rule-catalog-panel";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";
export default async function AdminPage() {
  const session = await getDemoPageSession();
  if (session?.role !== "admin") return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Administración demo"
        title="Configuración"
        description="Gestiona plantillas y reglas sintéticas versionadas sin acceso visual implícito a expedientes clínicos."
      />
      <div className="admin-grid">
        <CheckInProtocolAdminPanel enabled />
        <RuleCatalogPanel />
      </div>
    </>
  );
}

import Link from "next/link";
import { EpisodeCreateForm } from "@/presentation/components/episode-create-form";
import { PageHeader } from "@/presentation/components/page-header";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { isProfessionalRole } from "@/presentation/navigation/role-navigation";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";

export default async function NewEpisodePage() {
  const session = await getDemoPageSession();
  if (!session || !isProfessionalRole(session.role)) return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Nuevo seguimiento"
        title="Crear episodio"
        description="Registra un borrador sintético. La activación posterior sigue siendo una acción humana separada."
        actions={<Link href="/episodes">Cancelar</Link>}
      />
      <EpisodeCreateForm />
    </>
  );
}

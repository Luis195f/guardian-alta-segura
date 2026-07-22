import { EpisodeDirectory } from "@/presentation/components/episode-directory";
import Link from "next/link";
import { PageHeader } from "@/presentation/components/page-header";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { isProfessionalRole } from "@/presentation/navigation/role-navigation";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";

export default async function EpisodesPage() {
  const session = await getDemoPageSession();
  if (!session || !isProfessionalRole(session.role)) return <UnauthorizedState />;
  return (
    <>
      <PageHeader
        eyebrow="Seguimiento profesional"
        title="Episodios"
        description="Abre un episodio para revisar su resumen, avisos, tareas y documentación trazable."
        actions={
          <Link className="button-link" href="/episodes/new">
            Crear episodio
          </Link>
        }
      />
      <EpisodeDirectory />
    </>
  );
}

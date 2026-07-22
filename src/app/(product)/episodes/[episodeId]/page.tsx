import { EpisodeWorkspace } from "@/presentation/components/episode-workspace";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { isProfessionalRole } from "@/presentation/navigation/role-navigation";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";

export default async function EpisodePage({
  params,
}: {
  readonly params: Promise<{ episodeId: string }>;
}) {
  const session = await getDemoPageSession();
  if (!session || !isProfessionalRole(session.role)) return <UnauthorizedState />;
  const { episodeId } = await params;
  return <EpisodeWorkspace episodeId={episodeId} />;
}

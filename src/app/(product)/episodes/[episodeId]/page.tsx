import { EpisodeWorkspace } from "@/presentation/components/episode-workspace";
import { UnauthorizedState } from "@/presentation/components/ui-states";
import { parseEpisodeWorkspaceTab } from "@/presentation/navigation/episode-tabs";
import { isProfessionalRole } from "@/presentation/navigation/role-navigation";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";

export default async function EpisodePage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ episodeId: string }>;
  readonly searchParams: Promise<{ readonly tab?: string | readonly string[] }>;
}) {
  const session = await getDemoPageSession();
  if (!session || !isProfessionalRole(session.role)) return <UnauthorizedState />;
  const { episodeId } = await params;
  const query = await searchParams;
  return (
    <EpisodeWorkspace episodeId={episodeId} initialTab={parseEpisodeWorkspaceTab(query.tab)} />
  );
}

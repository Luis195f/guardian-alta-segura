export const EPISODE_WORKSPACE_TABS = [
  ["summary", "Resumen"],
  ["safety-plan", "Plan de Seguridad"],
  ["check-ins", "Check-ins"],
  ["alerts", "Avisos"],
  ["follow-up", "Seguimiento"],
  ["home-safety", "Domicilio Seguro"],
  ["sbar", "SBAR"],
  ["evidence", "Evidencia / Trazabilidad"],
  ["history", "Historial"],
] as const;

export type EpisodeWorkspaceTab = (typeof EPISODE_WORKSPACE_TABS)[number][0];

export function parseEpisodeWorkspaceTab(value: unknown): EpisodeWorkspaceTab {
  if (typeof value !== "string") return "summary";
  return EPISODE_WORKSPACE_TABS.some(([candidate]) => candidate === value)
    ? (value as EpisodeWorkspaceTab)
    : "summary";
}

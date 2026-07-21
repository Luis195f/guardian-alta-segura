export const SBAR_PROFILE = {
  key: "synthetic-minimized-sbar",
  version: "demo-v1",
  label: "DEMO SINTÉTICA / SIN FIRMA / NO USO CLÍNICO",
} as const;

export interface SbarStructuredSource {
  readonly episode: {
    readonly id: string;
    readonly isSynthetic: boolean;
    readonly patientPseudonymousId: string;
    readonly status: string;
    readonly dischargeDate: Date;
  };
  readonly checkInProtocol: {
    readonly id: string;
    readonly title: string;
    readonly versionNumber: number;
  };
  readonly activeSafetyPlan: { readonly id: string; readonly versionNumber: number } | null;
  readonly lastCheckIn: {
    readonly id: string;
    readonly outcome: string;
    readonly recordedAt: Date;
  } | null;
  readonly openAlerts: readonly { readonly id: string }[];
  readonly openTasks: readonly { readonly id: string; readonly summary: string }[];
  readonly generatedBy: { readonly id: string; readonly syntheticAlias: string };
  readonly generatedAt: Date;
}

export class SbarSourceDeniedError extends Error {}

export function buildDeterministicSbar(source: SbarStructuredSource) {
  if (!source.episode.isSynthetic) throw new SbarSourceDeniedError();
  const references = [
    { resourceType: "DischargeEpisode", resourceId: source.episode.id },
    { resourceType: "CheckInProtocolVersion", resourceId: source.checkInProtocol.id },
    ...(source.activeSafetyPlan
      ? [{ resourceType: "SafetyPlanVersion", resourceId: source.activeSafetyPlan.id }]
      : []),
    ...(source.lastCheckIn
      ? [{ resourceType: "CheckInAssignment", resourceId: source.lastCheckIn.id }]
      : []),
    ...source.openAlerts.map(({ id }) => ({ resourceType: "Alert", resourceId: id })),
    ...source.openTasks.map(({ id }) => ({ resourceType: "Task", resourceId: id })),
  ];
  const taskSummary = source.openTasks.length
    ? `Seguimiento ya registrado: ${source.openTasks.map(({ summary }) => summary).join("; ")}.`
    : "Sin tareas ni seguimiento adicional registrados.";
  return {
    notice: SBAR_PROFILE.label,
    profileKey: SBAR_PROFILE.key,
    profileVersion: SBAR_PROFILE.version,
    generatedBy: source.generatedBy,
    generatedAt: source.generatedAt,
    signed: false as const,
    sections: {
      situation: `Episodio ${source.episode.patientPseudonymousId}, estado ${source.episode.status.toLowerCase()}, alta ${source.episode.dischargeDate.toISOString().slice(0, 10)}.`,
      background: `Protocolo estructurado ${source.checkInProtocol.title} v${source.checkInProtocol.versionNumber}. ${source.activeSafetyPlan ? `Plan de Seguridad activo v${source.activeSafetyPlan.versionNumber}.` : "Sin Plan de Seguridad activo registrado."} ${source.lastCheckIn ? `Último check-in: ${source.lastCheckIn.outcome.toLowerCase()} el ${source.lastCheckIn.recordedAt.toISOString()}.` : "Sin resultado de check-in registrado."}`,
      assessment: `Sin valoración clínica adicional registrada. Avisos deterministas abiertos pendientes de revisión humana: ${source.openAlerts.length}.`,
      recommendation: taskSummary,
    },
    references,
  };
}

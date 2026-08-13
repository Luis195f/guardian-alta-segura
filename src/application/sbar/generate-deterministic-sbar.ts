export const SBAR_PROFILE = {
  key: "synthetic-minimized-sbar",
  version: "demo-v1",
  label: "DEMO SINTÉTICA · NO USO CLÍNICO · SIN FIRMA",
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
  readonly collectionCoverage: {
    readonly openAlerts: BoundedCollectionCoverage;
    readonly openTasks: BoundedCollectionCoverage;
  };
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
    ? `Seguimiento incluido en esta vista: ${source.openTasks.map(({ summary }) => summary).join("; ")}.${source.collectionCoverage.openTasks.truncated ? " Existen más tareas fuera del límite técnico de esta vista." : ""}`
    : "Sin tareas ni seguimiento adicional registrados.";
  return {
    notice: SBAR_PROFILE.label,
    profileKey: SBAR_PROFILE.key,
    profileVersion: SBAR_PROFILE.version,
    collectionLimitNotice: TECHNICAL_COLLECTION_LIMIT_NOTICE,
    collectionCoverage: source.collectionCoverage,
    generatedBy: source.generatedBy,
    generatedAt: source.generatedAt,
    signed: false as const,
    sections: {
      situation: `Episodio ${source.episode.patientPseudonymousId}, estado ${source.episode.status.toLowerCase()}, alta ${source.episode.dischargeDate.toISOString().slice(0, 10)}.`,
      background: `Protocolo estructurado ${source.checkInProtocol.title} v${source.checkInProtocol.versionNumber}. ${source.activeSafetyPlan ? `Plan de Seguridad activo v${source.activeSafetyPlan.versionNumber}.` : "Sin Plan de Seguridad activo registrado."} ${source.lastCheckIn ? `Último check-in: ${source.lastCheckIn.outcome.toLowerCase()} el ${source.lastCheckIn.recordedAt.toISOString()}.` : "Sin resultado de check-in registrado."}`,
      assessment: `Sin valoración clínica adicional registrada. Avisos deterministas abiertos incluidos en esta vista: ${source.openAlerts.length}.${source.collectionCoverage.openAlerts.truncated ? " Existen más avisos fuera del límite técnico de esta vista." : ""}`,
      recommendation: taskSummary,
    },
    references,
  };
}
import type { BoundedCollectionCoverage } from "@/application/collections/bounded-collection";
import { TECHNICAL_COLLECTION_LIMIT_NOTICE } from "@/application/collections/bounded-collection";

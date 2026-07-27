"use client";

import { useEffect, useState } from "react";

import type { EpisodeGovernanceEvidenceResponse } from "@/presentation/components/professional-types";
import { ErrorState, LoadingState } from "@/presentation/components/ui-states";

const integrityLabels = {
  COMPLETE: "Evidencia técnica completa",
  PARTIAL: "Evidencia técnica parcial",
  INCONSISTENT: "Historia técnica inconsistente",
  NOT_APPLICABLE: "No aplicable",
  UNAVAILABLE: "No disponible",
} as const;

function Identifier({ children }: { readonly children: string | null }) {
  return <code>{children ?? "—"}</code>;
}

export function GovernanceEvidencePanel({ episodeId }: { readonly episodeId: string }) {
  const [evidence, setEvidence] = useState<EpisodeGovernanceEvidenceResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(
          `/api/demo/discharge-episodes/${episodeId}/governance-evidence`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as {
          readonly evidence: EpisodeGovernanceEvidenceResponse;
        };
        if (!active) return;
        setEvidence(payload.evidence);
        setState("ready");
      } catch {
        if (active) setState("error");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [episodeId]);

  if (state === "loading") return <LoadingState label="Componiendo evidencia técnica…" />;
  if (state === "error" || !evidence) {
    return (
      <ErrorState>La evidencia no está disponible para esta identidad profesional.</ErrorState>
    );
  }

  return (
    <section className="workspace-panel" aria-labelledby="governance-evidence-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Proyección read-only · referencias minimizadas</p>
          <h2 id="governance-evidence-title">Evidencia / Trazabilidad</h2>
        </div>
        <span className="status-chip">{integrityLabels[evidence.integrity.status]}</span>
      </div>
      <p>
        Evidencia técnica reproducible sobre fuentes existentes. No certifica seguridad clínica,
        cumplimiento jurídico ni conformidad regulatoria.
      </p>

      <div className="summary-grid">
        <article>
          <span>Episodio</span>
          <strong>
            <Identifier>{evidence.episode.id}</Identifier>
          </strong>
          <span>
            estado {evidence.episode.state} · versión {evidence.episode.version}
          </span>
          <span>
            protocolo <Identifier>{evidence.episode.checkInProtocol.versionId}</Identifier> · v
            {evidence.episode.checkInProtocol.versionNumber}
          </span>
          <span>
            responsables <Identifier>{evidence.episode.responsibleNurseId}</Identifier> /{" "}
            <Identifier>{evidence.episode.responsibleClinicianId}</Identifier>
          </span>
        </article>
        <article>
          <span>Gobernanza</span>
          <strong>{evidence.governance.blockers.length} blocker(s) técnico(s) o local(es)</strong>
          <ul>
            {evidence.governance.blockers.map((blocker) => (
              <li key={`${blocker.code}:${blocker.resourceIds.join(":")}`}>{blocker.code}</li>
            ))}
          </ul>
        </article>
        <article>
          <span>Cobertura de consulta</span>
          <strong>
            {Object.values(evidence.coverage).some(({ truncated }) => truncated)
              ? "Parcial y declarada"
              : "Completa dentro del límite explícito"}
          </strong>
          <ul>
            {Object.entries(evidence.coverage).map(([collection, value]) => (
              <li key={collection}>
                {collection}: {value.returned}/{value.limit}
                {value.truncated ? " · truncada" : ""}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <h3>Procedencia y revisión humana</h3>
      {evidence.alerts.length === 0 ? (
        <p>No existen avisos persistidos para este episodio.</p>
      ) : (
        <ol className="timeline">
          {evidence.alerts.map((alert) => {
            const sources =
              alert.provenance.status === "VALID"
                ? alert.provenance.lineage.parents.filter(
                    (parent) => parent.evidenceClass === "SOURCE",
                  )
                : [];
            return (
              <li key={alert.alertId}>
                <strong>
                  Alert <Identifier>{alert.alertId}</Identifier> ·{" "}
                  {integrityLabels[alert.integrity.status]}
                </strong>
                <span>
                  RuleEvaluation <Identifier>{alert.evaluation.evaluationId}</Identifier> · regla{" "}
                  <Identifier>{alert.rule.versionId}</Identifier> v{alert.rule.versionNumber}
                </span>
                <span>Provenance: {alert.provenance.status}</span>
                <span>
                  Source reference:{" "}
                  {alert.sourceVerification.atEvaluation ===
                  "SOURCE_REFERENCE_VERIFIED_AT_EVALUATION"
                    ? "verificada durante RuleEvaluation"
                    : "no disponible para provenance legacy/inválida"}
                </span>
                <span>Source row revalidada durante esta lectura: no</span>
                {sources.map((source) => (
                  <span key={`${source.resource.resourceType}:${source.resource.resourceId}`}>
                    {source.kind} · <Identifier>{source.resource.resourceId}</Identifier>
                  </span>
                ))}
                {alert.humanReviews.map((review) => (
                  <span key={review.reviewId}>
                    Review <Identifier>{review.reviewId}</Identifier> · actor{" "}
                    <Identifier>{review.reviewedById}</Identifier> ·{" "}
                    {new Date(review.reviewedAt).toLocaleString("es-ES")}
                  </span>
                ))}
                <span>Rol histórico del reviewer: no persistido</span>
              </li>
            );
          })}
        </ol>
      )}

      <h3>Accountability de tareas</h3>
      {evidence.tasks.length === 0 ? (
        <p>No existen tareas persistidas para este episodio.</p>
      ) : (
        <ol className="timeline">
          {evidence.tasks.map((task) => (
            <li key={task.accountability.taskId}>
              <strong>
                Task <Identifier>{task.accountability.taskId}</Identifier> ·{" "}
                {integrityLabels[task.integrity.status]}
              </strong>
              <span>
                {task.accountability.origin.kind} · estado {task.accountability.taskState} ·
                revisión {task.accountability.taskRevision}
              </span>
              <span>
                creator <Identifier>{task.accountability.createdById}</Identifier> · assignee{" "}
                <Identifier>{task.accountability.currentAssigneeId}</Identifier> ·{" "}
                {task.accountability.currentAssigneeEligibility}
              </span>
              <span>Accountability evidence: {task.accountabilityEvidenceStatus}</span>
              <span>Signal evidence: {task.signalEvidence.status}</span>
              <span>
                Decisión de autorización por instancia:{" "}
                {task.humanAuthorization.perInstanceDecisionPersistence.status}
              </span>
              {task.accountability.assignmentHistory.map((assignment) => (
                <span key={`${assignment.kind}:${assignment.resultingRevision}`}>
                  {assignment.kind} · <Identifier>{assignment.fromAssignedToId}</Identifier> →{" "}
                  <Identifier>{assignment.toAssignedToId}</Identifier> · actor{" "}
                  <Identifier>{assignment.actorUserId}</Identifier>
                </span>
              ))}
            </li>
          ))}
        </ol>
      )}

      <h3>Referencias de auditoría</h3>
      {evidence.auditReferences.length === 0 ? (
        <p>No existen referencias de auditoría vinculadas dentro de la cobertura consultada.</p>
      ) : (
        <ol className="timeline">
          {evidence.auditReferences.map((event) => (
            <li key={event.auditEventId}>
              <strong>{event.action}</strong>
              <span>
                AuditEvent <Identifier>{event.auditEventId}</Identifier> · {event.resourceType}{" "}
                <Identifier>{event.resourceId}</Identifier> · {event.result}
              </span>
              <span>
                correlation <Identifier>{event.correlationId}</Identifier>
              </span>
              <time>{new Date(event.occurredAt).toLocaleString("es-ES")}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

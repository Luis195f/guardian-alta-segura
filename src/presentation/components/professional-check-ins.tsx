"use client";

import { useEffect, useState } from "react";

import { CheckInAssignmentPanel } from "@/presentation/components/check-in-assignment-panel";
import { EmptyState, ErrorState, LoadingState } from "@/presentation/components/ui-states";

interface Assignment {
  readonly id: string;
  readonly status: "PENDING" | "RESPONDED" | "EXPIRED" | "OMITTED";
  readonly scheduledFor: string;
  readonly patientPseudonymousId: string;
  readonly protocol: { readonly versionNumber: number };
}

export function ProfessionalCheckIns({
  episodeId,
  protocolVersionId,
}: {
  readonly episodeId: string;
  readonly protocolVersionId: string;
}) {
  const [assignments, setAssignments] = useState<readonly Assignment[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch("/api/demo/check-ins", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as { readonly assignments: readonly Assignment[] };
      })
      .then((payload) => {
        setAssignments(payload.assignments);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Check-ins</p>
          <h2>Actividad programada</h2>
        </div>
      </div>
      {state === "loading" && <LoadingState />}
      {state === "error" && <ErrorState>No se pudieron consultar los check-ins.</ErrorState>}
      {state === "ready" && assignments.length === 0 && (
        <EmptyState>Sin check-ins asignados.</EmptyState>
      )}
      {assignments.length > 0 && (
        <div className="table-wrap">
          <table className="product-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Protocolo</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>{new Date(assignment.scheduledFor).toLocaleString("es-ES")}</td>
                  <td>{assignment.status.toLowerCase()}</td>
                  <td>Versión {assignment.protocol.versionNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CheckInAssignmentPanel episodeId={episodeId} protocolVersionId={protocolVersionId} enabled />
    </section>
  );
}

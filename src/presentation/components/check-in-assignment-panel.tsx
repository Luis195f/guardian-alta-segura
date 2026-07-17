"use client";

import { useState } from "react";

export function CheckInAssignmentPanel({
  episodeId,
  protocolVersionId,
  enabled,
}: {
  readonly episodeId: string;
  readonly protocolVersionId: string;
  readonly enabled: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function generateAssignments() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/check-ins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `check-in-batch:${crypto.randomUUID()}`,
        },
        body: JSON.stringify({ episodeId, protocolVersionId }),
      });
      if (response.status === 403) {
        setMessage(
          "No se crearon asignaciones: falta participación digital vigente o fue revocada.",
        );
        return;
      }
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { assignmentIds: readonly string[] };
      setMessage(
        `${payload.assignmentIds.length} asignaciones creadas desde la cadencia versionada; no se enviaron comunicaciones.`,
      );
    } catch {
      setMessage("No se pudieron crear asignaciones para este episodio.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="check-in-assignment" aria-labelledby={`assign-${episodeId}`}>
      <h3 id={`assign-${episodeId}`}>Asignaciones de check-in</h3>
      <p>
        Revalida participación digital y aplica la versión fijada al episodio. No genera alertas ni
        comunicaciones.
      </p>
      <button type="button" onClick={generateAssignments} disabled={!enabled || pending}>
        Crear asignaciones por cadencia
      </button>
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

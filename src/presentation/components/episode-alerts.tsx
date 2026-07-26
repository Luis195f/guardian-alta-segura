"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ProfessionalQueueEntry,
  ProfessionalQueueResponse,
} from "@/presentation/components/professional-types";
import { EmptyState, ErrorState, LoadingState } from "@/presentation/components/ui-states";

function provenanceLabel(entry: ProfessionalQueueEntry["openAlerts"][number]): string {
  if (entry.provenance.status === "VALID") {
    const source = entry.provenance.lineage.parents.find(
      (reference) => reference.evidenceClass === "SOURCE",
    );
    return source ? `${source.kind} · ${source.resource.resourceId}` : "Sin fuente referenciada";
  }
  if (entry.provenance.status === "LEGACY_UNVERSIONED") {
    const source = entry.provenance.references[0];
    return source
      ? `${source.resourceType} · ${source.resourceId} (histórico no versionado)`
      : "Histórico sin referencias";
  }
  return "Procedencia no disponible";
}

export function EpisodeAlerts({
  episodeId,
  onOpenFollowUp,
}: {
  readonly episodeId: string;
  readonly onOpenFollowUp: () => void;
}) {
  const [entry, setEntry] = useState<ProfessionalQueueEntry | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/demo/nursing-workqueue", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as ProfessionalQueueResponse;
      setEntry(payload.entries.find((item) => item.episode.id === episodeId) ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [episodeId]);

  useEffect(() => {
    let active = true;
    fetch("/api/demo/nursing-workqueue", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as ProfessionalQueueResponse;
      })
      .then((payload) => {
        if (!active) return;
        setEntry(payload.entries.find((item) => item.episode.id === episodeId) ?? null);
        setState("ready");
      })
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, [episodeId]);

  async function review(alertId: string) {
    setMessage("");
    const response = await fetch(`/api/demo/alerts/${alertId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextState: "reviewed" }),
    });
    if (!response.ok) {
      setMessage("No se pudo registrar la revisión.");
      return;
    }
    setMessage("Revisar el aviso no ha creado ninguna actuación automática.");
    await load();
  }

  if (state === "loading") return <LoadingState label="Cargando avisos del episodio…" />;
  if (state === "error") return <ErrorState>No se pudieron consultar los avisos.</ErrorState>;

  return (
    <section className="workspace-panel" aria-labelledby="episode-alerts-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Organización determinista para revisión humana</p>
          <h2 id="episode-alerts-title">Avisos del episodio</h2>
        </div>
      </div>
      {!entry?.openAlerts.length ? (
        <EmptyState>No hay avisos abiertos o revisados en este episodio.</EmptyState>
      ) : (
        <ol className="review-list">
          {entry.openAlerts.map((alert) => (
            <li key={alert.id}>
              <div className="review-list-header">
                <span className={`status-chip status-${alert.state}`}>
                  {alert.state === "open" ? "PENDIENTE DE REVISIÓN" : "REVISADO"}
                </span>
                <time dateTime={alert.triggeredAt}>
                  {new Date(alert.triggeredAt).toLocaleString("es-ES")}
                </time>
              </div>
              <h3>{alert.ruleName}</h3>
              <dl className="detail-list">
                <div>
                  <dt>Origen</dt>
                  <dd>{provenanceLabel(alert)}</dd>
                </div>
                <div>
                  <dt>Regla / versión</dt>
                  <dd>
                    v{alert.ruleVersionNumber} · {alert.ruleVersionId}
                  </dd>
                </div>
                <div>
                  <dt>Explicación</dt>
                  <dd>{alert.explanation}</dd>
                </div>
                <div>
                  <dt>Revisión</dt>
                  <dd>{alert.reviewedByHuman ? "Registrada por una persona" : "Pendiente"}</dd>
                </div>
              </dl>
              {alert.state === "open" ? (
                <button type="button" onClick={() => void review(alert.id)}>
                  Revisar
                </button>
              ) : (
                <button type="button" onClick={onOpenFollowUp}>
                  Crear tarea de seguimiento
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {message && (
        <p className="human-review-note" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

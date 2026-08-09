"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { OperationalContinuityResponse } from "@/presentation/components/professional-types";
import { EmptyState, ErrorState, LoadingState } from "@/presentation/components/ui-states";

const sourceLabels: Readonly<
  Record<OperationalContinuityResponse["items"][number]["sourceType"], string>
> = {
  EPISODE: "Episodio",
  CHECK_IN: "Check-in",
  RULE_EVALUATION: "Evaluación de regla",
  ALERT: "Aviso",
  ALERT_REVIEW: "Revisión humana",
  TASK: "Tarea",
  GOVERNANCE_EVIDENCE: "Evidencia de gobernanza",
};

const administrativeLabels: Readonly<
  Record<OperationalContinuityResponse["items"][number]["administrativeState"], string>
> = {
  DATA_ERROR: "Error de datos",
  BLOCKED: "Bloqueado",
  TECHNICALLY_OVERDUE: "Vencido técnico",
  PENDING: "Pendiente",
  NO_EVIDENCE: "Sin evidencia",
  ABSTAINED: "Abstención",
  RECORDED: "Registrado",
  RESOLVED: "Resuelto",
  UPDATE_UNKNOWN: "Actualización desconocida",
};

function dateLabel(value: string | null): string {
  if (!value) return "No disponible";
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

interface LoadedPage {
  readonly cursor: string | null;
  readonly response: OperationalContinuityResponse;
}

export function ProfessionalDashboard() {
  const [pages, setPages] = useState<readonly LoadedPage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  async function fetchPage(cursor: string | null): Promise<OperationalContinuityResponse> {
    const parameters = new URLSearchParams({ pageSize: "12" });
    if (cursor) parameters.set("cursor", cursor);
    const response = await fetch(`/api/demo/operational-continuity?${parameters}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error();
    return (await response.json()) as OperationalContinuityResponse;
  }

  useEffect(() => {
    let active = true;
    fetchPage(null)
      .then((response) => {
        if (!active) return;
        setPages([{ cursor: null, response }]);
        setState("ready");
      })
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const current = pages[pageIndex]?.response ?? null;

  async function nextPage() {
    const cursor = current?.page.nextCursor;
    if (!cursor) return;
    setPending(true);
    setAnnouncement("");
    try {
      const existing = pages[pageIndex + 1];
      if (existing?.cursor === cursor) {
        setPageIndex(pageIndex + 1);
      } else {
        const response = await fetchPage(cursor);
        setPages((previous) => [...previous.slice(0, pageIndex + 1), { cursor, response }]);
        setPageIndex(pageIndex + 1);
      }
      setAnnouncement(`Página ${pageIndex + 2} cargada.`);
    } catch {
      setAnnouncement("No se pudo cargar la página siguiente. No se amplió la visibilidad.");
    } finally {
      setPending(false);
    }
  }

  if (state === "loading") {
    return <LoadingState label="Componiendo la vista administrativa del circuito…" />;
  }
  if (state === "error" || !current) {
    return (
      <ErrorState>
        No se pudo consultar la vista administrativa. No se ha realizado ninguna acción.
      </ErrorState>
    );
  }

  return (
    <section className="content-section" aria-labelledby="operational-continuity-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Panel operativo de continuidad · solo lectura</p>
          <h2 id="operational-continuity-title">Estado administrativo de fuentes autorizadas</h2>
        </div>
      </div>
      <p>
        Cada fila conserva la semántica de su fuente. No es una puntuación, no ordena pacientes por
        riesgo y no recomienda decisiones clínicas.
      </p>
      <p className="human-review-note" role="status">
        Actualización desconocida. Consulta generada el {dateLabel(current.freshness.generatedAt)}.{" "}
        {current.freshness.explanation}
      </p>
      <p>
        “Actualización de la fuente” es una marca técnica distinta de la configuración, la última
        evidencia conocida y la generación de esta consulta; no garantiza actualidad clínica.
      </p>

      {current.items.length === 0 ? (
        <EmptyState>No hay fuentes autorizadas para esta identidad profesional.</EmptyState>
      ) : (
        <div className="table-wrap" tabIndex={0} aria-label="Fuentes operativas autorizadas">
          <table className="product-table">
            <caption className="sr-only">
              Fuentes separadas, ordenadas por estado administrativo, marca configurada, tipo e ID
            </caption>
            <thead>
              <tr>
                <th>Fuente</th>
                <th>Episodio sintético</th>
                <th>Estado administrativo</th>
                <th>Responsabilidad actual</th>
                <th>Marca configurada</th>
                <th>Última evidencia conocida</th>
                <th>Actualización de la fuente</th>
                <th>Por qué aparece</th>
                <th>
                  <span className="sr-only">Fuente canónica</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {current.items.map((item) => (
                <tr key={`${item.sourceType}:${item.resourceId}`}>
                  <td>
                    <strong>{sourceLabels[item.sourceType]}</strong>
                    <small>Estado fuente: {item.sourceState}</small>
                  </td>
                  <td>{item.episodeAlias}</td>
                  <td>
                    <span className="status-chip">
                      {administrativeLabels[item.administrativeState]}
                    </span>
                  </td>
                  <td>{item.currentResponsibility ?? "No definida por esta fuente"}</td>
                  <td>{dateLabel(item.configuredAt)}</td>
                  <td>{dateLabel(item.lastEvidenceAt)}</td>
                  <td>{dateLabel(item.sourceUpdatedAt)}</td>
                  <td>{item.inclusionReason}</td>
                  <td>
                    <Link className="table-action" href={item.canonicalHref}>
                      Consultar fuente
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav className="pagination-controls" aria-label="Paginación del panel operativo">
        <button
          type="button"
          className="secondary-button"
          disabled={pending || pageIndex === 0}
          onClick={() => {
            setPageIndex((index) => Math.max(0, index - 1));
            setAnnouncement(`Página ${pageIndex} cargada.`);
          }}
        >
          Página anterior
        </button>
        <span>
          Página {pageIndex + 1} · {current.page.returned} de {current.page.size} filas máximas
          {current.page.truncated ? " · hay más resultados" : " · fin de resultados"}
        </span>
        <button
          type="button"
          disabled={pending || !current.page.hasNextPage}
          onClick={() => void nextPage()}
        >
          Página siguiente
        </button>
      </nav>
      <p className="status" role="status" aria-live="polite">
        {pending ? "Cargando página…" : announcement}
      </p>
      <aside className="human-review-note" aria-label="Límites del panel">
        Los compromisos 5B permanecen en el núcleo sintético interno sin API/UI por su gate vigente.
        No se muestran 5C, evaluación de vencimientos, scoring, semáforo ni prioridad clínica
        automática. Las acciones humanas continúan exclusivamente en sus superficies canónicas.
      </aside>
    </section>
  );
}

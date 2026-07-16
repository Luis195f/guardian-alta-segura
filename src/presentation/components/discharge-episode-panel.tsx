"use client";

import { useState, type FormEvent } from "react";

interface EpisodeListItem {
  readonly id: string;
  readonly dischargeDate: string;
  readonly programLengthDays: number;
  readonly status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
  readonly version: number;
  readonly patient: { readonly externalPseudonymousId: string };
  readonly responsibleNurse: { readonly syntheticAlias: string };
  readonly responsibleClinician: { readonly syntheticAlias: string };
}

interface EpisodeDetail extends EpisodeListItem {
  readonly transitions: readonly {
    readonly id: string;
    readonly fromStatus: EpisodeListItem["status"] | null;
    readonly toStatus: EpisodeListItem["status"];
    readonly reason: string | null;
    readonly resultingVersion: number;
    readonly occurredAt: string;
    readonly actor: { readonly syntheticAlias: string };
  }[];
}

const statusLabel: Readonly<Record<EpisodeListItem["status"], string>> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  CLOSED: "Cerrado",
};

function newIdempotencyKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

export function DischargeEpisodePanel({ enabled }: { readonly enabled: boolean }) {
  const [episodes, setEpisodes] = useState<readonly EpisodeListItem[]>([]);
  const [detail, setDetail] = useState<EpisodeDetail | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [dischargeDate, setDischargeDate] = useState("");
  const [programLengthDays, setProgramLengthDays] = useState("30");
  const [closeReason, setCloseReason] = useState("");

  async function loadEpisodes() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/discharge-episodes", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { episodes: readonly EpisodeListItem[] };
      setEpisodes(payload.episodes);
      setMessage(
        payload.episodes.length === 0 ? "No hay episodios asignados." : "Listado actualizado.",
      );
    } catch {
      setMessage("No se pudo cargar el listado. Inicia una sesión profesional sintética.");
    } finally {
      setPending(false);
    }
  }

  async function loadDetail(episodeId: string) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/demo/discharge-episodes/${episodeId}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { episode: EpisodeDetail };
      setDetail(payload.episode);
    } catch {
      setMessage("No se pudo cargar el detalle del episodio.");
    } finally {
      setPending(false);
    }
  }

  async function createEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/discharge-episodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": newIdempotencyKey("create"),
        },
        body: JSON.stringify({
          externalPseudonymousId: "SYNTH-PATIENT-001",
          dischargeDate,
          programLengthDays: Number(programLengthDays),
          responsibleNurseAlias: "demo-nurse",
          responsibleClinicianAlias: "demo-clinician",
        }),
      });
      if (!response.ok) throw new Error();
      const result = (await response.json()) as { episodeId: string };
      setMessage("Episodio sintético creado como borrador.");
      await loadEpisodes();
      await loadDetail(result.episodeId);
    } catch {
      setMessage("No se pudo crear el episodio. Revisa los campos y la sesión profesional.");
    } finally {
      setPending(false);
    }
  }

  async function transition(targetStatus: EpisodeListItem["status"]) {
    if (!detail) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/demo/discharge-episodes/${detail.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": newIdempotencyKey("transition"),
        },
        body: JSON.stringify({
          targetStatus,
          expectedVersion: detail.version,
          reason: targetStatus === "CLOSED" ? closeReason : null,
        }),
      });
      if (response.status === 409) {
        setMessage(
          targetStatus === "CLOSED"
            ? "Cierre bloqueado: la política de avisos abiertos aún no está disponible o el episodio cambió."
            : "Conflicto de edición: vuelve a cargar el detalle antes de reintentar.",
        );
        return;
      }
      if (!response.ok) throw new Error();
      await loadEpisodes();
      await loadDetail(detail.id);
      setMessage(`Transición a ${statusLabel[targetStatus].toLowerCase()} registrada y auditada.`);
    } catch {
      setMessage("No se pudo registrar la transición.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel episode-panel" aria-labelledby="episode-title">
      <p className="badge">SINTÉTICO / NO USO CLÍNICO</p>
      <p className="eyebrow">Alta estructurada</p>
      <h2 id="episode-title">Episodios postalta trazables</h2>
      <p>
        El demo registra estados y responsables. No infiere eficacia, diagnóstico ni riesgo y no
        ejecuta tareas clínicas automáticas.
      </p>

      <div className="episode-layout">
        <form onSubmit={createEpisode}>
          <h3>Crear episodio</h3>
          <label htmlFor="synthetic-patient">Paciente seudonimizado</label>
          <select
            id="synthetic-patient"
            disabled={!enabled || pending}
            defaultValue="SYNTH-PATIENT-001"
          >
            <option value="SYNTH-PATIENT-001">SYNTH-PATIENT-001</option>
          </select>
          <label htmlFor="discharge-date">Fecha de alta</label>
          <input
            id="discharge-date"
            type="date"
            required
            value={dischargeDate}
            disabled={!enabled || pending}
            onChange={(event) => setDischargeDate(event.target.value)}
          />
          <label htmlFor="program-length">Duración del programa</label>
          <select
            id="program-length"
            value={programLengthDays}
            disabled={!enabled || pending}
            onChange={(event) => setProgramLengthDays(event.target.value)}
          >
            <option value="30">30 días</option>
            <option value="60">60 días</option>
            <option value="90">90 días</option>
          </select>
          <p className="policy-note">Responsables demo: demo-nurse y demo-clinician.</p>
          <button type="submit" disabled={!enabled || pending}>
            Crear borrador
          </button>
        </form>

        <div>
          <h3>Listado</h3>
          <button type="button" onClick={loadEpisodes} disabled={!enabled || pending}>
            Cargar episodios asignados
          </button>
          {episodes.length === 0 ? (
            <p className="empty-state">Sin episodios cargados.</p>
          ) : (
            <ul className="episode-list">
              {episodes.map((episode) => (
                <li key={episode.id}>
                  <button
                    type="button"
                    className="episode-link"
                    onClick={() => loadDetail(episode.id)}
                  >
                    {episode.patient.externalPseudonymousId} — {statusLabel[episode.status]} — v
                    {episode.version}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {detail && (
        <section className="episode-detail" aria-labelledby="episode-detail-title">
          <h3 id="episode-detail-title">Detalle: {detail.patient.externalPseudonymousId}</h3>
          <dl>
            <div>
              <dt>Estado</dt>
              <dd>{statusLabel[detail.status]}</dd>
            </div>
            <div>
              <dt>Versión</dt>
              <dd>{detail.version}</dd>
            </div>
            <div>
              <dt>Alta</dt>
              <dd>{detail.dischargeDate.slice(0, 10)}</dd>
            </div>
            <div>
              <dt>Programa</dt>
              <dd>{detail.programLengthDays} días</dd>
            </div>
            <div>
              <dt>Enfermería</dt>
              <dd>{detail.responsibleNurse.syntheticAlias}</dd>
            </div>
            <div>
              <dt>Clínico</dt>
              <dd>{detail.responsibleClinician.syntheticAlias}</dd>
            </div>
          </dl>
          <div className="episode-actions">
            {detail.status === "DRAFT" && (
              <button type="button" onClick={() => transition("ACTIVE")}>
                Activar
              </button>
            )}
            {detail.status === "ACTIVE" && (
              <button type="button" onClick={() => transition("PAUSED")}>
                Pausar
              </button>
            )}
            {detail.status === "PAUSED" && (
              <button type="button" onClick={() => transition("ACTIVE")}>
                Reactivar
              </button>
            )}
            {(detail.status === "ACTIVE" || detail.status === "PAUSED") && (
              <>
                <label htmlFor="close-reason">Motivo de cierre</label>
                <input
                  id="close-reason"
                  value={closeReason}
                  onChange={(event) => setCloseReason(event.target.value)}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => transition("CLOSED")}
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
          <h3>Timeline de transiciones</h3>
          <ol className="timeline">
            {detail.transitions.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.fromStatus ? `${statusLabel[item.fromStatus]} → ` : "Creación → "}
                  {statusLabel[item.toStatus]}
                </strong>
                <span>
                  v{item.resultingVersion} · {item.actor.syntheticAlias}
                </span>
                {item.reason && <span>Motivo: {item.reason}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

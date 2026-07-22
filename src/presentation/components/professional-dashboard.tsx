"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ProfessionalQueueResponse } from "@/presentation/components/professional-types";
import { EmptyState, ErrorState, LoadingState } from "@/presentation/components/ui-states";

interface CheckInView {
  readonly status: "PENDING" | "RESPONDED" | "EXPIRED" | "OMITTED";
  readonly scheduledFor: string;
}

type PlanStatus = Readonly<Record<string, number | null>>;

export function ProfessionalDashboard() {
  const [queue, setQueue] = useState<ProfessionalQueueResponse | null>(null);
  const [checkIns, setCheckIns] = useState<readonly CheckInView[]>([]);
  const [plans, setPlans] = useState<PlanStatus>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const queueResponse = await fetch("/api/demo/nursing-workqueue", { cache: "no-store" });
        if (!queueResponse.ok) throw new Error();
        const queuePayload = (await queueResponse.json()) as ProfessionalQueueResponse;
        if (!active) return;
        setQueue(queuePayload);
        setState("ready");

        const checkInResponse = await fetch("/api/demo/check-ins", { cache: "no-store" });
        if (checkInResponse.ok) {
          const checkInPayload = (await checkInResponse.json()) as {
            readonly assignments: readonly CheckInView[];
          };
          if (active) setCheckIns(checkInPayload.assignments);
        }

        const planEntries = await Promise.all(
          queuePayload.entries.slice(0, 8).map(async ({ episode }) => {
            const response = await fetch(`/api/demo/discharge-episodes/${episode.id}/safety-plan`, {
              cache: "no-store",
            });
            if (!response.ok) return [episode.id, null] as const;
            const payload = (await response.json()) as {
              readonly plan: { readonly activeVersionNumber: number | null } | null;
            };
            return [episode.id, payload.plan?.activeVersionNumber ?? null] as const;
          }),
        );
        if (!active) return;
        setPlans(Object.fromEntries(planEntries));
      } catch {
        if (active) setState("error");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") return <LoadingState label="Preparando prioridades del seguimiento…" />;
  if (state === "error" || !queue) {
    return <ErrorState>Vuelve a intentarlo o inicia una nueva sesión demo.</ErrorState>;
  }

  const activeEpisodes = queue.entries.filter(({ episode }) => episode.status === "ACTIVE").length;
  const pendingAlerts = queue.entries.reduce(
    (total, entry) => total + entry.openAlerts.filter(({ state }) => state === "open").length,
    0,
  );
  const pendingCheckIns = checkIns.filter(({ status }) => status === "PENDING").length;
  const latestCheckIn = [...checkIns].sort((a, b) =>
    b.scheduledFor.localeCompare(a.scheduledFor),
  )[0];
  const priorityEntries = queue.entries.slice(0, 8);

  return (
    <>
      <section className="metric-grid" aria-label="Resumen organizativo">
        <article>
          <span>Episodios activos</span>
          <strong>{activeEpisodes}</strong>
          <Link href="/episodes">Ver episodios</Link>
        </article>
        <article>
          <span>Avisos pendientes de revisión</span>
          <strong>{pendingAlerts}</strong>
          <Link href="/alerts">Revisar avisos</Link>
        </article>
        <article>
          <span>Tareas abiertas</span>
          <strong>{queue.metrics.openTaskCount}</strong>
          <Link href="/workqueue">Abrir seguimiento</Link>
        </article>
        <article>
          <span>Check-ins pendientes</span>
          <strong>{pendingCheckIns}</strong>
          <small>
            Último resultado: {latestCheckIn ? latestCheckIn.status.toLowerCase() : "sin datos"}
          </small>
        </article>
      </section>

      <section className="content-section" aria-labelledby="followed-episodes-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pacientes / episodios en seguimiento</p>
            <h2 id="followed-episodes-title">Qué requiere atención organizativa</h2>
          </div>
          <Link href="/episodes">Ver todos</Link>
        </div>
        {queue.entries.length === 0 ? (
          <EmptyState>No hay episodios asignados a esta identidad.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Alta / estado</th>
                  <th>Plan de Seguridad</th>
                  <th>Último check-in</th>
                  <th>Avisos / tareas</th>
                  <th>
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {priorityEntries.map((entry) => {
                  const activePlan = plans[entry.episode.id];
                  return (
                    <tr key={entry.episode.id}>
                      <td>
                        <strong>{entry.episode.patientPseudonymousId}</strong>
                      </td>
                      <td>
                        {entry.episode.dischargeDate.slice(0, 10)}
                        <small>{entry.episode.status.toLowerCase()}</small>
                      </td>
                      <td>{activePlan ? `Activo · versión ${activePlan}` : "Pendiente"}</td>
                      <td>
                        {entry.lastRelevantCheckIn?.outcome?.type ?? "Sin resultado"}
                        {entry.lastRelevantCheckIn && (
                          <small>
                            {new Date(entry.lastRelevantCheckIn.scheduledFor).toLocaleDateString(
                              "es-ES",
                            )}
                          </small>
                        )}
                      </td>
                      <td>
                        {entry.openAlerts.length} aviso(s)
                        <small>
                          {entry.tasks.filter(({ state }) => state === "open").length} tarea(s)
                          abierta(s)
                        </small>
                      </td>
                      <td>
                        <Link className="table-action" href={`/episodes/${entry.episode.id}`}>
                          Abrir episodio
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="human-review-note">
        Los avisos organizan información determinista para revisión humana. Ninguna actuación
        clínica se crea automáticamente.
      </p>
    </>
  );
}

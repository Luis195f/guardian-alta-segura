"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Professional = { readonly id: string; readonly syntheticAlias: string };
type QueueTask = {
  readonly id: string;
  readonly alertId: string | null;
  readonly summary: string;
  readonly state: "open" | "resolved";
  readonly revision: number;
  readonly assignedTo: Professional | null;
  readonly resolvedAt: string | null;
  readonly resolutionReason: string | null;
  readonly createdAt: string;
  readonly events: readonly {
    readonly id: string;
    readonly type: string;
    readonly note: string | null;
    readonly contactOutcome: string | null;
    readonly resolutionReason: string | null;
    readonly resultingRevision: number;
    readonly occurredAt: string;
    readonly actor: { readonly syntheticAlias: string };
    readonly toAssignedTo: Professional | null;
  }[];
};
type QueueEntry = {
  readonly episode: {
    readonly id: string;
    readonly status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
    readonly dischargeDate: string;
    readonly patientPseudonymousId: string;
    readonly responsibleNurse: Professional;
    readonly responsibleClinician: Professional;
  };
  readonly pendingElementCount: number;
  readonly lastRelevantCheckIn: {
    readonly id: string;
    readonly scheduledFor: string;
    readonly outcome: { readonly type: string; readonly recordedAt: string } | null;
  } | null;
  readonly openAlerts: readonly {
    readonly id: string;
    readonly state: "open" | "reviewed" | "actioned";
    readonly ruleName: string;
    readonly ruleVersionId: string;
    readonly ruleVersionNumber: number;
    readonly explanation: string;
    readonly origins: readonly {
      readonly source?: {
        readonly resourceType?: string;
        readonly resourceId?: string;
        readonly field?: string;
      };
    }[];
    readonly triggeredAt: string;
    readonly reviewedByHuman: boolean;
  }[];
  readonly tasks: readonly QueueTask[];
};
type QueueResponse = {
  readonly entries: readonly QueueEntry[];
  readonly metrics: {
    readonly episodeCount: number;
    readonly pendingElementCount: number;
    readonly openTaskCount: number;
    readonly resolvedTaskCount: number;
    readonly oldestOpenTaskAgeHours: number | null;
  };
};

function newKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

async function post(url: string, body: unknown, prefix: string) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": newKey(prefix) },
    body: JSON.stringify(body),
  });
}

function TaskActions({
  task,
  professionals,
  pending,
  onChanged,
}: {
  readonly task: QueueTask;
  readonly professionals: readonly Professional[];
  readonly pending: boolean;
  readonly onChanged: (message: string) => Promise<void>;
}) {
  const [assigneeId, setAssigneeId] = useState(professionals[0]?.id ?? "");
  const [outcome, setOutcome] = useState("no-answer");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [actionPending, setActionPending] = useState(false);

  async function act(body: Record<string, unknown>, prefix: string, message: string) {
    setActionPending(true);
    try {
      const response = await post(
        `/api/demo/tasks/${task.id}/events`,
        { ...body, expectedRevision: task.revision },
        prefix,
      );
      if (!response.ok) throw new Error();
      await onChanged(message);
    } catch {
      await onChanged(
        "No se pudo registrar la acción. Se ha recargado la tarea para evitar una actualización obsoleta.",
      );
    } finally {
      setActionPending(false);
    }
  }

  if (task.state === "resolved") {
    return (
      <p>
        Resuelta por acción humana el {new Date(task.resolvedAt!).toLocaleString("es-ES")}. Motivo:{" "}
        {task.resolutionReason}
      </p>
    );
  }

  return (
    <div className="task-actions">
      <label>
        Profesional autorizado
        <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
          {professionals.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.syntheticAlias}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={pending || actionPending || !assigneeId || assigneeId === task.assignedTo?.id}
        onClick={() =>
          void act(
            { action: "assign", assignedToId: assigneeId },
            "task-assign",
            "Asignación humana registrada.",
          )
        }
      >
        {task.assignedTo ? "Reasignar" : "Asignar"}
      </button>
      <label>
        Resultado técnico del intento
        <select value={outcome} onChange={(event) => setOutcome(event.target.value)}>
          <option value="no-answer">Sin respuesta</option>
          <option value="reached">Contacto alcanzado</option>
          <option value="other">Otro</option>
        </select>
      </label>
      <button
        type="button"
        disabled={pending || actionPending}
        onClick={() =>
          void act(
            { action: "contact-attempt", outcome },
            "task-contact",
            "Intento de contacto registrado; no se ha enviado ninguna comunicación.",
          )
        }
      >
        Registrar intento
      </button>
      <label>
        Nota breve minimizada
        <input value={note} maxLength={280} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button
        type="button"
        disabled={pending || actionPending || note.trim().length < 3}
        onClick={() => void act({ action: "note", note }, "task-note", "Nota breve registrada.")}
      >
        Registrar nota
      </button>
      <label>
        Motivo de resolución
        <input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
      </label>
      <button
        type="button"
        className="secondary-button"
        disabled={pending || actionPending || reason.trim().length < 3}
        onClick={() =>
          void act(
            { action: "resolve", reason },
            "task-resolve",
            "Tarea resuelta por acción humana; el episodio permanece sin cambios.",
          )
        }
      >
        Resolver tarea
      </button>
    </div>
  );
}

export function NursingWorkQueuePanel({
  enabled,
  episodeId,
}: {
  readonly enabled: boolean;
  readonly episodeId?: string;
}) {
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [status, setStatus] = useState("");
  const [taskState, setTaskState] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(
    "Inicia sesión como demo-nurse o demo-clinician para consultar la cola.",
  );
  const [drafts, setDrafts] = useState<
    Readonly<Record<string, { summary: string; alertId: string; assignedToId: string }>>
  >({});
  const initiallyLoaded = useRef(false);

  const professionals = useMemo(() => {
    const byId = new Map<string, Professional>();
    for (const entry of queue?.entries ?? []) {
      byId.set(entry.episode.responsibleNurse.id, entry.episode.responsibleNurse);
      byId.set(entry.episode.responsibleClinician.id, entry.episode.responsibleClinician);
    }
    return [...byId.values()];
  }, [queue]);

  const loadQueue = useCallback(
    async (messageAfterLoad?: string) => {
      if (!enabled) return;
      setPending(true);
      try {
        const parameters = new URLSearchParams();
        if (status) parameters.set("status", status);
        if (taskState) parameters.set("taskState", taskState);
        if (dateFrom) parameters.set("dateFrom", dateFrom);
        if (dateTo) parameters.set("dateTo", dateTo);
        if (responsibleId) parameters.set("responsibleProfessionalId", responsibleId);
        if (pendingOnly) parameters.set("pendingOnly", "true");
        const response = await fetch(`/api/demo/nursing-workqueue?${parameters}`, {
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          setQueue(null);
          setMessage("La sesión actual no tiene acceso a la cola enfermera.");
          return;
        }
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as QueueResponse;
        setQueue(payload);
        setMessage(
          messageAfterLoad ??
            (payload.entries.length === 0
              ? "No hay elementos para los filtros seleccionados."
              : "Cola actualizada con datos sintéticos minimizados."),
        );
      } catch {
        setQueue(null);
        setMessage("No se pudo cargar la cola. No se ha realizado ninguna acción.");
      } finally {
        setPending(false);
      }
    },
    [dateFrom, dateTo, enabled, pendingOnly, responsibleId, status, taskState],
  );

  useEffect(() => {
    if (initiallyLoaded.current) return;
    initiallyLoaded.current = true;
    void loadQueue();
  }, [loadQueue]);

  const visibleEntries = useMemo(
    () => queue?.entries.filter((entry) => !episodeId || entry.episode.id === episodeId) ?? [],
    [episodeId, queue],
  );

  function updateDraft(episodeId: string, field: string, value: string) {
    setDrafts((current) => ({
      ...current,
      [episodeId]: {
        summary: current[episodeId]?.summary ?? "",
        alertId: current[episodeId]?.alertId ?? "",
        assignedToId: current[episodeId]?.assignedToId ?? "",
        [field]: value,
      },
    }));
  }

  async function createTask(event: FormEvent, entry: QueueEntry) {
    event.preventDefault();
    const draft = drafts[entry.episode.id];
    setPending(true);
    try {
      const response = await post(
        "/api/demo/tasks",
        {
          episodeId: entry.episode.id,
          alertId: draft?.alertId || null,
          summary: draft?.summary ?? "",
          assignedToId: draft?.assignedToId || null,
        },
        "task-create-human",
      );
      if (!response.ok) throw new Error();
      setDrafts((current) => ({
        ...current,
        [entry.episode.id]: { summary: "", alertId: "", assignedToId: "" },
      }));
      await loadQueue("Tarea creada por acción humana explícita; no implica derivación clínica.");
    } catch {
      setMessage("No se pudo crear la tarea. Revisa el resumen y el estado de la cola.");
      setPending(false);
    }
  }

  async function markAlertReviewed(alertId: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/demo/alerts/${alertId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextState: "reviewed" }),
      });
      if (!response.ok) throw new Error();
      await loadQueue("Aviso revisado por una persona; no se ha creado ninguna tarea.");
    } catch {
      setMessage("No se pudo registrar la revisión del aviso.");
      setPending(false);
    }
  }

  async function changed(messageAfterChange: string) {
    await loadQueue(messageAfterChange);
  }

  return (
    <section className="panel nursing-workqueue" aria-labelledby="nursing-workqueue-title">
      <p className="eyebrow">Organización para seguimiento humano</p>
      <h2 id="nursing-workqueue-title">Cola de seguimiento</h2>
      <p>
        Revisado no significa resuelto. Crear una tarea no deriva, cierra, recomienda ni ejecuta
        ninguna actuación clínica.
      </p>
      <details className="filter-panel">
        <summary>Filtros</summary>
        <form
          className="workqueue-filters"
          onSubmit={(event) => {
            event.preventDefault();
            void loadQueue();
          }}
        >
          <label>
            Estado del episodio
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos</option>
              <option value="DRAFT">Borrador</option>
              <option value="ACTIVE">Activo</option>
              <option value="PAUSED">Pausado</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          </label>
          <label>
            Estado de tarea
            <select value={taskState} onChange={(event) => setTaskState(event.target.value)}>
              <option value="">Cualquiera</option>
              <option value="open">Abierta</option>
              <option value="resolved">Resuelta</option>
            </select>
          </label>
          <label>
            Alta desde
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <label>
            Alta hasta
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label>
            Profesional responsable
            <select
              value={responsibleId}
              onChange={(event) => setResponsibleId(event.target.value)}
            >
              <option value="">Todos los visibles</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.syntheticAlias}
                </option>
              ))}
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(event) => setPendingOnly(event.target.checked)}
            />
            Solo elementos pendientes
          </label>
          <button type="submit" disabled={!enabled || pending}>
            Cargar cola
          </button>
        </form>
      </details>

      {queue && (
        <dl className="queue-metrics" aria-label="Métricas técnicas agregadas de la cola">
          <div>
            <dt>Episodios</dt>
            <dd>{queue.metrics.episodeCount}</dd>
          </div>
          <div>
            <dt>Pendientes</dt>
            <dd>{queue.metrics.pendingElementCount}</dd>
          </div>
          <div>
            <dt>Tareas abiertas</dt>
            <dd>{queue.metrics.openTaskCount}</dd>
          </div>
          <div>
            <dt>Tareas resueltas</dt>
            <dd>{queue.metrics.resolvedTaskCount}</dd>
          </div>
          <div>
            <dt>Antigüedad técnica máxima</dt>
            <dd>
              {queue.metrics.oldestOpenTaskAgeHours === null
                ? "—"
                : `${queue.metrics.oldestOpenTaskAgeHours} h`}
            </dd>
          </div>
        </dl>
      )}

      {queue && visibleEntries.length === 0 && (
        <p className="empty-state">Cola vacía para estos filtros.</p>
      )}
      <ol className="queue-list">
        {visibleEntries.map((entry) => {
          const draft = drafts[entry.episode.id] ?? { summary: "", alertId: "", assignedToId: "" };
          const episodeProfessionals = [
            entry.episode.responsibleNurse,
            entry.episode.responsibleClinician,
          ];
          return (
            <li key={entry.episode.id}>
              <h3>{entry.episode.patientPseudonymousId}</h3>
              <p>
                Estado: {entry.episode.status} · alta: {entry.episode.dischargeDate.slice(0, 10)} ·
                pendientes: {entry.pendingElementCount}
              </p>
              <p>
                Responsables: {entry.episode.responsibleNurse.syntheticAlias} /{" "}
                {entry.episode.responsibleClinician.syntheticAlias}
              </p>
              <h4>Último check-in terminal</h4>
              {entry.lastRelevantCheckIn ? (
                <p>
                  {new Date(entry.lastRelevantCheckIn.scheduledFor).toLocaleString("es-ES")} ·{" "}
                  {entry.lastRelevantCheckIn.outcome?.type ?? "terminal"}. Sin respuestas ni texto
                  libre en esta vista.
                </p>
              ) : (
                <p className="empty-state">Sin check-ins.</p>
              )}
              <h4>Avisos no cerrados</h4>
              {entry.openAlerts.length === 0 ? (
                <p className="empty-state">Sin avisos abiertos.</p>
              ) : (
                <ul className="queue-alerts">
                  {entry.openAlerts.map((alert) => (
                    <li key={alert.id}>
                      <strong>
                        {alert.ruleName} · v{alert.ruleVersionNumber} · {alert.state}
                      </strong>
                      <p>{alert.explanation}</p>
                      <small>
                        Origen:{" "}
                        {alert.origins
                          .map(({ source }) =>
                            source
                              ? `${source.resourceType}/${source.resourceId}#${source.field}`
                              : "referencia estructurada",
                          )
                          .join(", ")}
                      </small>
                      {alert.state === "open" && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => void markAlertReviewed(alert.id)}
                        >
                          Marcar aviso como revisado
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <form className="task-create" onSubmit={(event) => void createTask(event, entry)}>
                <h4>Crear tarea por acción humana</h4>
                <label>
                  Resumen organizativo
                  <input
                    required
                    minLength={5}
                    maxLength={160}
                    value={draft.summary}
                    onChange={(event) =>
                      updateDraft(entry.episode.id, "summary", event.target.value)
                    }
                  />
                </label>
                <label>
                  Aviso de origen opcional
                  <select
                    value={draft.alertId}
                    onChange={(event) =>
                      updateDraft(entry.episode.id, "alertId", event.target.value)
                    }
                  >
                    <option value="">Sin aviso vinculado</option>
                    {entry.openAlerts
                      .filter((alert) => alert.state !== "open" && alert.reviewedByHuman)
                      .map((alert) => (
                        <option key={alert.id} value={alert.id}>
                          {alert.ruleName} v{alert.ruleVersionNumber}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Asignación inicial opcional
                  <select
                    value={draft.assignedToId}
                    onChange={(event) =>
                      updateDraft(entry.episode.id, "assignedToId", event.target.value)
                    }
                  >
                    <option value="">Sin asignar</option>
                    {episodeProfessionals.map((professional) => (
                      <option key={professional.id} value={professional.id}>
                        {professional.syntheticAlias}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={pending || draft.summary.trim().length < 5}>
                  Crear tarea
                </button>
              </form>
              <h4>Tareas</h4>
              {entry.tasks.length === 0 ? (
                <p className="empty-state">Sin tareas creadas.</p>
              ) : (
                <ul className="task-list">
                  {entry.tasks.map((task) => (
                    <li key={task.id}>
                      <strong>
                        {task.summary} · {task.state} · rev. {task.revision}
                      </strong>
                      <p>
                        Asignada a: {task.assignedTo?.syntheticAlias ?? "sin asignar"}
                        {task.alertId ? " · vinculada a aviso" : ""}
                      </p>
                      <TaskActions
                        task={task}
                        professionals={episodeProfessionals}
                        pending={pending}
                        onChanged={changed}
                      />
                      <details>
                        <summary>Historial trazable</summary>
                        <ol>
                          {task.events.map((item) => (
                            <li key={item.id}>
                              rev. {item.resultingRevision} · {item.type} ·{" "}
                              {item.actor.syntheticAlias} ·{" "}
                              {new Date(item.occurredAt).toLocaleString("es-ES")}
                              {item.contactOutcome ? ` · ${item.contactOutcome}` : ""}
                              {item.note ? ` · ${item.note}` : ""}
                              {item.resolutionReason ? ` · ${item.resolutionReason}` : ""}
                            </li>
                          ))}
                        </ol>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

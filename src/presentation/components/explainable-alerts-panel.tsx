"use client";

import { useCallback, useEffect, useState } from "react";

type AlertItem = {
  readonly id: string;
  readonly evaluationId: string;
  readonly ruleName: string;
  readonly ruleVersionId: string;
  readonly ruleVersionNumber: number;
  readonly explanation: string;
  readonly administrativeSeverity: "standard" | "priority";
  readonly reviewOwner: "nurse" | "clinician";
  readonly triggeredAt: string;
  readonly state: "open" | "reviewed" | "actioned" | "resolved" | "dismissed-with-reason";
};

type AlertResponse = {
  readonly explainableTrafficLight: boolean;
  readonly alerts: readonly AlertItem[];
};

const STATE_LABELS: Readonly<Record<AlertItem["state"], string>> = {
  open: "Pendiente de revisión",
  reviewed: "Revisado",
  actioned: "Actuación humana registrada",
  resolved: "Resuelto por revisión humana",
  "dismissed-with-reason": "Descartado con motivo",
};

export function ExplainableAlertsPanel({ enabled }: { readonly enabled: boolean }) {
  const [alerts, setAlerts] = useState<readonly AlertItem[]>([]);
  const [trafficLightEnabled, setTrafficLightEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(
    "Inicia sesión como demo-nurse o demo-clinician para consultar avisos.",
  );

  const loadAlerts = useCallback(async () => {
    if (!enabled) return;
    setPending(true);
    try {
      const response = await fetch("/api/demo/alerts", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        setAlerts([]);
        setMessage("La sesión actual no tiene acceso a avisos.");
        return;
      }
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as AlertResponse;
      setAlerts(payload.alerts);
      setTrafficLightEnabled(payload.explainableTrafficLight);
      setMessage(
        payload.alerts.length === 0
          ? "No hay avisos para la sesión actual."
          : `${payload.alerts.length} aviso(s), ordenados por estado y texto.`,
      );
    } catch {
      setMessage("No se pudieron cargar los avisos. No se ha creado ninguna actuación.");
    } finally {
      setPending(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetch("/api/demo/alerts", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as AlertResponse;
      })
      .then((payload) => {
        if (!active) return;
        setAlerts(payload.alerts);
        setTrafficLightEnabled(payload.explainableTrafficLight);
        setMessage(
          payload.alerts.length === 0
            ? "No hay avisos para la sesión actual."
            : `${payload.alerts.length} aviso(s), ordenados por estado y texto.`,
        );
      })
      .catch(
        () =>
          active &&
          setMessage("No se pudieron cargar los avisos. No se ha creado ninguna actuación."),
      );
    return () => {
      active = false;
    };
  }, [enabled]);

  async function markReviewed(alertId: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/demo/alerts/${alertId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextState: "reviewed" }),
      });
      if (!response.ok) throw new Error();
      setMessage("Revisión humana registrada; no se ha creado ninguna acción clínica automática.");
      await loadAlerts();
    } catch {
      setMessage("No se pudo registrar la revisión humana.");
      setPending(false);
    }
  }

  return (
    <section className="panel explainable-alerts" aria-labelledby="explainable-alerts-title">
      <p className="eyebrow">Organización determinista para revisión humana</p>
      <h2 id="explainable-alerts-title">Lista de avisos</h2>
      <p>
        La prioridad se presenta mediante estado y texto. No hay diagnóstico, puntuación
        probabilística, derivación ni actuación automática.
      </p>
      <p className="policy-note" data-testid="traffic-light-status">
        Semáforo visual:{" "}
        {trafficLightEnabled ? "habilitado por configuración local" : "desactivado"}.
      </p>
      <button
        className="secondary-action"
        type="button"
        onClick={loadAlerts}
        disabled={!enabled || pending}
      >
        Actualizar lista
      </button>

      {alerts.length > 0 && (
        <ol className="alert-list">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <div>
                <strong>{STATE_LABELS[alert.state]}</strong>
                <span
                  className={
                    trafficLightEnabled
                      ? `traffic-light traffic-light-${alert.administrativeSeverity}`
                      : undefined
                  }
                >
                  {alert.administrativeSeverity === "priority"
                    ? "Revisión prioritaria"
                    : "Revisión estándar"}
                </span>
              </div>
              <h3>{alert.ruleName}</h3>
              <p>{alert.explanation}</p>
              <small>
                Regla v{alert.ruleVersionNumber} · responsable: {alert.reviewOwner} ·{" "}
                {new Date(alert.triggeredAt).toLocaleString("es-ES")}
              </small>
              <small>Evaluación trazable: {alert.evaluationId}</small>
              {alert.state === "open" && (
                <button type="button" onClick={() => markReviewed(alert.id)} disabled={pending}>
                  Revisar
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";

interface PatientPlan {
  readonly episodeId: string;
  readonly view: {
    readonly plan: {
      readonly activeVersionNumber: number | null;
      readonly versions: readonly {
        readonly versionNumber: number;
        readonly state: "ACTIVE" | "SUPERSEDED";
        readonly sections: readonly {
          readonly step: string;
          readonly content: string;
          readonly provenance: string;
        }[];
      }[];
    } | null;
  } | null;
}

export function PatientSafetyPlanPanel({ enabled }: { readonly enabled: boolean }) {
  const [plans, setPlans] = useState<readonly PatientPlan[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/safety-plans", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { readonly plans: readonly PatientPlan[] };
      setPlans(payload.plans);
      setMessage(
        payload.plans.length === 0
          ? "No hay episodios vinculados a esta identidad paciente."
          : "Plan activo e historial permitido cargados.",
      );
    } catch {
      setMessage("Esta vista requiere la sesión sintética demo-patient.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetch("/api/demo/safety-plans", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as { readonly plans: readonly PatientPlan[] };
      })
      .then((payload) => {
        if (!active) return;
        setPlans(payload.plans);
        setMessage(
          payload.plans.length === 0
            ? "No hay episodios vinculados a esta identidad paciente."
            : "Plan activo e historial permitido cargados.",
        );
      })
      .catch(() => active && setMessage("No se pudo consultar el plan propio."));
    return () => {
      active = false;
    };
  }, [enabled]);

  return (
    <section className="panel patient-plan-panel" aria-labelledby="patient-plan-title">
      <p className="eyebrow">Vista paciente</p>
      <h2 id="patient-plan-title">Mi Plan de Seguridad</h2>
      <p>
        Muestra la versión activa y el historial sustituido permitido por sección. No muestra
        borradores ni versiones invalidadas.
      </p>
      <p className="legal-warning">
        Este documento no sustituye la atención profesional ni contiene un recurso de crisis
        aprobado mientras el protocolo local siga pendiente.
      </p>
      <button type="button" onClick={load} disabled={!enabled || pending}>
        Actualizar mi plan
      </button>
      {plans.map(({ episodeId, view }) => (
        <section key={episodeId} className="patient-plan-history">
          <h3>Episodio sintético {episodeId.slice(-8)}</h3>
          {view?.plan?.versions.map((version) => (
            <details key={version.versionNumber} open={version.state === "ACTIVE"}>
              <summary>
                v{version.versionNumber} — {version.state === "ACTIVE" ? "Activa" : "Histórica"}
              </summary>
              <ol>
                {version.sections.map((section) => (
                  <li key={section.step}>
                    <strong>{section.step}</strong>
                    <p>{section.content}</p>
                    <small>Procedencia: {section.provenance}</small>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </section>
      ))}
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

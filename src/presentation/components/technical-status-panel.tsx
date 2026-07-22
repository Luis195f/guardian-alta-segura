"use client";

import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "@/presentation/components/ui-states";

export function TechnicalStatusPanel() {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);
  return (
    <section className="technical-status" aria-labelledby="technical-status-title">
      <div className="health-card">
        <p className="eyebrow">Health</p>
        <h2 id="technical-status-title">Servicio local</h2>
        {state === "loading" && <LoadingState label="Comprobando estado técnico…" />}
        {state === "ok" && (
          <p className="health-ok">
            <strong>Operativo</strong>
            <span>Respuesta sanitizada, sin información clínica.</span>
          </p>
        )}
        {state === "error" && <ErrorState>El servicio local no responde.</ErrorState>}
      </div>
      <div className="health-card">
        <p className="eyebrow">Incidentes</p>
        <h2>Sin módulo configurado</h2>
        <p>
          Esta superficie se habilitará cuando exista un módulo técnico sanitizado. Soporte no puede
          consultar notas, check-ins, Plan de Seguridad ni SBAR.
        </p>
      </div>
    </section>
  );
}

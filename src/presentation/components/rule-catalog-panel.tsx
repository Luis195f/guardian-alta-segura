"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/presentation/components/ui-states";

interface RuleDefinition {
  readonly id: string;
  readonly ruleKey: string;
  readonly name: string;
  readonly versions: readonly {
    readonly id: string;
    readonly versionNumber: number;
    readonly state: string;
    readonly approvedAt: string | null;
  }[];
}

export function RuleCatalogPanel() {
  const [rules, setRules] = useState<readonly RuleDefinition[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    fetch("/api/demo/rules", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as { readonly rules: readonly RuleDefinition[] };
      })
      .then((payload) => {
        setRules(payload.rules);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);
  return (
    <section className="panel" aria-labelledby="rules-title">
      <p className="eyebrow">Configuración versionada</p>
      <h2 id="rules-title">Reglas deterministas</h2>
      <p>Catálogo sintético trazable. No calcula riesgo ni realiza actuaciones automáticas.</p>
      {state === "loading" && <LoadingState />}
      {state === "error" && <ErrorState>No se pudo cargar el catálogo.</ErrorState>}
      {state === "ready" && rules.length === 0 && (
        <EmptyState>No hay reglas configuradas.</EmptyState>
      )}
      <ul className="configuration-list">
        {rules.map((rule) => (
          <li key={rule.id}>
            <strong>{rule.name}</strong>
            <span>{rule.ruleKey}</span>
            <small>
              {rule.versions.length} versión(es) · última:{" "}
              {rule.versions[0]?.state ?? "sin versión"}
            </small>
          </li>
        ))}
      </ul>
    </section>
  );
}

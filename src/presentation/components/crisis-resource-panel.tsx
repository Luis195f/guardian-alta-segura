import { CRISIS_RESOURCE_STATUS } from "@/domain/crisis/crisis-resource";

export function CrisisResourcePanel() {
  return (
    <section className="panel crisis-panel" aria-labelledby="crisis-resource-title">
      <p className="eyebrow">REQ-10 · estado seguro</p>
      <h2 id="crisis-resource-title">Recurso de crisis</h2>
      <p className="safety-warning">
        <strong>{CRISIS_RESOURCE_STATUS.message}</strong>
      </p>
      <p>
        No se publica ningún número ni destino hasta que exista una configuración oficial
        versionada, aprobada clínicamente y verificada por TI.
      </p>
      <button type="button" disabled aria-disabled="true">
        Recurso no disponible
      </button>
      <p className="policy-note">
        Bloqueado por {CRISIS_RESOURCE_STATUS.decisionReferences.join(" y ")}.
      </p>
    </section>
  );
}

import { DemoLoginPanel } from "@/presentation/components/demo-login-panel";
import { DischargeEpisodePanel } from "@/presentation/components/discharge-episode-panel";
import { LegalStatePanel } from "@/presentation/components/legal-state-panel";
import { PatientSafetyPlanPanel } from "@/presentation/components/patient-safety-plan-panel";
import { CheckInProtocolAdminPanel } from "@/presentation/components/check-in-protocol-admin-panel";
import { PatientCheckInPanel } from "@/presentation/components/patient-check-in-panel";
import { ExplainableAlertsPanel } from "@/presentation/components/explainable-alerts-panel";
import { NursingWorkQueuePanel } from "@/presentation/components/nursing-workqueue-panel";
import { CaregiverAccessPanel } from "@/presentation/components/caregiver-access-panel";
import { CrisisResourcePanel } from "@/presentation/components/crisis-resource-panel";

export default function HomePage() {
  const demoEnabled = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";

  return (
    <main>
      <header className="hero">
        <p className="badge">SINTÉTICO / NO USO CLÍNICO</p>
        <p className="eyebrow">Fundación técnica segura</p>
        <h1>Guardián Alta Segura</h1>
        <p className="lede">
          Base organizativa para continuidad postalta con revisión humana, autorización en servidor
          y trazabilidad. Esta rama no contiene decisiones clínicas automatizadas.
        </p>
      </header>

      <nav className="demo-flow" aria-label="Flujo demostrable con revisión humana">
        {[
          "Paciente sintético",
          "Check-in",
          "Regla determinista",
          "Aviso explicable",
          "Revisión humana",
          "Tarea humana",
          "Seguimiento",
        ].map((step, index) => (
          <span key={step}>
            {step}
            {index < 6 && <span aria-hidden="true"> → </span>}
          </span>
        ))}
      </nav>

      <div className="grid">
        <DemoLoginPanel enabled={demoEnabled} />
        <section className="panel" aria-labelledby="limits-title">
          <p className="eyebrow">Límites activos</p>
          <h2 id="limits-title">Qué garantiza esta base</h2>
          <ul>
            <li>Denegación por defecto y permisos evaluados en servidor.</li>
            <li>Sesiones revocables sin tokens en localStorage.</li>
            <li>Auditoría append-only y errores técnicos sanitizados.</li>
            <li>Datos de desarrollo inequívocamente sintéticos.</li>
          </ul>
        </section>
      </div>

      <LegalStatePanel enabled={demoEnabled} />

      <CaregiverAccessPanel enabled={demoEnabled} />

      <DischargeEpisodePanel enabled={demoEnabled} />

      <PatientSafetyPlanPanel enabled={demoEnabled} />

      <CrisisResourcePanel />

      <CheckInProtocolAdminPanel enabled={demoEnabled} />

      <PatientCheckInPanel enabled={demoEnabled} />

      <ExplainableAlertsPanel enabled={demoEnabled} />

      <NursingWorkQueuePanel enabled={demoEnabled} />

      <footer>
        No diagnostica, no prescribe, no predice riesgo y no sustituye el juicio profesional.
      </footer>
    </main>
  );
}

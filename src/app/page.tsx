import { DemoLoginPanel } from "@/presentation/components/demo-login-panel";
import { DemoCapabilityMatrix } from "@/presentation/components/demo-capability-matrix";
import { redirect } from "next/navigation";

import { homeForRole, roleLabels } from "@/presentation/navigation/role-navigation";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";

export default async function HomePage() {
  const session = await getDemoPageSession();
  if (session) redirect(homeForRole(session.role));
  const demoEnabled = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";
  const roles = ["nurse", "clinician", "patient", "caregiver", "admin", "support"] as const;

  return (
    <main className="landing">
      <header className="landing-hero">
        <p className="eyebrow">Continuidad postalta supervisada</p>
        <p className="calle-integration-badge">CALL-E · SANDBOX SINTÉTICO · LIVE OFF</p>
        <h1>Guardián Alta Segura</h1>
        <p className="lede">
          Continuidad postalta estructurada, trazable y supervisada por profesionales.
        </p>
        <p>
          Proyecto personal desarrollado de manera independiente, sin patrocinio, respaldo,
          validación, integración, despliegue ni autorización institucional.
        </p>
        <p className="environment-badge">DEMO SINTÉTICA · NO USO CLÍNICO</p>
      </header>

      <section className="calle-integration-card" aria-labelledby="calle-integration-title">
        <p className="eyebrow">Integración CALL-E · Hackathon</p>
        <h2 id="calle-integration-title">CALL-E Continuity Relay</h2>
        <p>
          Demostración local y sintética de Patient Relay y Professional Relay. El adaptador REST
          está implementado, pero el runtime live permanece deshabilitado y el proveedor externo no
          es invocado.
        </p>
        <dl className="calle-status-strip">
          <div>
            <dt>Adaptador REST</dt>
            <dd>Implementado</dd>
          </div>
          <div>
            <dt>Modo demo</dt>
            <dd>Sintético local</dd>
          </div>
          <div>
            <dt>Runtime live</dt>
            <dd>OFF · no evidenciado</dd>
          </div>
          <div>
            <dt>Contactos externos</dt>
            <dd>0</dd>
          </div>
        </dl>
        <p className="calle-integration-note">
          Integración acotada al sandbox del hackathon. Esta demo no realiza llamadas reales ni
          presenta como evidenciado el comportamiento de voz o del proveedor.
        </p>
      </section>

      <ol className="journey-flow" aria-label="Circuito de continuidad postalta">
        {[
          "Alta",
          "Plan de Seguridad",
          "Check-in",
          "Aviso explicable",
          "Revisión humana",
          "Tarea",
          "Seguimiento",
        ].map((step, index) => (
          <li key={step}>
            <span>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <DemoCapabilityMatrix />

      <section className="landing-access" aria-labelledby="access-title">
        <DemoLoginPanel enabled={demoEnabled} />
        <div className="role-guide">
          <p className="eyebrow">Seis experiencias diferenciadas</p>
          <h2 id="access-title">Cada rol ve solo lo que necesita</h2>
          <dl>
            {roles.map((role) => (
              <div key={role}>
                <dt>{roleLabels[role]}</dt>
                <dd>
                  {role === "nurse" && "Revisión, episodios y seguimiento."}
                  {role === "clinician" && "Supervisión clínica y avisos explicables."}
                  {role === "patient" && "Plan, check-ins y personas autorizadas."}
                  {role === "caregiver" && "Contenido expresamente compartido."}
                  {role === "admin" && "Configuración demo y protocolos."}
                  {role === "support" && "Estado técnico sanitizado."}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}

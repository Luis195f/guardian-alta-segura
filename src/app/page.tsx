import { DemoLoginPanel } from "@/presentation/components/demo-login-panel";
import { DischargeEpisodePanel } from "@/presentation/components/discharge-episode-panel";
import { LegalStatePanel } from "@/presentation/components/legal-state-panel";

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

      <DischargeEpisodePanel enabled={demoEnabled} />

      <footer>
        No diagnostica, no prescribe, no predice riesgo y no sustituye el juicio profesional.
      </footer>
    </main>
  );
}

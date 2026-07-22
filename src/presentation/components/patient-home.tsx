import Link from "next/link";

import { CrisisResourcePanel } from "@/presentation/components/crisis-resource-panel";

export function PatientHome() {
  return (
    <section className="patient-home" aria-labelledby="patient-home-title">
      <p className="eyebrow">Mi seguimiento</p>
      <h1 id="patient-home-title">Tu información, en un lugar claro</h1>
      <p>
        Consulta tu plan, responde los check-ins disponibles y revisa quién puede ver contenido
        compartido.
      </p>
      <div className="patient-actions">
        <article>
          <h2>Plan de Seguridad</h2>
          <p>Consulta la versión activa compartida contigo.</p>
          <Link className="button-link" href="/my-plan">
            Abrir
          </Link>
        </article>
        <article>
          <h2>Check-in</h2>
          <p>Revisa si hay una respuesta disponible o consulta el histórico.</p>
          <Link className="button-link" href="/my-check-ins">
            Ver mis check-ins
          </Link>
        </article>
        <article>
          <h2>Cuidador</h2>
          <p>Comprueba el estado y alcance de las autorizaciones.</p>
          <Link className="button-link" href="/authorized-people">
            Personas autorizadas
          </Link>
        </article>
      </div>
      <p className="patient-safety-message">
        Esta herramienta no sustituye la atención profesional ni es un canal de urgencias.
      </p>
      <CrisisResourcePanel />
    </section>
  );
}

import demoManifest from "../../../config/synthetic-demo-manifest.json";

export function DemoCapabilityMatrix({ compact = false }: { readonly compact?: boolean }) {
  const headingId = compact ? "demo-capabilities-authenticated" : "demo-capabilities-public";
  return (
    <section
      className={compact ? "demo-capability-matrix compact" : "demo-capability-matrix"}
      aria-labelledby={headingId}
    >
      <h2 id={headingId}>Límites verificables de esta demo</h2>
      <dl>
        {demoManifest.capabilities.map(({ status, capability }) => (
          <div key={status}>
            <dt>{status}</dt>
            <dd>{capability}</dd>
          </div>
        ))}
      </dl>
      <p>
        DEC-016 = Pendiente · REAL PILOT = NO_GO · proyecto personal independiente, sin respaldo
        institucional ni validación clínica, jurídica, RGPD, MDR o AI Act.
      </p>
    </section>
  );
}

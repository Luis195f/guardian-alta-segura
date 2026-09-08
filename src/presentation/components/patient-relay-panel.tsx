"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RelayTechnicalResult = {
  readonly identity_status: "intended_recipient" | "wrong_recipient" | "unknown";
  readonly contact_status: "reached" | "not_reached" | "unknown";
  readonly callback_preference: "requested" | "not_requested" | "unknown";
  readonly boundary_event: "none" | "out_of_scope_request" | "emergency_statement" | "unknown";
};

type RelayView =
  | { readonly phase: "empty"; readonly title: string; readonly message: string }
  | {
      readonly phase: "preview" | "expired" | "technical_pending" | "review_pending" | "reviewed";
      readonly title: string;
      readonly purpose: string;
      readonly maskedRecipient: string;
      readonly region: string;
      readonly locale: string;
      readonly lineRegion: string;
      readonly authorityRevision: string;
      readonly taskContract: {
        readonly key: string;
        readonly version: string;
        readonly instructions: readonly string[];
      };
      readonly resultSchema: {
        readonly additionalProperties: false;
        readonly required: readonly string[];
        readonly properties: Readonly<Record<string, { readonly enum: readonly string[] }>>;
      };
      readonly notices: {
        readonly cost: string;
        readonly noCancellation: string;
        readonly noClinicalAssessment: string;
        readonly humanReview: string;
      };
      readonly attestation: {
        readonly version: string;
        readonly current: true;
        readonly scope: string;
      };
      readonly expiresAt: string;
      readonly oneUseConfirmation: true;
      readonly confirmationAvailable: boolean;
      readonly lifecycleState: string;
      readonly governanceOutcome: string | null;
      readonly resultValidity: "VALID" | "INVALID" | "MISSING" | null;
      readonly technicalResult: RelayTechnicalResult | null;
      readonly reviewedAt: string | null;
      readonly providerContacted: false;
      readonly executionMode: "LOCAL_SYNTHETIC_NO_NETWORK";
    };

type ErrorKind = "denied" | "conflict" | "unavailable" | "error";

function errorKind(status: number): ErrorKind {
  if (status === 403) return "denied";
  if (status === 409) return "conflict";
  if (status === 404 || status >= 500) return "unavailable";
  return "error";
}

const errorMessages: Readonly<Record<ErrorKind, string>> = {
  denied: "Acceso denegado o autoridad revocada. No se ha ejecutado ningún contacto.",
  conflict:
    "Confirmación caducada, ya consumida o en conflicto. No se ha iniciado una segunda ejecución.",
  unavailable:
    "Patient Relay sintético no está disponible para este episodio o entorno. No se ha usado red.",
  error: "No se pudo completar la operación. El estado queda pendiente de revisión humana.",
};

export function PatientRelayPanel({ episodeId }: { readonly episodeId: string }) {
  const [relay, setRelay] = useState<RelayView | null>(null);
  const [pending, setPending] = useState(true);
  const [failure, setFailure] = useState<ErrorKind | null>(null);
  const [message, setMessage] = useState("");
  const announcement = useRef<HTMLParagraphElement>(null);
  const endpoint = `/api/demo/discharge-episodes/${episodeId}/patient-relay`;

  const announce = useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => announcement.current?.focus(), 0);
  }, []);

  const load = useCallback(async () => {
    setPending(true);
    setFailure(null);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        setFailure(errorKind(response.status));
        return;
      }
      setRelay((await response.json()) as RelayView);
    } catch {
      setFailure("unavailable");
    } finally {
      setPending(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          setFailure(errorKind(response.status));
          return;
        }
        setRelay((await response.json()) as RelayView);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFailure("unavailable");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [endpoint]);

  async function mutate(path: "preview" | "confirm" | "review"): Promise<Response> {
    return fetch(`${endpoint}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  }

  async function run(path: "preview" | "confirm" | "review") {
    setPending(true);
    setFailure(null);
    try {
      const response = await mutate(path);
      if (!response.ok) {
        const kind = errorKind(response.status);
        setFailure(kind);
        announce(errorMessages[kind]);
        return;
      }
      const next = (await response.json()) as RelayView;
      setRelay(next);
      announce(
        path === "preview"
          ? "Preview creado sin red. Revisa todos los límites antes de confirmar."
          : path === "confirm"
            ? "Ejecución sintética local completada una vez; resultado pendiente de revisión humana."
            : "Revisión humana registrada. No equivale a aprobación clínica ni resuelve una Task.",
      );
    } catch {
      setFailure("unavailable");
      announce(errorMessages.unavailable);
    } finally {
      setPending(false);
    }
  }

  async function runConcurrentConfirmation() {
    setPending(true);
    setFailure(null);
    try {
      const responses = await Promise.all([mutate("confirm"), mutate("confirm")]);
      const success = responses.find((response) => response.ok);
      const conflicts = responses.filter((response) => response.status === 409);
      if (!success || conflicts.length !== 1) {
        setFailure("conflict");
        announce(errorMessages.conflict);
        return;
      }
      setRelay((await success.json()) as RelayView);
      announce("Doble confirmación contenida: una ejecución sintética y un conflicto one-use.");
    } catch {
      setFailure("unavailable");
      announce(errorMessages.unavailable);
    } finally {
      setPending(false);
    }
  }

  const detailed = relay && relay.phase !== "empty" ? relay : null;
  const result = detailed?.technicalResult ?? null;

  return (
    <section className="workspace-panel patient-relay" aria-labelledby="patient-relay-title">
      <p className="eyebrow">Recorrido sintético · sin proveedor · sin red</p>
      <h2 id="patient-relay-title">Patient Relay</h2>
      <p>
        Acción profesional explícita para ensayar una oferta logística de contacto humano. No es un
        servicio clínico ni de emergencias.
      </p>

      {pending && !relay && <p role="status">Cargando Patient Relay…</p>}
      {failure && (
        <div className="relay-error" role="alert">
          <strong>Estado: {failure}</strong>
          <p>{errorMessages[failure]}</p>
          <button type="button" className="secondary-action" onClick={() => void load()}>
            Volver a comprobar
          </button>
        </div>
      )}

      {relay?.phase === "empty" && !failure && (
        <div className="relay-stage">
          <h3>1. Inicio profesional</h3>
          <p>{relay.message}</p>
          <button type="button" disabled={pending} onClick={() => void run("preview")}>
            Crear preview de Patient Relay
          </button>
        </div>
      )}

      {detailed && (
        <>
          <ol className="relay-stepper" aria-label="Fases de Patient Relay">
            <li>Preview sin red</li>
            <li>Confirmación one-use</li>
            <li>Resultado técnico</li>
            <li>Revisión humana</li>
          </ol>

          <div className="relay-stage">
            <h3>Preview sin red</h3>
            <dl className="relay-facts">
              <div>
                <dt>Finalidad</dt>
                <dd>{detailed.purpose}</dd>
              </div>
              <div>
                <dt>Destinatario</dt>
                <dd>{detailed.maskedRecipient}</dd>
              </div>
              <div>
                <dt>Región / locale</dt>
                <dd>
                  {detailed.region} / {detailed.locale}
                </dd>
              </div>
              <div>
                <dt>Line Region</dt>
                <dd>{detailed.lineRegion}</dd>
              </div>
              <div>
                <dt>Task contract</dt>
                <dd>
                  {detailed.taskContract.key} · {detailed.taskContract.version}
                </dd>
              </div>
              <div>
                <dt>Autoridad / attestation</dt>
                <dd>
                  {detailed.attestation.current ? "Vigente" : "No vigente"} ·{" "}
                  {detailed.attestation.version} · {detailed.attestation.scope} · revisión{" "}
                  {detailed.authorityRevision}
                </dd>
              </div>
              <div>
                <dt>Caducidad</dt>
                <dd>{new Date(detailed.expiresAt).toLocaleString("es-ES")}</dd>
              </div>
              <div>
                <dt>Red / proveedor</dt>
                <dd>0 contactos · {detailed.executionMode}</dd>
              </div>
            </dl>

            <h4>Contrato determinista y versionado</h4>
            <ol>
              {detailed.taskContract.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>

            <h4>Result schema exacto</h4>
            <p>
              Objeto cerrado · propiedades adicionales rechazadas · todos los campos obligatorios ·
              sin texto libre.
            </p>
            <dl className="relay-schema">
              {Object.entries(detailed.resultSchema.properties).map(([name, property]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{property.enum.join(" | ")}</dd>
                </div>
              ))}
            </dl>

            <div className="relay-warning">
              <p>{detailed.notices.noClinicalAssessment}</p>
              <p>{detailed.notices.cost}</p>
              <p>
                <strong>Sin cancelación API:</strong> {detailed.notices.noCancellation}
              </p>
              <p>Confirmación de un solo uso: {detailed.oneUseConfirmation ? "sí" : "no"}.</p>
            </div>
          </div>

          {detailed.phase === "expired" && (
            <div className="relay-stage relay-error" role="status">
              <h3>Confirmación caducada</h3>
              <p>No se ejecutó ningún contacto. Crea un preview nuevo para volver a revisar.</p>
              <button type="button" disabled={pending} onClick={() => void run("preview")}>
                Crear preview nuevo
              </button>
            </div>
          )}

          {detailed.phase === "preview" && (
            <div className="relay-stage">
              <h3>2. Confirmación one-use</h3>
              <p>
                Tras confirmar no existe cancelación mediante la API. La demo ejecutará solo un
                proveedor local determinista, sin red.
              </p>
              <div className="relay-actions">
                <button
                  type="button"
                  disabled={pending || !detailed.confirmationAvailable}
                  onClick={() => void run("confirm")}
                >
                  Confirmar una vez
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  disabled={pending || !detailed.confirmationAvailable}
                  onClick={() => void runConcurrentConfirmation()}
                >
                  Ensayar doble confirmación
                </button>
              </div>
            </div>
          )}

          {(detailed.phase === "technical_pending" ||
            detailed.phase === "review_pending" ||
            detailed.phase === "reviewed") && (
            <div className="relay-stage">
              <h3>3. Resultado técnico</h3>
              <p>
                Estado textual: <strong>{detailed.lifecycleState}</strong> · validez del schema:{" "}
                <strong>{detailed.resultValidity ?? "PENDIENTE"}</strong>
                {" · "}resultado normalizado:{" "}
                <strong>{detailed.governanceOutcome ?? "PENDIENTE"}</strong>
              </p>
              {result ? (
                <dl className="relay-result">
                  <div>
                    <dt>identity_status</dt>
                    <dd>{result.identity_status}</dd>
                  </div>
                  <div>
                    <dt>contact_status</dt>
                    <dd>{result.contact_status}</dd>
                  </div>
                  <div>
                    <dt>callback_preference</dt>
                    <dd>{result.callback_preference}</dd>
                  </div>
                  <div>
                    <dt>boundary_event</dt>
                    <dd>{result.boundary_event}</dd>
                  </div>
                </dl>
              ) : (
                <p role="status">
                  Resultado ausente o inválido: no se convierte en “no” y requiere revisión humana.
                </p>
              )}
              {result?.identity_status === "wrong_recipient" && (
                <p className="relay-contained">
                  Fixture sintético: identity_status=wrong_recipient. No hubo conversación ni se
                  verificó divulgación real.
                </p>
              )}
              {result?.boundary_event === "out_of_scope_request" && (
                <p className="relay-contained">
                  Fixture sintético: boundary_event=out_of_scope_request. No hubo conversación ni se
                  verificó la respuesta de un agente.
                </p>
              )}
              <p>{detailed.notices.humanReview}</p>
            </div>
          )}

          {detailed.phase === "review_pending" && (
            <div className="relay-stage">
              <h3>4. Revisión humana pendiente</h3>
              <button type="button" disabled={pending} onClick={() => void run("review")}>
                Registrar revisión humana
              </button>
            </div>
          )}

          {detailed.phase === "reviewed" && (
            <div className="relay-stage relay-contained" role="status">
              <h3>4. Revisión humana registrada</h3>
              <p>
                Revisado el{" "}
                {detailed.reviewedAt ? new Date(detailed.reviewedAt).toLocaleString("es-ES") : "—"}.
                No es aprobación clínica, no acepta riesgo y no resuelve ni modifica ninguna Task.
              </p>
            </div>
          )}
        </>
      )}

      <p ref={announcement} className="status" role="status" aria-live="polite" tabIndex={-1}>
        {message}
      </p>
    </section>
  );
}

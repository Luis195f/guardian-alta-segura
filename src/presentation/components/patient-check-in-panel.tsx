"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

interface QuestionView {
  readonly id: string;
  readonly questionKey: string;
  readonly type: "SCALE" | "YES_NO" | "SINGLE_CHOICE" | "RESTRICTED_SHORT_TEXT";
  readonly prompt: string;
  readonly required: boolean;
  readonly scaleMinimum?: number;
  readonly scaleMaximum?: number;
  readonly scaleMinimumLabel?: string | null;
  readonly scaleMaximumLabel?: string | null;
  readonly options?: readonly string[];
  readonly maximumTextLength?: number;
}

interface AssignmentView {
  readonly id: string;
  readonly patientPseudonymousId: string;
  readonly scheduledFor: string;
  readonly windowStartsAt: string;
  readonly windowEndsAt: string;
  readonly serverNow: string;
  readonly status: "PENDING" | "RESPONDED" | "EXPIRED" | "OMITTED";
  readonly availability: "OPEN" | "UPCOMING" | "BLOCKED" | "CLOSED";
  readonly availabilityReason:
    "DIGITAL_PARTICIPATION_NOT_ACTIVE" | "WINDOW_NOT_OPEN" | "TERMINAL_OR_WINDOW_CLOSED" | null;
  readonly isActionable: boolean;
  readonly protocol: {
    readonly versionNumber: number;
    readonly title: string;
    readonly questions: readonly QuestionView[];
  };
  readonly response: {
    readonly submittedAt: string;
    readonly answers: readonly Record<string, unknown>[];
  } | null;
}

const statusLabels = {
  PENDING: "Pendiente",
  RESPONDED: "Respondido",
  EXPIRED: "Vencido",
  OMITTED: "Omitido",
} as const;

function answerFor(question: QuestionView, raw: string) {
  if (question.type === "SCALE") {
    return { questionDefinitionId: question.id, scaleValue: Number(raw) };
  }
  if (question.type === "YES_NO") {
    return { questionDefinitionId: question.id, yesNoValue: raw === "yes" };
  }
  if (question.type === "SINGLE_CHOICE") {
    return { questionDefinitionId: question.id, selectedOption: raw };
  }
  return { questionDefinitionId: question.id, shortTextValue: raw };
}

export function PatientCheckInPanel({ enabled }: { readonly enabled: boolean }) {
  const [assignments, setAssignments] = useState<readonly AssignmentView[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement>(null);
  const retryKeys = useRef<
    Record<"response" | "omit", { readonly assignmentId: string; readonly key: string } | null>
  >({ response: null, omit: null });

  const active = assignments.find(({ isActionable }) => isActionable);
  const next = active
    ? undefined
    : assignments.find(({ availability }) => availability === "UPCOMING");
  const participationBlocked = assignments.some(({ availability }) => availability === "BLOCKED");

  useEffect(() => {
    if (!active) return;
    formRef.current
      ?.querySelector<HTMLElement>(
        "input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
      )
      ?.focus();
  }, [active]);

  useEffect(() => {
    if (formError) errorSummaryRef.current?.focus();
  }, [formError]);

  function stableRetryKey(kind: "response" | "omit", assignmentId: string): string {
    const existing = retryKeys.current[kind];
    if (existing?.assignmentId === assignmentId) return existing.key;
    const created = { assignmentId, key: `check-in-${kind}:${crypto.randomUUID()}` };
    retryKeys.current[kind] = created;
    return created.key;
  }

  async function loadAssignments() {
    setPending(true);
    setMessage("");
    setFormError("");
    try {
      const response = await fetch("/api/demo/check-ins", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { assignments: readonly AssignmentView[] };
      setAssignments(payload.assignments);
      setMessage(
        payload.assignments.length === 0
          ? "No hay check-ins asignados."
          : "Histórico de check-ins actualizado.",
      );
    } catch {
      setMessage("Inicia sesión como demo-patient para consultar check-ins propios.");
    } finally {
      setPending(false);
    }
  }

  function validateRequiredAnswers(questions: readonly QuestionView[]) {
    const errors: Record<string, string> = {};
    for (const question of questions) {
      if (question.required && !answers[question.id]?.trim()) {
        errors[question.id] = "Este campo es obligatorio.";
      }
    }
    setFieldErrors(errors);
    return errors;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) return;
    const errors = validateRequiredAnswers(active.protocol.questions);
    if (Object.keys(errors).length > 0) {
      setFormError("Revisa los campos obligatorios indicados antes de registrar.");
      return;
    }
    setPending(true);
    setMessage("");
    setFormError("");
    try {
      const response = await fetch(`/api/demo/check-ins/${active.id}/response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": stableRetryKey("response", active.id),
        },
        body: JSON.stringify({
          answers: active.protocol.questions
            .filter((question) => answers[question.id]?.trim() || question.required)
            .map((question) => answerFor(question, answers[question.id] ?? "")),
        }),
      });
      if (!response.ok) throw new Error();
      retryKeys.current.response = null;
      setAnswers({});
      setFieldErrors({});
      await loadAssignments();
      setMessage("Respuesta registrada para revisión humana, sin interpretación automática.");
    } catch {
      setFormError(
        "No se pudo registrar. Revisa las respuestas, participación y ventana configurada.",
      );
    } finally {
      setPending(false);
    }
  }

  async function omit() {
    if (!active) return;
    setPending(true);
    setMessage("");
    setFormError("");
    try {
      const response = await fetch(`/api/demo/check-ins/${active.id}/omit`, {
        method: "POST",
        headers: { "Idempotency-Key": stableRetryKey("omit", active.id) },
      });
      if (!response.ok) throw new Error();
      retryKeys.current.omit = null;
      await loadAssignments();
      setMessage("Omisión registrada como evento de no respuesta, no como respuesta clínica.");
    } catch {
      setFormError("No se pudo registrar la omisión.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel patient-check-in" aria-labelledby="patient-check-in-title">
      <p className="badge">SINTÉTICO / NO USO CLÍNICO</p>
      <p className="eyebrow">Vista paciente · objetivo aproximado 60 segundos</p>
      <h2 id="patient-check-in-title">Tu check-in</h2>
      <p>
        Este formulario registra información para revisión humana. No interpreta respuestas, no
        genera alertas y no es un canal de urgencias.
      </p>
      <button type="button" onClick={loadAssignments} disabled={!enabled || pending}>
        Cargar mis check-ins
      </button>

      {active && (
        <form
          ref={formRef}
          className="check-in-form"
          data-assignment-id={active.id}
          onSubmit={submit}
          noValidate
        >
          <p className="policy-note">
            {active.protocol.title} · versión {active.protocol.versionNumber} · disponible hasta{" "}
            {new Date(active.windowEndsAt).toLocaleString("es-ES")}
          </p>
          {formError && (
            <p
              ref={errorSummaryRef}
              id="check-in-form-error"
              className="error-summary"
              role="alert"
              tabIndex={-1}
            >
              {formError}
            </p>
          )}
          {active.protocol.questions.map((question) => {
            const helpId = `${question.id}-help`;
            const errorId = `${question.id}-error`;
            const describedBy = fieldErrors[question.id] ? `${helpId} ${errorId}` : helpId;
            return (
              <fieldset
                key={question.id}
                aria-describedby={describedBy}
                aria-invalid={Boolean(fieldErrors[question.id])}
              >
                <legend>{question.prompt}</legend>
                {question.type === "SCALE" && (
                  <div className="scale-options">
                    {Array.from(
                      {
                        length: (question.scaleMaximum ?? 0) - (question.scaleMinimum ?? 0) + 1,
                      },
                      (_, index) => (question.scaleMinimum ?? 0) + index,
                    ).map((value) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name={question.id}
                          value={value}
                          checked={answers[question.id] === String(value)}
                          onChange={(event) => {
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: event.target.value,
                            }));
                            setFieldErrors((current) => ({ ...current, [question.id]: "" }));
                          }}
                        />
                        {value}
                      </label>
                    ))}
                    <small id={helpId}>
                      {question.scaleMinimumLabel} — {question.scaleMaximumLabel}
                    </small>
                  </div>
                )}
                {question.type === "YES_NO" && (
                  <>
                    <span id={helpId} className="sr-only">
                      Selecciona sí o no.
                    </span>
                    <select
                      aria-label={`Respuesta: ${question.prompt}`}
                      aria-invalid={Boolean(fieldErrors[question.id])}
                      value={answers[question.id] ?? ""}
                      onChange={(event) => {
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }));
                        setFieldErrors((current) => ({ ...current, [question.id]: "" }));
                      }}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="yes">Sí</option>
                      <option value="no">No</option>
                    </select>
                  </>
                )}
                {question.type === "SINGLE_CHOICE" && (
                  <>
                    <span id={helpId} className="sr-only">
                      Selecciona una opción.
                    </span>
                    <select
                      aria-label={`Respuesta: ${question.prompt}`}
                      aria-invalid={Boolean(fieldErrors[question.id])}
                      value={answers[question.id] ?? ""}
                      onChange={(event) => {
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }));
                        setFieldErrors((current) => ({ ...current, [question.id]: "" }));
                      }}
                    >
                      <option value="">Selecciona una opción</option>
                      {question.options?.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </>
                )}
                {question.type === "RESTRICTED_SHORT_TEXT" && (
                  <>
                    <span id={helpId} className="sr-only">
                      Máximo {question.maximumTextLength} caracteres.
                    </span>
                    <textarea
                      aria-label={`Respuesta: ${question.prompt}`}
                      aria-invalid={Boolean(fieldErrors[question.id])}
                      maxLength={question.maximumTextLength}
                      value={answers[question.id] ?? ""}
                      onChange={(event) => {
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }));
                        setFieldErrors((current) => ({ ...current, [question.id]: "" }));
                      }}
                    />
                  </>
                )}
                {fieldErrors[question.id] && (
                  <p id={errorId} className="field-error">
                    {fieldErrors[question.id]}
                  </p>
                )}
              </fieldset>
            );
          })}
          <div className="episode-actions">
            <button type="submit" disabled={pending}>
              Registrar respuestas
            </button>
            <button type="button" className="secondary-button" onClick={omit} disabled={pending}>
              Omitir este check-in
            </button>
          </div>
        </form>
      )}

      {!active && next && (
        <section className="upcoming-check-in" aria-labelledby="upcoming-check-in-title">
          <h3 id="upcoming-check-in-title">Próximo check-in</h3>
          <p>
            Se habilitará el {new Date(next.windowStartsAt).toLocaleString("es-ES")}. La
            autorización se comprobará de nuevo en el servidor.
          </p>
          <button type="button" disabled>
            Responder cuando se abra
          </button>
        </section>
      )}

      {!active && participationBlocked && (
        <p className="policy-note">
          No hay check-ins respondibles porque la participación digital no está vigente. El
          histórico se conserva.
        </p>
      )}

      <section aria-labelledby="check-in-history-title">
        <h3 id="check-in-history-title">Histórico por episodio</h3>
        {assignments.length === 0 ? (
          <p className="empty-state">Sin check-ins cargados.</p>
        ) : (
          <ol className="timeline">
            {assignments.map((assignment) => (
              <li key={assignment.id}>
                <strong>{statusLabels[assignment.status]}</strong>
                <span>
                  {assignment.patientPseudonymousId} · protocolo v
                  {assignment.protocol.versionNumber}
                </span>
                <span>{new Date(assignment.scheduledFor).toLocaleString("es-ES")}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

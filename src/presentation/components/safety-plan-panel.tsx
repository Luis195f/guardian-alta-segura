"use client";

import { useMemo, useState } from "react";

const steps = [
  ["WARNING_SIGNS", "1. Señales de alarma"],
  ["INTERNAL_COPING", "2. Estrategias internas de afrontamiento"],
  ["DISTRACTION_CONTACTS", "3. Personas o lugares para distracción"],
  ["SUPPORT_CONTACTS", "4. Familiares o amistades"],
  ["PROFESSIONAL_RESOURCES", "5. Profesionales y recursos de crisis"],
  ["MEANS_REDUCTION", "6. Reducción de acceso a medios u objetos peligrosos"],
] as const;

type Step = (typeof steps)[number][0];
type Provenance = "PATIENT" | "NURSE" | "CLINICIAN";

interface Section {
  readonly step: Step;
  readonly content: string;
  readonly provenance: Provenance;
  readonly patientCanView: boolean;
  readonly caregiverCanView: boolean;
}

interface Version {
  readonly versionNumber: number;
  readonly basedOnVersion: number | null;
  readonly state: "DRAFT" | "ACTIVE" | "SUPERSEDED" | "INVALIDATED";
  readonly createdAt: string;
  readonly createdBy: string;
  readonly sections: readonly Section[];
  readonly stateChanges: readonly {
    readonly state: Version["state"];
    readonly reason: string | null;
    readonly occurredAt: string;
    readonly actor: string;
  }[];
}

interface SafetyPlanPayload {
  readonly access: { readonly canEdit: boolean };
  readonly plan: {
    readonly revision: number;
    readonly currentVersion: number;
    readonly activeVersionNumber: number | null;
    readonly versions: readonly Version[];
  } | null;
}

const stateLabel: Readonly<Record<Version["state"], string>> = {
  DRAFT: "Borrador",
  ACTIVE: "Activa",
  SUPERSEDED: "Sustituida",
  INVALIDATED: "Invalidada",
};

function emptySections(): Section[] {
  return steps.map(([step]) => ({
    step,
    content: "",
    provenance: "PATIENT",
    patientCanView: true,
    caregiverCanView: false,
  }));
}

export function SafetyPlanPanel({
  episodeId,
  enabled,
}: {
  readonly episodeId: string;
  readonly enabled: boolean;
}) {
  const [payload, setPayload] = useState<SafetyPlanPayload | null>(null);
  const [sections, setSections] = useState<Section[]>(emptySections);
  const [reviewing, setReviewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [invalidReason, setInvalidReason] = useState("");
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);

  const versions = useMemo(() => payload?.plan?.versions ?? [], [payload]);
  const compared = useMemo(
    () => [
      versions.find((version) => version.versionNumber === compareA),
      versions.find((version) => version.versionNumber === compareB),
    ],
    [compareA, compareB, versions],
  );

  async function loadPlan() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/demo/discharge-episodes/${episodeId}/safety-plan`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const next = (await response.json()) as SafetyPlanPayload;
      setPayload(next);
      const nextVersions = next.plan?.versions ?? [];
      setCompareA(nextVersions[0]?.versionNumber ?? null);
      setCompareB(nextVersions[1]?.versionNumber ?? null);
      setMessage(next.plan ? "Plan e historial cargados." : "Todavía no existe un plan.");
    } catch {
      setMessage("No se pudo cargar el plan para esta sesión y episodio.");
    } finally {
      setPending(false);
    }
  }

  function startEditing() {
    const source = versions[0];
    setSections(source ? source.sections.map((section) => ({ ...section })) : emptySections());
    setReviewing(false);
    setEditing(true);
    setMessage("");
  }

  function updateSection(step: Step, patch: Partial<Section>) {
    setSections((current) =>
      current.map((section) => (section.step === step ? { ...section, ...patch } : section)),
    );
  }

  async function saveVersion() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/demo/discharge-episodes/${episodeId}/safety-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedPlanRevision: payload?.plan?.revision ?? 0,
          sections,
        }),
      });
      if (response.status === 409) {
        setMessage(
          "Conflicto de edición: otra persona modificó el plan. Recarga antes de continuar.",
        );
        return;
      }
      if (!response.ok) throw new Error();
      setEditing(false);
      setReviewing(false);
      await loadPlan();
      setMessage("Nueva versión guardada como borrador; ninguna versión anterior se sobrescribió.");
    } catch {
      setMessage(
        "No se pudo guardar. Completa los seis pasos y no introduzcas números de crisis sin configuración aprobada.",
      );
    } finally {
      setPending(false);
    }
  }

  async function changeState(versionNumber: number, action: "activate" | "invalidate") {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/demo/discharge-episodes/${episodeId}/safety-plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          versionNumber,
          expectedPlanRevision: payload?.plan?.revision,
          reason: action === "invalidate" ? invalidReason : null,
        }),
      });
      if (response.status === 409) {
        setMessage("Conflicto de estado: recarga el historial antes de reintentar.");
        return;
      }
      if (!response.ok) throw new Error();
      setInvalidReason("");
      await loadPlan();
      setMessage(
        action === "activate"
          ? `Versión ${versionNumber} activada mediante revisión humana.`
          : `Versión ${versionNumber} invalidada con motivo documentado.`,
      );
    } catch {
      setMessage(
        action === "invalidate"
          ? "La invalidación exige un motivo documentado."
          : "No se pudo activar la versión.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="safety-plan" aria-labelledby="safety-plan-title">
      <p className="eyebrow">Documento clínico versionado</p>
      <h3 id="safety-plan-title">Plan de Seguridad Stanley-Brown</h3>
      <p className="legal-warning">
        Este plan organiza información revisada por personas. No puntúa riesgo, no se firma
        automáticamente y no sustituye la atención profesional ni los recursos de emergencia
        aprobados localmente.
      </p>
      <button type="button" onClick={loadPlan} disabled={!enabled || pending}>
        Cargar plan e historial
      </button>

      {payload?.access.canEdit && !editing && (
        <button type="button" className="inline-action" onClick={startEditing} disabled={pending}>
          {payload.plan ? "Crear nueva versión" : "Crear primera versión"}
        </button>
      )}

      {editing && !reviewing && (
        <div className="safety-plan-editor">
          {steps.map(([step, label]) => {
            const section = sections.find((item) => item.step === step)!;
            return (
              <fieldset key={step}>
                <legend>{label}</legend>
                <label htmlFor={`section-${step}`}>Contenido sintético</label>
                <textarea
                  id={`section-${step}`}
                  required
                  maxLength={4000}
                  value={section.content}
                  onChange={(event) => updateSection(step, { content: event.target.value })}
                />
                <label>
                  Procedencia
                  <select
                    value={section.provenance}
                    onChange={(event) =>
                      updateSection(step, { provenance: event.target.value as Provenance })
                    }
                  >
                    <option value="PATIENT">Paciente</option>
                    <option value="NURSE">Enfermería</option>
                    <option value="CLINICIAN">Clínico</option>
                  </select>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={section.patientCanView}
                    onChange={(event) =>
                      updateSection(step, { patientCanView: event.target.checked })
                    }
                  />
                  Visible para paciente
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={section.caregiverCanView}
                    onChange={(event) =>
                      updateSection(step, { caregiverCanView: event.target.checked })
                    }
                  />
                  Preparada para cuidador autorizado (portal aún no disponible)
                </label>
              </fieldset>
            );
          })}
          <button type="button" onClick={() => setReviewing(true)}>
            Revisar los seis pasos
          </button>
        </div>
      )}

      {editing && reviewing && (
        <section className="review-card" aria-labelledby="review-title">
          <h4 id="review-title">Revisión final antes de crear la versión</h4>
          <ol>
            {sections.map((section) => (
              <li key={section.step}>
                <strong>{steps.find(([step]) => step === section.step)?.[1]}</strong>
                <p>{section.content || "Sin contenido"}</p>
                <small>
                  Procedencia: {section.provenance} · Paciente:{" "}
                  {section.patientCanView ? "visible" : "oculto"} · Cuidador:{" "}
                  {section.caregiverCanView ? "preparado" : "oculto"}
                </small>
              </li>
            ))}
          </ol>
          <button type="button" className="secondary-button" onClick={() => setReviewing(false)}>
            Volver al editor
          </button>
          <button type="button" onClick={saveVersion} disabled={pending}>
            Guardar como versión nueva
          </button>
        </section>
      )}

      {versions.length > 0 && (
        <>
          <h4>Historial inmutable</h4>
          <ol className="timeline">
            {versions.map((version) => (
              <li key={version.versionNumber}>
                <strong>
                  v{version.versionNumber} — {stateLabel[version.state]}
                </strong>
                <span>
                  {version.createdBy} · {new Date(version.createdAt).toLocaleString("es-ES")}
                </span>
                {version.state === "DRAFT" && payload?.access.canEdit && (
                  <button
                    type="button"
                    onClick={() => changeState(version.versionNumber, "activate")}
                  >
                    Activar v{version.versionNumber}
                  </button>
                )}
                {version.state !== "INVALIDATED" && payload?.access.canEdit && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => changeState(version.versionNumber, "invalidate")}
                  >
                    Invalidar v{version.versionNumber}
                  </button>
                )}
              </li>
            ))}
          </ol>
          {payload?.access.canEdit && (
            <label>
              Motivo para una invalidación
              <input
                value={invalidReason}
                maxLength={500}
                onChange={(event) => setInvalidReason(event.target.value)}
              />
            </label>
          )}

          <h4>Comparar versiones</h4>
          <div className="compare-selectors">
            {[compareA, compareB].map((value, index) => (
              <select
                key={index}
                aria-label={`Versión de comparación ${index + 1}`}
                value={value ?? ""}
                onChange={(event) =>
                  (index === 0 ? setCompareA : setCompareB)(Number(event.target.value))
                }
              >
                <option value="">Selecciona versión</option>
                {versions.map((version) => (
                  <option key={version.versionNumber} value={version.versionNumber}>
                    v{version.versionNumber}
                  </option>
                ))}
              </select>
            ))}
          </div>
          {compared[0] && compared[1] && (
            <div className="version-comparison">
              {steps.map(([step, label]) => (
                <div key={step}>
                  <strong>{label}</strong>
                  <p>
                    v{compared[0]!.versionNumber}:{" "}
                    {compared[0]!.sections.find((item) => item.step === step)?.content ??
                      "No visible"}
                  </p>
                  <p>
                    v{compared[1]!.versionNumber}:{" "}
                    {compared[1]!.sections.find((item) => item.step === step)?.content ??
                      "No visible"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

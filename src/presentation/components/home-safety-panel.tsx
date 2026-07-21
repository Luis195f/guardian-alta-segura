"use client";

import { useState } from "react";

import {
  HOME_SAFETY_DISCLAIMER,
  HOME_SAFETY_ITEM_DEFINITIONS,
  HOME_SAFETY_TEMPLATE,
  type HomeSafetyItemKey,
  type HomeSafetyItemState,
  type HomeSafetyProvenance,
} from "@/domain/home-safety/home-safety";

type Version = {
  readonly id: string;
  readonly versionNumber: number;
  readonly templateVersion: string;
  readonly humanReviewed: boolean;
  readonly recordedAt: string;
  readonly actor: { readonly syntheticAlias: string };
  readonly items: readonly {
    readonly itemKey: string;
    readonly state: HomeSafetyItemState;
    readonly provenance: HomeSafetyProvenance;
  }[];
};

type ItemDrafts = Record<
  HomeSafetyItemKey,
  { readonly state: HomeSafetyItemState; readonly provenance: HomeSafetyProvenance }
>;

const stateLabels: Readonly<Record<HomeSafetyItemState, string>> = {
  NOT_REVIEWED: "No revisado",
  INFORMATION_RECORDED: "Información registrada",
  FOLLOW_UP_PENDING: "Seguimiento pendiente",
  NOT_APPLICABLE: "No aplicable en este registro",
};

const provenanceLabels: Readonly<Record<HomeSafetyProvenance, string>> = {
  PATIENT: "Paciente sintético",
  CAREGIVER: "Cuidador autorizado",
  NURSE: "Enfermería",
  CLINICIAN: "Clínico",
};

export function HomeSafetyPanel({
  episodeId,
  enabled,
}: {
  readonly episodeId: string;
  readonly enabled: boolean;
}) {
  const [versions, setVersions] = useState<readonly Version[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [humanReviewed, setHumanReviewed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<ItemDrafts>(
    () =>
      Object.fromEntries(
        HOME_SAFETY_ITEM_DEFINITIONS.map(({ key }) => [
          key,
          {
            state: "NOT_REVIEWED" as HomeSafetyItemState,
            provenance: "PATIENT" as HomeSafetyProvenance,
          },
        ]),
      ) as ItemDrafts,
  );

  async function load() {
    setPending(true);
    try {
      const response = await fetch(`/api/demo/discharge-episodes/${episodeId}/home-safety`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { versions: readonly Version[] };
      setVersions(payload.versions);
      setMessage(
        payload.versions.length
          ? "Historial informativo actualizado."
          : "Aún no hay versiones registradas.",
      );
    } catch {
      setMessage("No se pudo cargar Domicilio Seguro con esta sesión.");
    } finally {
      setPending(false);
    }
  }

  async function create() {
    setPending(true);
    try {
      const response = await fetch(`/api/demo/discharge-episodes/${episodeId}/home-safety`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedPreviousVersion: versions[0]?.versionNumber ?? 0,
          informationalPurposeAcknowledged: acknowledged,
          humanReviewed,
          items: HOME_SAFETY_ITEM_DEFINITIONS.map(({ key }) => ({ itemKey: key, ...items[key] })),
        }),
      });
      if (!response.ok) throw new Error();
      await load();
      setMessage("Nueva versión append-only registrada; no se ha emitido ninguna certificación.");
    } catch {
      setMessage("No se pudo registrar. Confirma la comprensión o recarga el historial si cambió.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="nested-panel" aria-labelledby={`home-safety-${episodeId}`}>
      <p className="eyebrow">REQ-07 · información estructurada</p>
      <h3 id={`home-safety-${episodeId}`}>Domicilio Seguro</h3>
      <p className="safety-warning">
        <strong>{HOME_SAFETY_DISCLAIMER}</strong>
      </p>
      <p>
        {HOME_SAFETY_TEMPLATE.label}. No contiene score, resultado “seguro/no seguro” ni decisión
        automática.
      </p>
      <button type="button" onClick={load} disabled={!enabled || pending}>
        Cargar historial
      </button>
      <div className="structured-checklist">
        {HOME_SAFETY_ITEM_DEFINITIONS.map(({ key, label }) => (
          <fieldset key={key}>
            <legend>{label}</legend>
            <label>
              Estado
              <select
                value={items[key].state}
                onChange={(event) =>
                  setItems((current) => ({
                    ...current,
                    [key]: {
                      state: event.target.value as HomeSafetyItemState,
                      provenance: current[key].provenance,
                    },
                  }))
                }
              >
                {Object.entries(stateLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Procedencia
              <select
                value={items[key].provenance}
                onChange={(event) =>
                  setItems((current) => ({
                    ...current,
                    [key]: {
                      state: current[key].state,
                      provenance: event.target.value as HomeSafetyProvenance,
                    },
                  }))
                }
              >
                {Object.entries(provenanceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
        ))}
      </div>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        />{" "}
        Comprendo que este módulo solo organiza información y no certifica la seguridad del
        domicilio.
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={humanReviewed}
          onChange={(event) => setHumanReviewed(event.target.checked)}
        />{" "}
        Revisión humana registrada en esta versión.
      </label>
      <button type="button" onClick={create} disabled={!enabled || pending || !acknowledged}>
        Guardar nueva versión de Domicilio Seguro
      </button>
      {versions.length > 0 && (
        <ol className="timeline">
          {versions.map((version) => (
            <li key={version.id}>
              <strong>Versión {version.versionNumber}</strong>
              <span>
                {version.actor.syntheticAlias} ·{" "}
                {new Date(version.recordedAt).toLocaleString("es-ES")} · revisión humana:{" "}
                {version.humanReviewed ? "registrada" : "pendiente"}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

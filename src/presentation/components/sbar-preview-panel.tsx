"use client";

import { useState } from "react";

type Preview = {
  readonly notice: string;
  readonly profileVersion: string;
  readonly generatedAt: string;
  readonly generatedBy: { readonly syntheticAlias: string };
  readonly signed: false;
  readonly sections: {
    readonly situation: string;
    readonly background: string;
    readonly assessment: string;
    readonly recommendation: string;
  };
  readonly references: readonly { readonly resourceType: string; readonly resourceId: string }[];
};

export function SbarPreviewPanel({
  episodeId,
  enabled,
}: {
  readonly episodeId: string;
  readonly enabled: boolean;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function generate() {
    setPending(true);
    try {
      const response = await fetch(`/api/demo/discharge-episodes/${episodeId}/sbar-preview`, {
        method: "POST",
      });
      if (!response.ok) throw new Error();
      setPreview((await response.json()) as Preview);
      setMessage("Vista determinista generada y auditada; no se ha firmado ni enviado.");
    } catch {
      setMessage("No se pudo generar la vista SBAR con esta sesión.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="nested-panel sbar-print-area" aria-labelledby={`sbar-${episodeId}`}>
      <p className="eyebrow">Preview determinista no firmado</p>
      <h3 id={`sbar-${episodeId}`}>Vista previa SBAR minimizada</h3>
      <p>
        Solo reutiliza campos estructurados ya registrados. No usa LLM, no inventa valoración o
        recomendación y no firma automáticamente.
      </p>
      <button type="button" onClick={generate} disabled={!enabled || pending}>
        Generar preview
      </button>
      {preview && (
        <article className="sbar-preview">
          <p className="badge">{preview.notice}</p>
          <p>
            Perfil {preview.profileVersion} · {preview.generatedBy.syntheticAlias} ·{" "}
            {new Date(preview.generatedAt).toLocaleString("es-ES")}
          </p>
          <h4>S — Situation</h4>
          <p>{preview.sections.situation}</p>
          <h4>B — Background</h4>
          <p>{preview.sections.background}</p>
          <h4>A — Assessment</h4>
          <p>{preview.sections.assessment}</p>
          <h4>R — Requested follow-up</h4>
          <p>{preview.sections.recommendation}</p>
          <details>
            <summary>Referencias de procedencia ({preview.references.length})</summary>
            <ul>
              {preview.references.map((reference) => (
                <li key={`${reference.resourceType}:${reference.resourceId}`}>
                  {reference.resourceType}: {reference.resourceId}
                </li>
              ))}
            </ul>
          </details>
          <p>
            <strong>Firma:</strong> no firmada.
          </p>
          <button
            type="button"
            className="secondary-button no-print"
            onClick={() => window.print()}
          >
            Imprimir vista
          </button>
        </article>
      )}
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

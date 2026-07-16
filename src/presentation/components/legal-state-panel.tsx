"use client";

import { useMemo, useState, type FormEvent } from "react";

type RecordType =
  | "PARTICIPATION"
  | "DIGITAL_PARTICIPATION"
  | "COMMUNICATION_PERMISSION"
  | "CAREGIVER_AUTHORIZATION"
  | "PROCESSING_BASIS";

interface PanelData {
  readonly notice: string;
  readonly subjectAlias: string;
  readonly policies: readonly {
    id: string;
    policyKey: string;
    version: string;
    recordType: RecordType;
    state: string;
    scope: string;
  }[];
  readonly records: readonly {
    id: string;
    recordType: RecordType;
    state: string;
    scope: string;
    policyVersion: string;
    policyState: string;
    recordedAt: string;
    expiresAt: string | null;
    origin: string;
    evidenceType: string;
    evidencePresent: boolean;
    effectiveAuthorization: {
      allowed: boolean;
      code: string;
      label: string;
    };
    detail: string | null;
    basisConfigured?: true;
    label?: string;
    revoked: boolean;
  }[];
}

const labels: Record<RecordType, string> = {
  PARTICIPATION: "Participación en piloto",
  DIGITAL_PARTICIPATION: "Participación digital / check-ins",
  COMMUNICATION_PERMISSION: "Comunicaciones telemáticas",
  CAREGIVER_AUTHORIZATION: "Autorización del cuidador",
  PROCESSING_BASIS: "Base configurada para el tratamiento",
};

export function LegalStatePanel({ enabled }: { readonly enabled: boolean }) {
  const [data, setData] = useState<PanelData | null>(null);
  const [recordType, setRecordType] = useState<RecordType>("PARTICIPATION");
  const [state, setState] = useState("PENDING");
  const [channel, setChannel] = useState("EMAIL");
  const [caregiverScope, setCaregiverScope] = useState("caregiver:safety-plan-summary");
  const [processingScope, setProcessingScope] = useState("care-treatment");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const selectedScope = useMemo(() => {
    if (recordType === "PARTICIPATION") return "pilot";
    if (recordType === "DIGITAL_PARTICIPATION") return "check-ins";
    if (recordType === "COMMUNICATION_PERMISSION") {
      return `communication:${channel.toLowerCase()}:check-in`;
    }
    if (recordType === "CAREGIVER_AUTHORIZATION") return caregiverScope;
    return processingScope;
  }, [caregiverScope, channel, processingScope, recordType]);
  const selectedPolicy = data?.policies.find(
    (policy) => policy.recordType === recordType && policy.scope === selectedScope,
  );

  async function refresh() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/legal-records?subject=demo-patient", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("denied");
      setData((await response.json()) as PanelData);
      setMessage("Estados sintéticos actualizados.");
    } catch {
      setMessage("Inicia sesión como demo-patient o demo-clinician para ver el panel.");
    } finally {
      setPending(false);
    }
  }

  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPolicy) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/legal-records", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record",
          subjectAlias: "demo-patient",
          recordType,
          state,
          policyVersionId: selectedPolicy.id,
          channel: recordType === "COMMUNICATION_PERMISSION" ? channel : undefined,
          purpose: recordType === "COMMUNICATION_PERMISSION" ? "check-in" : undefined,
          caregiverAlias: recordType === "CAREGIVER_AUTHORIZATION" ? "demo-caregiver" : undefined,
          scope:
            recordType === "CAREGIVER_AUTHORIZATION"
              ? caregiverScope
              : recordType === "PROCESSING_BASIS"
                ? processingScope
                : undefined,
          basisCode:
            recordType === "PROCESSING_BASIS" ? "PENDING_INSTITUTIONAL_DECISION" : undefined,
        }),
      });
      if (!response.ok) throw new Error("denied");
      await refresh();
      setMessage("Cambio sintético registrado sin sobrescribir el historial.");
    } catch {
      setMessage("No se pudo registrar el cambio con la sesión y política seleccionadas.");
      setPending(false);
    }
  }

  async function revoke(targetType: RecordType, targetRecordId: string) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/legal-records", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", targetType, targetRecordId }),
      });
      if (!response.ok) throw new Error("denied");
      await refresh();
      setMessage("Revocación append-only registrada; no se ha borrado ningún registro previo.");
    } catch {
      setMessage("No se pudo registrar la revocación.");
      setPending(false);
    }
  }

  return (
    <section className="panel legal-panel" aria-labelledby="legal-title">
      <p className="eyebrow">REQ-02 / REQ-05 / REQ-06</p>
      <h2 id="legal-title">Consentimientos, autorizaciones y bases separadas</h2>
      <p className="legal-warning">
        La base jurídica configurada para el tratamiento asistencial no equivale a consentimiento ni
        habilita por sí sola el piloto, los check-ins, las comunicaciones o el acceso del cuidador.
      </p>
      <button type="button" disabled={!enabled || pending} onClick={refresh}>
        {pending ? "Procesando…" : "Cargar estados de demo-patient"}
      </button>

      {data && (
        <>
          <form onSubmit={record} className="legal-form">
            <label htmlFor="legal-record-type">Concepto independiente</label>
            <select
              id="legal-record-type"
              value={recordType}
              disabled={pending}
              onChange={(event) => setRecordType(event.target.value as RecordType)}
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label htmlFor="legal-state">Estado registrado</label>
            <select
              id="legal-state"
              value={state}
              onChange={(event) => setState(event.target.value)}
            >
              <option value="PENDING">Pendiente de validación local</option>
              <option value="ACTIVE">Activo (solo demostración)</option>
              <option value="DECLINED">No otorgado / rechazado</option>
            </select>
            {recordType === "COMMUNICATION_PERMISSION" && (
              <>
                <label htmlFor="communication-channel">Canal específico</label>
                <select
                  id="communication-channel"
                  value={channel}
                  onChange={(event) => setChannel(event.target.value)}
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="PUSH">Push</option>
                </select>
              </>
            )}
            {recordType === "CAREGIVER_AUTHORIZATION" && (
              <>
                <label htmlFor="caregiver-scope">Alcance del cuidador demo-caregiver</label>
                <select
                  id="caregiver-scope"
                  value={caregiverScope}
                  onChange={(event) => setCaregiverScope(event.target.value)}
                >
                  <option value="caregiver:safety-plan-summary">Resumen del plan</option>
                  <option value="caregiver:appointments">Citas</option>
                </select>
              </>
            )}
            {recordType === "PROCESSING_BASIS" && (
              <>
                <label htmlFor="processing-scope">Alcance de la decisión institucional</label>
                <select
                  id="processing-scope"
                  value={processingScope}
                  onChange={(event) => setProcessingScope(event.target.value)}
                >
                  <option value="care-treatment">Tratamiento asistencial</option>
                  <option value="communication:email:check-in">Email para check-in</option>
                  <option value="communication:sms:check-in">SMS para check-in</option>
                  <option value="communication:push:check-in">Push para check-in</option>
                </select>
              </>
            )}
            <p className="policy-note">
              Política: {selectedPolicy?.version ?? "no configurada"} · estado institucional:{" "}
              {selectedPolicy?.state ?? "ausente"}. Una política pendiente siempre produce
              denegación.
            </p>
            <button type="submit" disabled={pending || !selectedPolicy}>
              Registrar nueva entrada
            </button>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Estado registrado y alcance</th>
                  <th>Autorización efectiva</th>
                  <th>Política / evidencia mínima</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.records.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay registros. El vacío no concede autorización.</td>
                  </tr>
                ) : (
                  data.records.map((record) => (
                    <tr key={`${record.recordType}-${record.id}`}>
                      <td>{labels[record.recordType]}</td>
                      <td>
                        {record.revoked ? "REVOCADO" : record.state} · {record.scope}
                        {record.detail ? ` · ${record.detail}` : ""}
                        {record.basisConfigured ? ` · ${record.label}` : ""}
                      </td>
                      <td>{record.effectiveAuthorization.label}</td>
                      <td>
                        {record.policyVersion} ({record.policyState}) · {record.evidenceType} ·{" "}
                        {record.evidencePresent ? "evidencia registrada" : "sin evidencia"}
                      </td>
                      <td>
                        {record.recordType === "PROCESSING_BASIS" ? (
                          <span>Gestión institucional pendiente</span>
                        ) : (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={pending || record.revoked}
                            onClick={() => revoke(record.recordType, record.id)}
                          >
                            Revocar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

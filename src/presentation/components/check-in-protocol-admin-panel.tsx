"use client";

import { useState, type FormEvent } from "react";

interface ProtocolQuestion {
  readonly id: string;
  readonly questionKey: string;
  readonly position: number;
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

interface ProtocolView {
  readonly id: string;
  readonly protocolKey: string;
  readonly versionNumber: number;
  readonly title: string;
  readonly state: "DRAFT" | "SYNTHETIC_DEMO" | "RETIRED";
  readonly isSyntheticFixture: boolean;
  readonly questions: readonly ProtocolQuestion[];
  readonly schedule: {
    readonly intervalDays: number;
    readonly firstDayOffset: number;
    readonly localTime: string;
    readonly timeZone: string;
    readonly responseWindowMinutes: number;
  };
}

export function CheckInProtocolAdminPanel({ enabled }: { readonly enabled: boolean }) {
  const [protocols, setProtocols] = useState<readonly ProtocolView[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("PLANTILLA SINTÉTICA / NO APROBADA");
  const [intervalDays, setIntervalDays] = useState("3");
  const [firstDayOffset, setFirstDayOffset] = useState("1");
  const [localTime, setLocalTime] = useState("09:30");
  const [timeZone, setTimeZone] = useState("Europe/Madrid");
  const [responseWindowMinutes, setResponseWindowMinutes] = useState("180");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const selected = protocols.find(({ id }) => id === selectedId) ?? protocols[0];

  async function loadProtocols() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/check-in-protocols", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { protocols: readonly ProtocolView[] };
      setProtocols(payload.protocols);
      if (payload.protocols[0]) {
        const protocol = payload.protocols[0];
        setSelectedId(protocol.id);
        setTitle(protocol.title);
        setIntervalDays(String(protocol.schedule.intervalDays));
        setFirstDayOffset(String(protocol.schedule.firstDayOffset));
        setLocalTime(protocol.schedule.localTime);
        setTimeZone(protocol.schedule.timeZone);
        setResponseWindowMinutes(String(protocol.schedule.responseWindowMinutes));
      }
      setMessage(
        payload.protocols.length === 0
          ? "No hay plantillas disponibles."
          : "Versiones sintéticas cargadas.",
      );
    } catch {
      setMessage("Acceso reservado a administración y profesionales demo.");
    } finally {
      setPending(false);
    }
  }

  function selectProtocol(id: string) {
    setSelectedId(id);
    const protocol = protocols.find((candidate) => candidate.id === id);
    if (!protocol) return;
    setTitle(protocol.title);
    setIntervalDays(String(protocol.schedule.intervalDays));
    setFirstDayOffset(String(protocol.schedule.firstDayOffset));
    setLocalTime(protocol.schedule.localTime);
    setTimeZone(protocol.schedule.timeZone);
    setResponseWindowMinutes(String(protocol.schedule.responseWindowMinutes));
  }

  async function createVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/check-in-protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolKey: selected.protocolKey,
          title,
          state: "SYNTHETIC_DEMO",
          basedOnVersionId: selected.id,
          isSyntheticFixture: true,
          questions: selected.questions.map((question) =>
            Object.fromEntries(Object.entries(question).filter(([key]) => key !== "id")),
          ),
          schedule: {
            intervalDays: Number(intervalDays),
            firstDayOffset: Number(firstDayOffset),
            localTime,
            timeZone,
            responseWindowMinutes: Number(responseWindowMinutes),
          },
        }),
      });
      if (response.status === 409) {
        setMessage("Ya existe una versión posterior. Recarga antes de reintentar.");
        return;
      }
      if (!response.ok) throw new Error();
      setMessage("Nueva versión sintética creada; las asignaciones históricas no se modificaron.");
      await loadProtocols();
    } catch {
      setMessage("No se pudo versionar. Inicia sesión como demo-admin y revisa los parámetros.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel check-in-admin" aria-labelledby="check-in-admin-title">
      <p className="badge">PLANTILLA SINTÉTICA / NO APROBADA</p>
      <p className="eyebrow">Administración clínica demo</p>
      <h2 id="check-in-admin-title">Protocolos de check-in versionados</h2>
      <p>
        Configura cadencia, hora, zona y ventana. Crear una versión no cambia episodios ni
        asignaciones previas y no constituye aprobación clínica.
      </p>
      <button type="button" onClick={loadProtocols} disabled={!enabled || pending}>
        Cargar versiones
      </button>

      {selected && (
        <form onSubmit={createVersion}>
          <label htmlFor="protocol-version">Versión base</label>
          <select
            id="protocol-version"
            value={selected.id}
            onChange={(event) => selectProtocol(event.target.value)}
            disabled={pending}
          >
            {protocols.map((protocol) => (
              <option key={protocol.id} value={protocol.id}>
                {protocol.protocolKey} · v{protocol.versionNumber}
              </option>
            ))}
          </select>
          <label htmlFor="protocol-title">Título visible</label>
          <input
            id="protocol-title"
            required
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="schedule-grid">
            <label>
              Intervalo en días
              <input
                type="number"
                min="1"
                max="90"
                required
                value={intervalDays}
                onChange={(event) => setIntervalDays(event.target.value)}
              />
            </label>
            <label>
              Primer día del episodio
              <input
                type="number"
                min="0"
                max="90"
                required
                value={firstDayOffset}
                onChange={(event) => setFirstDayOffset(event.target.value)}
              />
            </label>
            <label>
              Hora local
              <input
                type="time"
                required
                value={localTime}
                onChange={(event) => setLocalTime(event.target.value)}
              />
            </label>
            <label>
              Zona IANA
              <input
                required
                value={timeZone}
                aria-describedby="time-zone-help"
                onChange={(event) => setTimeZone(event.target.value)}
              />
            </label>
            <label>
              Ventana en minutos
              <input
                type="number"
                min="15"
                max="10080"
                required
                value={responseWindowMinutes}
                onChange={(event) => setResponseWindowMinutes(event.target.value)}
              />
            </label>
          </div>
          <p id="time-zone-help" className="policy-note">
            Ejemplo técnico: Europe/Madrid. La ventana organiza disponibilidad; no expresa urgencia.
          </p>
          <h3>Preguntas de la versión base</h3>
          <ol className="question-preview">
            {selected.questions.map((question) => (
              <li key={question.id}>
                <span>{question.prompt}</span>
                <small>{question.type.replaceAll("_", " ")}</small>
              </li>
            ))}
          </ol>
          <button type="submit" disabled={pending}>
            Crear nueva versión
          </button>
        </form>
      )}
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

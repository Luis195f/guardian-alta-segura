"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";

function subscribeToHydration(): () => void {
  return () => {};
}

function getClientHydrationSnapshot(): boolean {
  return true;
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

export function EpisodeCreateForm() {
  const router = useRouter();

  const [dischargeDate, setDischargeDate] = useState("");
  const [programLengthDays, setProgramLengthDays] = useState("30");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const ready = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ready || pending) {
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/demo/discharge-episodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `episode-create:${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          externalPseudonymousId: "SYNTH-PATIENT-001",
          dischargeDate,
          programLengthDays: Number(programLengthDays),
          responsibleNurseAlias: "demo-nurse",
          responsibleClinicianAlias: "demo-clinician",
        }),
      });

      if (!response.ok) {
        throw new Error("Synthetic discharge episode creation failed");
      }

      const payload = (await response.json()) as {
        readonly episodeId: string;
      };

      router.push(`/episodes/${payload.episodeId}`);
    } catch {
      setMessage("No se pudo crear el episodio sintético. Revisa la fecha y vuelve a intentarlo.");
      setPending(false);
    }
  }

  return (
    <section className="content-section" aria-labelledby="new-episode-title">
      <p className="eyebrow">Alta estructurada</p>

      <h2 id="new-episode-title">Datos organizativos del episodio</h2>

      <p>
        La demo usa el paciente seudonimizado y los responsables sintéticos preparados por el seed.
      </p>

      <form className="episode-create-form" onSubmit={create}>
        <label>
          Paciente seudonimizado
          <input value="SYNTH-PATIENT-001" disabled />
        </label>

        <label>
          Fecha de alta
          <input
            type="date"
            required
            disabled={!ready || pending}
            value={dischargeDate}
            onChange={(event) => setDischargeDate(event.target.value)}
          />
        </label>

        <label>
          Duración del programa
          <select
            disabled={!ready || pending}
            value={programLengthDays}
            onChange={(event) => setProgramLengthDays(event.target.value)}
          >
            <option value="30">30 días</option>
            <option value="60">60 días</option>
            <option value="90">90 días</option>
          </select>
        </label>

        <button type="submit" disabled={!ready || pending}>
          {!ready ? "Preparando…" : pending ? "Creando…" : "Crear borrador"}
        </button>
      </form>

      {message && (
        <p className="status" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}

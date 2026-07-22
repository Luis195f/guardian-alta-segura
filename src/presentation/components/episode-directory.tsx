"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { EpisodeDetail } from "@/presentation/components/professional-types";
import { episodeStatusLabels } from "@/presentation/components/professional-types";
import { EmptyState, ErrorState, LoadingState } from "@/presentation/components/ui-states";

export function EpisodeDirectory() {
  const [episodes, setEpisodes] = useState<readonly EpisodeDetail[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    fetch("/api/demo/discharge-episodes", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as { readonly episodes: readonly EpisodeDetail[] };
      })
      .then((payload) => {
        if (!active) return;
        setEpisodes(payload.episodes);
        setState("ready");
      })
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") return <LoadingState label="Cargando episodios asignados…" />;
  if (state === "error") return <ErrorState>No se pudo cargar el listado asignado.</ErrorState>;
  if (!episodes.length) return <EmptyState>No hay episodios asignados.</EmptyState>;

  return (
    <div className="episode-cards">
      {episodes.map((episode) => (
        <article key={episode.id}>
          <div>
            <span className="status-chip">{episodeStatusLabels[episode.status]}</span>
            <h2>{episode.patient.externalPseudonymousId}</h2>
            <p>Alta: {new Date(episode.dischargeDate).toLocaleDateString("es-ES")}</p>
          </div>
          <dl>
            <div>
              <dt>Programa</dt>
              <dd>{episode.programLengthDays} días</dd>
            </div>
            <div>
              <dt>Enfermería</dt>
              <dd>{episode.responsibleNurse.syntheticAlias}</dd>
            </div>
            <div>
              <dt>Clínico</dt>
              <dd>{episode.responsibleClinician.syntheticAlias}</dd>
            </div>
          </dl>
          <Link className="button-link" href={`/episodes/${episode.id}`}>
            Abrir episodio
          </Link>
        </article>
      ))}
    </div>
  );
}

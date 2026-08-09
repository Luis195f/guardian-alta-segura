"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EpisodeAlerts } from "@/presentation/components/episode-alerts";
import type {
  EpisodeDetail,
  EpisodeGovernanceView,
  ProfessionalQueueEntry,
  ProfessionalQueueResponse,
} from "@/presentation/components/professional-types";
import { episodeStatusLabels } from "@/presentation/components/professional-types";
import { ProfessionalCheckIns } from "@/presentation/components/professional-check-ins";
import { SafetyPlanPanel } from "@/presentation/components/safety-plan-panel";
import { HomeSafetyPanel } from "@/presentation/components/home-safety-panel";
import { SbarPreviewPanel } from "@/presentation/components/sbar-preview-panel";
import { NursingWorkQueuePanel } from "@/presentation/components/nursing-workqueue-panel";
import { ErrorState, LoadingState } from "@/presentation/components/ui-states";
import { GovernanceEvidencePanel } from "@/presentation/components/governance-evidence-panel";
import {
  EPISODE_WORKSPACE_TABS,
  type EpisodeWorkspaceTab,
} from "@/presentation/navigation/episode-tabs";

interface SummaryData {
  readonly queueEntry: ProfessionalQueueEntry | null;
  readonly activePlanVersion: number | null;
  readonly homeSafetyVersions: number;
}

export function EpisodeWorkspace({
  episodeId,
  initialTab = "summary",
}: {
  readonly episodeId: string;
  readonly initialTab?: EpisodeWorkspaceTab;
}) {
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null);
  const [governance, setGovernance] = useState<EpisodeGovernanceView | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [tab, setTab] = useState<EpisodeWorkspaceTab>(initialTab);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [transitionPending, setTransitionPending] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [episodeResponse, queueResponse, planResponse, homeResponse] = await Promise.all([
          fetch(`/api/demo/discharge-episodes/${episodeId}`, { cache: "no-store" }),
          fetch("/api/demo/nursing-workqueue", { cache: "no-store" }),
          fetch(`/api/demo/discharge-episodes/${episodeId}/safety-plan`, { cache: "no-store" }),
          fetch(`/api/demo/discharge-episodes/${episodeId}/home-safety`, { cache: "no-store" }),
        ]);
        if (!episodeResponse.ok || !queueResponse.ok) throw new Error();
        const episodePayload = (await episodeResponse.json()) as {
          readonly episode: EpisodeDetail;
          readonly governance: EpisodeGovernanceView;
        };
        const queuePayload = (await queueResponse.json()) as ProfessionalQueueResponse;
        const planPayload = planResponse.ok
          ? ((await planResponse.json()) as {
              readonly plan: { readonly activeVersionNumber: number | null } | null;
            })
          : null;
        const homePayload = homeResponse.ok
          ? ((await homeResponse.json()) as { readonly versions: readonly unknown[] })
          : null;
        if (!active) return;
        setEpisode(episodePayload.episode);
        setGovernance(episodePayload.governance);
        setSummary({
          queueEntry: queuePayload.entries.find((entry) => entry.episode.id === episodeId) ?? null,
          activePlanVersion: planPayload?.plan?.activeVersionNumber ?? null,
          homeSafetyVersions: homePayload?.versions.length ?? 0,
        });
        setState("ready");
      } catch {
        if (active) setState("error");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [episodeId]);

  if (state === "loading") return <LoadingState label="Abriendo el episodio…" />;
  if (state === "error" || !episode || !governance || !summary) {
    return <ErrorState>El episodio no está disponible para esta identidad profesional.</ErrorState>;
  }

  async function transition(targetStatus: "ACTIVE" | "PAUSED") {
    const currentEpisode = episode;
    if (!currentEpisode) return;
    setTransitionPending(true);
    setTransitionMessage("");
    try {
      const response = await fetch(`/api/demo/discharge-episodes/${currentEpisode.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `episode-transition:${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          targetStatus,
          expectedVersion: currentEpisode.version,
          reason: null,
        }),
      });
      if (!response.ok) throw new Error();
      const detailResponse = await fetch(`/api/demo/discharge-episodes/${currentEpisode.id}`, {
        cache: "no-store",
      });
      if (!detailResponse.ok) throw new Error();
      const payload = (await detailResponse.json()) as {
        readonly episode: EpisodeDetail;
        readonly governance: EpisodeGovernanceView;
      };
      setEpisode(payload.episode);
      setGovernance(payload.governance);
      setTransitionMessage(
        `Transición a ${episodeStatusLabels[targetStatus].toLowerCase()} registrada y auditada.`,
      );
    } catch {
      setTransitionMessage(
        "No se pudo registrar la transición. Recarga el episodio antes de reintentar.",
      );
    } finally {
      setTransitionPending(false);
    }
  }

  const openTasks = summary.queueEntry?.tasks.filter(({ state }) => state === "open").length ?? 0;
  const pendingAlerts =
    summary.queueEntry?.openAlerts.filter(({ state }) => state === "open").length ?? 0;

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan">
        <Link href="/dashboard">Inicio</Link>
        <span aria-hidden="true">/</span>
        <Link href="/episodes">Episodios</Link>
        <span aria-hidden="true">/</span>
        <span>{episode.patient.externalPseudonymousId}</span>
      </nav>
      <header className="episode-header">
        <div>
          <span className="status-chip">
            Episodio {episodeStatusLabels[episode.status].toLowerCase()}
          </span>
          <h1>{episode.patient.externalPseudonymousId}</h1>
          <p>
            Alta: {new Date(episode.dischargeDate).toLocaleDateString("es-ES")} · Programa:{" "}
            {episode.programLengthDays} días
          </p>
        </div>
        <dl>
          <div>
            <dt>Enfermería responsable</dt>
            <dd>{episode.responsibleNurse.syntheticAlias}</dd>
          </div>
          <div>
            <dt>Profesional clínico responsable</dt>
            <dd>{episode.responsibleClinician.syntheticAlias}</dd>
          </div>
        </dl>
        <div className="episode-header-actions">
          {episode.status === "DRAFT" && (
            <button
              type="button"
              disabled={transitionPending}
              onClick={() => void transition("ACTIVE")}
            >
              Activar
            </button>
          )}
          {episode.status === "ACTIVE" && (
            <button
              className="secondary-action"
              type="button"
              disabled={transitionPending}
              onClick={() => void transition("PAUSED")}
            >
              Pausar seguimiento
            </button>
          )}
          {episode.status === "PAUSED" && (
            <button
              type="button"
              disabled={transitionPending}
              onClick={() => void transition("ACTIVE")}
            >
              Reactivar
            </button>
          )}
        </div>
      </header>
      {transitionMessage && (
        <p className="status" role="status">
          {transitionMessage}
        </p>
      )}
      <div className="workspace-tabs" role="tablist" aria-label="Secciones del episodio">
        {EPISODE_WORKSPACE_TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <section className="workspace-panel" aria-labelledby="episode-summary-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Estado organizativo</p>
              <h2 id="episode-summary-title">Resumen del episodio</h2>
            </div>
          </div>
          <div className="summary-grid">
            <article>
              <span>Gobernanza del episodio</span>
              <strong>
                Cierre{" "}
                {governance.transitionDecision.authorization === "AUTHORIZED"
                  ? "autorizado"
                  : "no autorizado"}
              </strong>
              <span>
                {governance.blockers.length} bloqueo(s) organizativo(s) ·{" "}
                {governance.openObligations.length} obligación(es) abierta(s)
              </span>
              <ul>
                {governance.blockers.map((blocker) => (
                  <li key={blocker.code}>
                    {blocker.code === "DEC_002_EPISODE_CLOSURE_POLICY_PENDING"
                      ? "DEC-002 pendiente: política institucional de cierre no aprobada"
                      : blocker.code}
                  </li>
                ))}
              </ul>
            </article>
            <article>
              <span>Plan de Seguridad</span>
              <strong>
                {summary.activePlanVersion
                  ? `Activo · versión ${summary.activePlanVersion}`
                  : "Pendiente"}
              </strong>
              <button type="button" onClick={() => setTab("safety-plan")}>
                Ver plan
              </button>
            </article>
            <article>
              <span>Último check-in</span>
              <strong>
                {summary.queueEntry?.lastRelevantCheckIn?.outcome?.type ?? "Sin resultado"}
              </strong>
              <button type="button" onClick={() => setTab("check-ins")}>
                Ver check-ins
              </button>
            </article>
            <article>
              <span>Avisos</span>
              <strong>{pendingAlerts} pendiente(s) de revisión</strong>
              <button type="button" onClick={() => setTab("alerts")}>
                Revisar aviso
              </button>
            </article>
            <article>
              <span>Seguimiento</span>
              <strong>{openTasks} tarea(s) abierta(s)</strong>
              <button type="button" onClick={() => setTab("follow-up")}>
                Abrir cola
              </button>
            </article>
            <article>
              <span>Domicilio Seguro</span>
              <strong>
                {summary.homeSafetyVersions ? "Información registrada" : "Pendiente de revisión"}
              </strong>
              <button type="button" onClick={() => setTab("home-safety")}>
                Revisar información
              </button>
            </article>
            <article>
              <span>SBAR</span>
              <strong>Preview disponible</strong>
              <button type="button" onClick={() => setTab("sbar")}>
                Abrir preview
              </button>
            </article>
            <article>
              <span>Historial</span>
              <strong>{episode.transitions.length} evento(s)</strong>
              <button type="button" onClick={() => setTab("history")}>
                Ver historial
              </button>
            </article>
          </div>
        </section>
      )}
      {tab === "safety-plan" && <SafetyPlanPanel episodeId={episode.id} enabled />}
      {tab === "check-ins" && (
        <ProfessionalCheckIns
          episodeId={episode.id}
          protocolVersionId={episode.checkInProtocolVersionId}
        />
      )}
      {tab === "alerts" && (
        <EpisodeAlerts episodeId={episode.id} onOpenFollowUp={() => setTab("follow-up")} />
      )}
      {tab === "follow-up" && <NursingWorkQueuePanel enabled episodeId={episode.id} />}
      {tab === "home-safety" && <HomeSafetyPanel episodeId={episode.id} enabled />}
      {tab === "sbar" && <SbarPreviewPanel episodeId={episode.id} enabled />}
      {tab === "evidence" && <GovernanceEvidencePanel episodeId={episode.id} />}
      {tab === "history" && (
        <section className="workspace-panel">
          <p className="eyebrow">Trazabilidad</p>
          <h2>Historial del episodio</h2>
          <ol className="timeline">
            {episode.transitions.map((item) => (
              <li key={item.id}>
                <strong>{episodeStatusLabels[item.toStatus]}</strong>
                <span>
                  versión {item.resultingVersion} · {item.actor.syntheticAlias}
                </span>
                <time>{new Date(item.occurredAt).toLocaleString("es-ES")}</time>
                {item.reason && <span>{item.reason}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

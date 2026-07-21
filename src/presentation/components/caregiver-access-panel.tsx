"use client";

import { type FormEvent, useMemo, useState } from "react";

const capabilities = [
  ["VIEW_PLAN_SECTIONS", "Ver secciones permitidas del plan"],
  ["VIEW_ASSIGNED_TASKS", "Ver tareas asignadas"],
  ["SEND_OBSERVATIONS", "Enviar observaciones"],
  ["VIEW_AUTHORIZED_RESOURCES", "Ver recursos autorizados"],
] as const;

const planSections = [
  ["WARNING_SIGNS", "Señales de aviso"],
  ["INTERNAL_COPING", "Estrategias internas"],
  ["DISTRACTION_CONTACTS", "Contactos de distracción"],
  ["SUPPORT_CONTACTS", "Personas de apoyo"],
  ["PROFESSIONAL_RESOURCES", "Recursos profesionales"],
  ["MEANS_REDUCTION", "Reducción de acceso a medios"],
] as const;

interface ManagementData {
  readonly notice: string;
  readonly episodes: readonly {
    readonly id: string;
    readonly status: string;
    readonly dischargeDate: string;
  }[];
  readonly authorizations: readonly {
    readonly id: string;
    readonly pseudonym: string;
    readonly state: string;
    readonly legalScope: string;
    readonly effective: boolean;
    readonly revoked: boolean;
    readonly scopes: readonly {
      readonly dischargeEpisodeId: string;
      readonly version: number;
      readonly capabilities: readonly string[];
      readonly allowedPlanSections: readonly string[];
      readonly authorizedResourceKeys: readonly string[];
    }[];
    readonly invitations: readonly {
      readonly id: string;
      readonly dischargeEpisodeId: string;
      readonly expiresAt: string;
      readonly consumedAt: string | null;
    }[];
  }[];
}

interface PortalData {
  readonly notice: string;
  readonly pseudonym: string;
  readonly scopeVersion: number;
  readonly capabilities: readonly string[];
  readonly planSections: readonly { readonly step: string; readonly content: string }[];
  readonly tasks: readonly {
    readonly id: string;
    readonly summary: string;
    readonly currentState: string;
  }[];
  readonly resources: readonly {
    readonly key: string;
    readonly title: string;
    readonly description: string;
  }[];
  readonly canSubmitObservation: boolean;
}

export function CaregiverAccessPanel({ enabled }: { readonly enabled: boolean }) {
  const [management, setManagement] = useState<ManagementData | null>(null);
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [authorizationId, setAuthorizationId] = useState("");
  const [episodeId, setEpisodeId] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([
    "VIEW_PLAN_SECTIONS",
    "SEND_OBSERVATIONS",
  ]);
  const [selectedSections, setSelectedSections] = useState<string[]>([
    "WARNING_SIGNS",
    "SUPPORT_CONTACTS",
    "PROFESSIONAL_RESOURCES",
  ]);
  const [includeResources, setIncludeResources] = useState(false);
  const [invitationToken, setInvitationToken] = useState("");
  const [acceptanceToken, setAcceptanceToken] = useState("");
  const [observation, setObservation] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const selectedAuthorization = useMemo(
    () => management?.authorizations.find(({ id }) => id === authorizationId),
    [authorizationId, management],
  );
  const selectedScope = useMemo(
    () =>
      selectedAuthorization?.scopes.find((scope) => scope.dischargeEpisodeId === episodeId) ?? null,
    [episodeId, selectedAuthorization],
  );

  async function loadManagement() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/caregiver-access", { cache: "no-store" });
      if (!response.ok) throw new Error("denied");
      const data = (await response.json()) as ManagementData;
      setManagement(data);
      setAuthorizationId((current) => current || data.authorizations[0]?.id || "");
      setEpisodeId((current) => current || data.episodes[0]?.id || "");
      setMessage("Autorizaciones del paciente cargadas.");
    } catch {
      setMessage("Inicia sesión como demo-patient para gestionar el acceso.");
    } finally {
      setPending(false);
    }
  }

  function toggleCapability(capability: string) {
    setSelectedCapabilities((current) =>
      current.includes(capability)
        ? current.filter((item) => item !== capability)
        : [...current, capability],
    );
  }

  function toggleSection(section: string) {
    setSelectedSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
  }

  function scopePayload() {
    const nextCapabilities = includeResources
      ? [...new Set([...selectedCapabilities, "VIEW_AUTHORIZED_RESOURCES"])]
      : selectedCapabilities.filter((item) => item !== "VIEW_AUTHORIZED_RESOURCES");
    return {
      capabilities: nextCapabilities,
      allowedPlanSections: nextCapabilities.includes("VIEW_PLAN_SECTIONS") ? selectedSections : [],
      authorizedResourceKeys: includeResources
        ? ["demo-caregiver-boundaries", "demo-observation-guide"]
        : [],
    };
  }

  async function manage(action: "invite" | "change-scope" | "revoke") {
    if (!authorizationId) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/caregiver-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          caregiverAuthorizationId: authorizationId,
          episodeId,
          expectedVersion: selectedScope?.version,
          scope: scopePayload(),
        }),
      });
      if (!response.ok) throw new Error("denied");
      const result = (await response.json()) as { readonly localAcceptanceToken?: string };
      if (result.localAcceptanceToken) {
        setInvitationToken(result.localAcceptanceToken);
        setAcceptanceToken(result.localAcceptanceToken);
      }
      await loadManagement();
      setMessage(
        action === "revoke"
          ? "Acceso revocado; todas las sesiones activas han quedado invalidadas sin borrar historia."
          : action === "change-scope"
            ? "Nueva versión de alcance registrada."
            : "Invitación local creada. No se ha enviado ninguna comunicación real.",
      );
    } catch {
      setMessage(
        "Operación denegada. Comprueba que exista autorización caregiver:portal activa y una política local aprobada.",
      );
      setPending(false);
    }
  }

  async function acceptInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/caregiver/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: acceptanceToken }),
      });
      if (!response.ok) throw new Error("denied");
      setMessage(
        "Invitación aceptada. La sesión de cuidador está limitada por el alcance vigente.",
      );
      await loadPortal();
    } catch {
      setMessage(
        "Invitación inválida, vencida, ya utilizada o no vinculada al cuidador autenticado.",
      );
    } finally {
      setPending(false);
    }
  }

  async function loadPortal() {
    setPending(true);
    try {
      const response = await fetch("/api/demo/caregiver/portal", { cache: "no-store" });
      if (!response.ok) throw new Error("denied");
      setPortal((await response.json()) as PortalData);
      setMessage("Portal limitado actualizado.");
    } catch {
      setPortal(null);
      setMessage("No hay una sesión de cuidador vigente o la autorización fue revocada.");
    } finally {
      setPending(false);
    }
  }

  async function submitObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/demo/caregiver/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: observation }),
      });
      if (!response.ok) throw new Error("denied");
      setObservation("");
      setMessage("Observación guardada para revisión humana; no se ha creado una alerta.");
    } catch {
      setMessage("No se pudo registrar la observación con el alcance vigente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel caregiver-access" aria-labelledby="caregiver-access-title">
      <p className="eyebrow">REQ-05 / REQ-06</p>
      <h2 id="caregiver-access-title">Cuidador: autorización limitada y revocable</h2>
      <p className="legal-warning">
        El acceso nunca incluye por defecto diagnósticos, notas clínicas ni check-ins completos. La
        autorización no presume capacidad ni representación legal y puede revocarse de inmediato.
      </p>

      <h3>Gestión por el paciente</h3>
      <button type="button" disabled={!enabled || pending} onClick={loadManagement}>
        Cargar autorizaciones y episodios
      </button>
      {management && (
        <div className="caregiver-management">
          <label htmlFor="caregiver-authorization">Autorización explícita</label>
          <select
            id="caregiver-authorization"
            value={authorizationId}
            onChange={(event) => setAuthorizationId(event.target.value)}
          >
            <option value="">Selecciona una autorización</option>
            {management.authorizations.map((authorization) => (
              <option key={authorization.id} value={authorization.id}>
                {authorization.pseudonym} · {authorization.legalScope} ·{" "}
                {authorization.effective ? "vigente" : "denegada"}
              </option>
            ))}
          </select>
          <label htmlFor="caregiver-episode">Episodio</label>
          <select
            id="caregiver-episode"
            value={episodeId}
            onChange={(event) => setEpisodeId(event.target.value)}
          >
            {management.episodes.map((episode) => (
              <option key={episode.id} value={episode.id}>
                {episode.dischargeDate} · {episode.status}
              </option>
            ))}
          </select>
          <fieldset>
            <legend>Capacidades expresamente concedidas</legend>
            {capabilities
              .filter(([value]) => value !== "VIEW_AUTHORIZED_RESOURCES")
              .map(([value, label]) => (
                <label className="check-label" key={value}>
                  <input
                    type="checkbox"
                    checked={selectedCapabilities.includes(value)}
                    onChange={() => toggleCapability(value)}
                  />
                  {label}
                </label>
              ))}
            <label className="check-label">
              <input
                type="checkbox"
                checked={includeResources}
                onChange={(event) => setIncludeResources(event.target.checked)}
              />
              Ver recursos locales autorizados
            </label>
          </fieldset>
          {selectedCapabilities.includes("VIEW_PLAN_SECTIONS") && (
            <fieldset>
              <legend>Secciones concretas del plan</legend>
              {planSections.map(([value, label]) => (
                <label className="check-label" key={value}>
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(value)}
                    onChange={() => toggleSection(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          )}
          <div className="episode-actions">
            <button
              type="button"
              disabled={pending || !authorizationId || !episodeId}
              onClick={() => manage("invite")}
            >
              Crear invitación local
            </button>
            <button
              type="button"
              disabled={pending || !selectedScope}
              onClick={() => manage("change-scope")}
            >
              Guardar nueva versión de alcance
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={pending || !authorizationId || selectedAuthorization?.revoked}
              onClick={() => manage("revoke")}
            >
              Revocar acceso y sesiones
            </button>
          </div>
          {invitationToken && (
            <div className="local-invitation" role="status">
              <strong>Token local de un solo uso</strong>
              <code>{invitationToken}</code>
              <small>No se ha enviado email, SMS ni push.</small>
            </div>
          )}
        </div>
      )}

      <h3>Acceso del cuidador</h3>
      <form onSubmit={acceptInvitation}>
        <label htmlFor="caregiver-invitation-token">Token de invitación local</label>
        <input
          id="caregiver-invitation-token"
          value={acceptanceToken}
          autoComplete="off"
          onChange={(event) => setAcceptanceToken(event.target.value)}
        />
        <button type="submit" disabled={!enabled || pending || acceptanceToken.length < 40}>
          Aceptar como cuidador autenticado
        </button>
      </form>
      <button type="button" disabled={!enabled || pending} onClick={loadPortal}>
        Abrir portal limitado
      </button>

      {portal && (
        <div className="caregiver-portal">
          <p>{portal.notice}</p>
          <p>
            Perfil {portal.pseudonym} · alcance v{portal.scopeVersion}
          </p>
          <h4>Secciones autorizadas del plan</h4>
          {portal.planSections.length ? (
            <ul>
              {portal.planSections.map((section) => (
                <li key={section.step}>{section.content}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No hay secciones autorizadas y activas.</p>
          )}
          <h4>Tareas asignadas</h4>
          {portal.tasks.length ? (
            <ul>
              {portal.tasks.map((task) => (
                <li key={task.id}>
                  {task.summary} · {task.currentState}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No hay tareas visibles en el alcance actual.</p>
          )}
          <h4>Recursos autorizados</h4>
          {portal.resources.length ? (
            <ul>
              {portal.resources.map((resource) => (
                <li key={resource.key}>
                  <strong>{resource.title}</strong>: {resource.description}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No hay recursos autorizados.</p>
          )}
          {portal.canSubmitObservation && (
            <form onSubmit={submitObservation}>
              <label htmlFor="caregiver-observation">Observación para revisión humana</label>
              <textarea
                id="caregiver-observation"
                value={observation}
                maxLength={1000}
                onChange={(event) => setObservation(event.target.value)}
              />
              <small>No genera alertas, diagnósticos ni actuaciones automáticas.</small>
              <button type="submit" disabled={pending || observation.trim().length < 3}>
                Enviar observación
              </button>
            </form>
          )}
        </div>
      )}
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

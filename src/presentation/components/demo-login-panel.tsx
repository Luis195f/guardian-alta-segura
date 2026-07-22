"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import type { Role } from "@/domain/auth/role";
import { homeForRole, roleLabels } from "@/presentation/navigation/role-navigation";

const demoAliases = [
  "demo-admin",
  "demo-nurse",
  "demo-clinician",
  "demo-patient",
  "demo-caregiver",
  "demo-support",
] as const;

function subscribeToHydration(): () => void {
  return () => {};
}

function getClientHydrationSnapshot(): boolean {
  return true;
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

export function DemoLoginPanel({ enabled }: { readonly enabled: boolean }) {
  const router = useRouter();

  const [alias, setAlias] = useState<(typeof demoAliases)[number]>("demo-nurse");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const ready = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enabled || !ready || pending) {
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/demo/session", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          syntheticAlias: alias,
        }),
      });

      if (!response.ok) {
        throw new Error("Demo login failed");
      }

      const payload = (await response.json()) as {
        readonly roles: readonly Role[];
      };

      const role = payload.roles[0];

      if (!role) {
        throw new Error("Authenticated demo user has no role");
      }

      setMessage("Sesión iniciada. Preparando tu espacio…");

      router.push(homeForRole(role));
      router.refresh();
    } catch {
      setMessage("No se pudo conectar con el servicio demo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="login-card" aria-labelledby="demo-title">
      <p className="eyebrow">Acceso local</p>

      <h2 id="demo-title">Selecciona tu papel en la demo</h2>

      <form onSubmit={login}>
        <label htmlFor="demo-alias">Usuario demo</label>

        <select
          id="demo-alias"
          value={alias}
          disabled={!enabled || !ready || pending}
          onChange={(event) => setAlias(event.target.value as (typeof demoAliases)[number])}
        >
          {demoAliases.map((item) => {
            const role = item.replace("demo-", "") as Role;

            return (
              <option key={item} value={item}>
                {roleLabels[role]} · {item}
              </option>
            );
          })}
        </select>

        <button type="submit" disabled={!enabled || !ready || pending}>
          {pending ? "Iniciando…" : "INICIAR DEMO"}
        </button>
      </form>

      <small>Entorno local no productivo. No simula SSO ni MFA institucional.</small>

      {!enabled && <p className="status">La demo está desactivada en este entorno.</p>}

      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

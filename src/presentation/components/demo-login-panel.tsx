"use client";

import { useState, type FormEvent } from "react";

const demoAliases = [
  "demo-admin",
  "demo-nurse",
  "demo-clinician",
  "demo-patient",
  "demo-caregiver",
  "demo-support",
] as const;

export function DemoLoginPanel({ enabled }: { readonly enabled: boolean }) {
  const [alias, setAlias] = useState<(typeof demoAliases)[number]>("demo-nurse");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syntheticAlias: alias }),
      });
      setMessage(
        response.ok
          ? "Sesión demo sintética iniciada. La credencial permanece en una cookie HttpOnly."
          : "No se pudo iniciar la sesión demo.",
      );
    } catch {
      setMessage("No se pudo conectar con el servicio demo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="demo-title">
      <p className="eyebrow">Identidad local</p>
      <h2 id="demo-title">Modo demo NO PRODUCTIVO</h2>
      <p>
        Solo admite las identidades sintéticas creadas por el seed. No simula SSO ni MFA
        institucional.
      </p>
      <form onSubmit={login}>
        <label htmlFor="demo-alias">Usuario sintético</label>
        <select
          id="demo-alias"
          value={alias}
          disabled={!enabled || pending}
          onChange={(event) => setAlias(event.target.value as (typeof demoAliases)[number])}
        >
          {demoAliases.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button type="submit" disabled={!enabled || pending}>
          {pending ? "Iniciando…" : "Iniciar sesión sintética"}
        </button>
      </form>
      {!enabled && <p className="status">El modo demo está desactivado en este entorno.</p>}
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import type { Role } from "@/domain/auth/role";
import {
  homeForRole,
  navigationForRole,
  roleLabels,
} from "@/presentation/navigation/role-navigation";

export function AppShell({
  role,
  syntheticAlias,
  children,
}: {
  readonly role: Role;
  readonly syntheticAlias: string;
  readonly children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const navigation = navigationForRole(role);

  async function endSession() {
    setPending(true);
    try {
      await fetch("/api/demo/session", { method: "DELETE", credentials: "same-origin" });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="app-frame">
      <header className="app-header">
        <Link className="brand" href={homeForRole(role)}>
          <span>Guardián Alta Segura</span>
          <small>Continuidad postalta</small>
        </Link>
        <p className="environment-badge">DEMO SINTÉTICA · NO USO CLÍNICO</p>
        <div className="session-summary">
          <span>
            <strong>{roleLabels[role]}</strong>
            <small>{syntheticAlias}</small>
          </span>
          <button className="text-button" type="button" onClick={endSession} disabled={pending}>
            Cambiar usuario demo
          </button>
          <button className="text-button" type="button" onClick={endSession} disabled={pending}>
            {pending ? "Cerrando…" : "Cerrar sesión"}
          </button>
        </div>
        <details className="mobile-navigation">
          <summary>Menú</summary>
          <nav aria-label="Navegación principal móvil">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <nav aria-label="Navegación principal">
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                (item.href === "/episodes" && pathname.startsWith("/episodes/"));
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </Link>
              );
            })}
          </nav>
          {role === "patient" && (
            <p className="sidebar-notice">
              Esta herramienta no sustituye la atención profesional ni es un canal de urgencias.
            </p>
          )}
        </aside>
        <main className="product-main">{children}</main>
      </div>
    </div>
  );
}

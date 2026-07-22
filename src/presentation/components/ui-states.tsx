import Link from "next/link";
import type { ReactNode } from "react";

function StateFrame({
  eyebrow,
  title,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="state-card" role="status">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function UnauthorizedState() {
  return (
    <StateFrame eyebrow="Acceso restringido" title="Esta sección no corresponde a tu rol">
      <p>La autorización del servidor sigue activa y no se ha consultado información clínica.</p>
      <Link className="button-link" href="/">
        Volver a mi inicio
      </Link>
    </StateFrame>
  );
}

export function UnauthenticatedState() {
  return (
    <StateFrame eyebrow="Sesión necesaria" title="Inicia la demo para continuar">
      <p>Selecciona una identidad sintética. No se utilizan datos reales.</p>
      <Link className="button-link" href="/">
        Ir al acceso demo
      </Link>
    </StateFrame>
  );
}

export function EmptyState({ children }: { readonly children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}

export function LoadingState({ label = "Cargando información…" }: { readonly label?: string }) {
  return (
    <p className="loading-state" role="status">
      {label}
    </p>
  );
}

export function ErrorState({ children }: { readonly children: ReactNode }) {
  return (
    <div className="error-state" role="alert">
      <strong>No hemos podido mostrar esta información.</strong>
      <p>{children}</p>
    </div>
  );
}

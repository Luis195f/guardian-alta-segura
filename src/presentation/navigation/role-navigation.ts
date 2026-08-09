import type { Role } from "@/domain/auth/role";

export interface NavigationItem {
  readonly href: string;
  readonly label: string;
  readonly description: string;
}

const navigationByRole: Readonly<Record<Role, readonly NavigationItem[]>> = {
  nurse: [
    { href: "/dashboard", label: "Inicio", description: "Estado administrativo del circuito" },
    { href: "/episodes", label: "Episodios", description: "Pacientes en seguimiento" },
    { href: "/alerts", label: "Avisos", description: "Revisión humana pendiente" },
    { href: "/workqueue", label: "Seguimiento", description: "Tareas y actividad" },
  ],
  clinician: [
    { href: "/dashboard", label: "Inicio", description: "Estado administrativo del circuito" },
    { href: "/episodes", label: "Episodios", description: "Pacientes en seguimiento" },
    { href: "/alerts", label: "Avisos", description: "Revisión humana pendiente" },
    { href: "/workqueue", label: "Seguimiento", description: "Tareas y actividad" },
  ],
  patient: [
    { href: "/my-follow-up", label: "Inicio", description: "Mi seguimiento" },
    { href: "/my-plan", label: "Mi Plan", description: "Plan de Seguridad" },
    { href: "/my-check-ins", label: "Mis Check-ins", description: "Responder y consultar" },
    {
      href: "/authorized-people",
      label: "Personas autorizadas",
      description: "Accesos y alcance",
    },
  ],
  caregiver: [
    { href: "/caregiver", label: "Portal autorizado", description: "Contenido compartido" },
  ],
  admin: [{ href: "/admin", label: "Configuración", description: "Demo, protocolos y reglas" }],
  support: [{ href: "/support", label: "Estado técnico", description: "Información sanitizada" }],
};

export const roleLabels: Readonly<Record<Role, string>> = {
  admin: "Administración",
  nurse: "Enfermería",
  clinician: "Profesional clínico",
  patient: "Paciente",
  caregiver: "Cuidador",
  support: "Soporte técnico",
};

export function navigationForRole(role: Role): readonly NavigationItem[] {
  return navigationByRole[role];
}

export function homeForRole(role: Role): string {
  return navigationByRole[role][0]!.href;
}

export function isProfessionalRole(role: Role): role is "nurse" | "clinician" {
  return role === "nurse" || role === "clinician";
}

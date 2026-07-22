import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/presentation/components/app-shell";
import { getDemoPageSession } from "@/presentation/session/demo-page-session";

export default async function ProductLayout({ children }: { readonly children: ReactNode }) {
  const session = await getDemoPageSession();
  if (!session) redirect("/");

  return (
    <AppShell role={session.role} syntheticAlias={session.syntheticAlias}>
      {children}
    </AppShell>
  );
}

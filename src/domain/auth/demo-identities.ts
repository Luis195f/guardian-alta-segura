import demoManifest from "../../../config/synthetic-demo-manifest.json";

import type { Role } from "@/domain/auth/role";

export type FixedDemoAlias = `demo-${Role}`;

export const FIXED_DEMO_ALIASES: readonly FixedDemoAlias[] = demoManifest.identities.map(
  ({ alias }) => alias as FixedDemoAlias,
);

export function isFixedDemoAlias(value: string): value is FixedDemoAlias {
  return FIXED_DEMO_ALIASES.some((alias) => alias === value);
}

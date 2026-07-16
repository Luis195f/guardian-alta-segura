export const FIXED_DEMO_ALIASES = [
  "demo-admin",
  "demo-nurse",
  "demo-clinician",
  "demo-patient",
  "demo-caregiver",
  "demo-support",
] as const;

export type FixedDemoAlias = (typeof FIXED_DEMO_ALIASES)[number];

export function isFixedDemoAlias(value: string): value is FixedDemoAlias {
  return FIXED_DEMO_ALIASES.some((alias) => alias === value);
}

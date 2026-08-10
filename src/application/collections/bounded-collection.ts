export const EXPOSED_COLLECTION_LIMIT = 50;
export const EXPOSED_COLLECTION_QUERY_TAKE = EXPOSED_COLLECTION_LIMIT + 1;

export const TECHNICAL_COLLECTION_LIMIT_NOTICE =
  "Límite técnico de la vista de demostración; no es una regla ni un umbral clínico.";

export interface BoundedCollectionCoverage {
  readonly returned: number;
  readonly limit: number;
  readonly truncated: boolean;
  readonly basis: "TECHNICAL_DEMO_LIMIT";
}

export function boundCollection<T>(
  rows: readonly T[],
  limit: number = EXPOSED_COLLECTION_LIMIT,
): { readonly values: readonly T[]; readonly coverage: BoundedCollectionCoverage } {
  const truncated = rows.length > limit;
  const values = truncated ? rows.slice(0, limit) : rows;
  return {
    values,
    coverage: {
      returned: values.length,
      limit,
      truncated,
      basis: "TECHNICAL_DEMO_LIMIT",
    },
  };
}

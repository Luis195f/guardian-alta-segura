export interface SafetyPlanExportDocument {
  readonly safetyPlanId: string;
  readonly versionNumber: number;
  readonly generatedAt: Date;
  readonly sections: readonly {
    readonly step: string;
    readonly content: string;
    readonly provenance: string;
  }[];
}

export interface SafetyPlanExport {
  readonly mediaType: "application/pdf";
  readonly fileName: string;
  readonly bytes: Uint8Array;
}

/**
 * Contract reserved for PR 11. No PDF exporter is wired in this branch.
 * Implementations must receive an already-authorized, minimized document.
 */
export interface SafetyPlanExporter {
  export(document: SafetyPlanExportDocument): Promise<SafetyPlanExport>;
}

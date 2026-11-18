/** TASK 03 contracts only: no UI action or conversion implementation is implied. */
export type EvidenceLevel =
  "metadata_only" | "geometry_decoded" | "round_trip_compared" | "game_tested";
export interface AssetIdentity {
  path: string;
  size: number;
  sha256: string;
}
export interface ValidationFinding {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  byteOffset?: number;
}
export interface ValidationReport {
  input: AssetIdentity;
  evidence: EvidenceLevel;
  findings: ValidationFinding[];
  gameCompatibility: "unverified" | "tested_for_specific_sample";
}
export interface ImportAdapter {
  readonly id: string;
  readonly supportedFormats: readonly string[];
  /** Must return provenance, losses and preserved attributes, not merely an output path. */
  importAsset(
    input: AssetIdentity,
    experimentDirectory: string,
    signal: AbortSignal,
  ): Promise<ConversionResult>;
}
export interface ExportAdapter {
  readonly id: string;
  exportAsset(
    preview: AssetIdentity,
    original: AssetIdentity,
    experimentDirectory: string,
    signal: AbortSignal,
  ): Promise<ConversionResult>;
}
export interface ConversionResult {
  outputs: AssetIdentity[];
  validation: ValidationReport;
  preserved: string[];
  changed: string[];
  unsupported: string[];
}
export const pesCapabilityStatus = {
  inspector: "experimental_python_cli_metadata_only",
  containerStaging: "validated_on_one_local_face",
  importAdapter: "not_implemented",
  exportAdapter: "not_implemented",
  gameCompatibility: "unverified",
} as const;

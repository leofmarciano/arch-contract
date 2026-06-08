// Public programmatic API surface for arch-contract.

export const VERSION = '0.2.0';

export type {
  AnalysisContext,
  CheckResult,
  FileFacts,
  Selector,
  Severity,
  Summary,
  Violation,
} from './core/types.js';
export { runCheck } from './core/run-check.js';
export type { RunCheckOptions, RunCheckResult } from './core/run-check.js';
export { computeSummary } from './core/run-check.js';

export {
  loadAndValidate,
  validateConfig,
  ConfigNotFoundError,
  ConfigParseError,
  ConfigValidationError,
  InvalidPresetError,
  PresetLoadError,
  UnknownPresetError,
} from './config/index.js';
export type { NormalizedConfig, LoadConfigResult } from './config/index.js';
// Preset authoring surface (for `arch-contract-preset-*` packages).
export type { PresetEntry, PresetFragment, PresetMeta } from './config/index.js';

export { fingerprint, createViolation, sortViolations } from './rules/violations.js';

export { getReporter, reporters, REPORT_FORMATS } from './reporters/index.js';
export type { Reporter, ReportFormat } from './reporters/index.js';

export {
  buildBaseline,
  serializeBaseline,
  applyBaseline,
  loadBaseline,
  parseBaseline,
} from './baseline/index.js';
export type { BaselineFile, BaselineEntry } from './baseline/index.js';

export { syncAgentDocs } from './agents/update-agent-docs.js';
export { buildInstructions } from './agents/instruction-block.js';

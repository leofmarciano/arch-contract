import fs from 'node:fs';

import { parse as yamlParse } from 'yaml';

import { computeSummary } from '../core/run-check.js';
import type { CheckResult } from '../core/types.js';
import { baselineDocumentSchema, type BaselineFile } from './create-baseline.js';

export class BaselineParseError extends Error {
  constructor(message: string) {
    super(`Invalid baseline file: ${message}`);
    this.name = 'BaselineParseError';
  }
}

/** Parse + validate baseline YAML text into a BaselineFile. */
export function parseBaseline(text: string): BaselineFile {
  let doc: unknown;
  try {
    doc = yamlParse(text);
  } catch (err) {
    throw new BaselineParseError((err as Error).message);
  }
  const parsed = baselineDocumentSchema.safeParse(doc);
  if (!parsed.success) {
    throw new BaselineParseError(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const b = parsed.data.baseline;
  return {
    generatedAt: b.generatedAt,
    fingerprintVersion: b.fingerprintVersion ?? 1,
    ignoredViolations: b.ignoredViolations,
  };
}

/** Load a baseline file from disk; returns null when the file does not exist. */
export function loadBaseline(path: string): BaselineFile | null {
  let text: string;
  try {
    text = fs.readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  return parseBaseline(text);
}

/**
 * Suppress violations whose fingerprint is in the baseline. Only NEW (non-
 * baselined) violations remain and drive `passed`; `ignored` reflects the count
 * suppressed.
 */
export function applyBaseline(result: CheckResult, baseline: BaselineFile): CheckResult {
  const known = new Set(baseline.ignoredViolations.map((e) => e.fingerprint));
  const kept = result.violations.filter((v) => !known.has(v.fingerprint));
  const suppressed = result.violations.length - kept.length;
  const summary = computeSummary(kept, result.summary.rulesEvaluated);
  summary.ignored = suppressed;
  return { summary, violations: kept };
}

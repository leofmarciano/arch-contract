import { stringify as yamlStringify } from 'yaml';
import { z } from 'zod';

import type { Violation } from '../core/types.js';

export const FINGERPRINT_VERSION = 1;

export interface BaselineEntry {
  fingerprint: string;
  rule: string;
  file: string;
  reason?: string;
}

export interface BaselineFile {
  generatedAt: string;
  fingerprintVersion: number;
  ignoredViolations: BaselineEntry[];
}

export const baselineEntrySchema = z
  .object({
    fingerprint: z.string(),
    rule: z.string(),
    file: z.string(),
    reason: z.string().optional(),
  })
  .strip();

export const baselineDocumentSchema = z.object({
  baseline: z.object({
    generatedAt: z.string(),
    fingerprintVersion: z.number().optional(),
    ignoredViolations: z.array(baselineEntrySchema),
  }),
});

/** Build a baseline (pure; `now` injected) recording every current violation, sorted by fingerprint. */
export function buildBaseline(
  violations: Violation[],
  opts: { now: Date; reason?: string },
): BaselineFile {
  const ignoredViolations: BaselineEntry[] = violations
    .map((v) => ({
      fingerprint: v.fingerprint,
      rule: v.rule,
      file: v.file,
      ...(opts.reason !== undefined ? { reason: opts.reason } : {}),
    }))
    .sort((a, b) => (a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0));

  return {
    generatedAt: opts.now.toISOString(),
    fingerprintVersion: FINGERPRINT_VERSION,
    ignoredViolations,
  };
}

/** Serialize to the spec YAML shape: a top-level `baseline:` mapping. */
export function serializeBaseline(file: BaselineFile): string {
  return yamlStringify({ baseline: file });
}

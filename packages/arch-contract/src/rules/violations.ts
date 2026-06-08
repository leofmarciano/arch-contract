import type { Severity, Violation } from '../core/types.js';

/**
 * Rotate a cycle's member list so the lexicographically smallest member is
 * first, preserving edge direction. Makes a cycle's identity independent of
 * which node the traversal happened to start from.
 */
export function canonicalizeCycle(members: string[]): string[] {
  if (members.length <= 1) return [...members];
  let minIdx = 0;
  for (let i = 1; i < members.length; i++) {
    const m = members[i];
    if (m !== undefined && m < (members[minIdx] as string)) minIdx = i;
  }
  return [...members.slice(minIdx), ...members.slice(0, minIdx)];
}

export interface FingerprintInput {
  rule: string;
  /** rel-POSIX file the violation is anchored to */
  file: string;
  /** package name, imported file, or offending symbol */
  target?: string;
  /** rel-POSIX cycle members — overrides file/target keying for `no-cycles` */
  cyclePath?: string[];
}

/**
 * Stable, human-readable fingerprint used as the baseline key.
 *
 * Format mirrors the spec (section 12): `rule:file:target`, e.g.
 * `domain-must-not-use-frameworks:src/domain/User.ts:express`. It is
 * intentionally independent of line/column and message wording so baselines
 * survive refactors. Cycles key on the canonical member list instead.
 */
export function fingerprint(input: FingerprintInput): string {
  if (input.cyclePath && input.cyclePath.length > 0) {
    return `${input.rule}:cycle:${canonicalizeCycle(input.cyclePath).join('>')}`;
  }
  const parts = [input.rule, input.file];
  if (input.target !== undefined && input.target !== '') parts.push(input.target);
  return parts.join(':');
}

export interface ViolationInput {
  rule: string;
  severity?: Severity;
  /** rel-POSIX path */
  file: string;
  line?: number;
  column?: number;
  target?: string;
  symbol?: string;
  message: string;
  suggestion?: string;
  cyclePath?: string[];
}

/**
 * Build a `Violation`, defaulting severity to `error` and computing the
 * fingerprint. Optional fields are omitted (not set to `undefined`) so the
 * JSON reporter stays clean and deterministic.
 */
export function createViolation(input: ViolationInput): Violation {
  const target = input.target ?? input.symbol;
  const v: Violation = {
    rule: input.rule,
    severity: input.severity ?? 'error',
    file: input.file,
    message: input.message,
    fingerprint: fingerprint({
      rule: input.rule,
      file: input.file,
      ...(target !== undefined ? { target } : {}),
      ...(input.cyclePath !== undefined ? { cyclePath: input.cyclePath } : {}),
    }),
  };
  if (input.line !== undefined) v.line = input.line;
  if (input.column !== undefined) v.column = input.column;
  if (input.target !== undefined) v.target = input.target;
  if (input.symbol !== undefined) v.symbol = input.symbol;
  if (input.suggestion !== undefined) v.suggestion = input.suggestion;
  if (input.cyclePath !== undefined) v.cyclePath = input.cyclePath;
  return v;
}

/**
 * Deterministic ordering for reporter/baseline output:
 * by file, then line, then column, then rule.
 */
export function sortViolations(violations: Violation[]): Violation[] {
  return [...violations].sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    const al = a.line ?? 0;
    const bl = b.line ?? 0;
    if (al !== bl) return al - bl;
    const ac = a.column ?? 0;
    const bc = b.column ?? 0;
    if (ac !== bc) return ac - bc;
    if (a.rule !== b.rule) return a.rule < b.rule ? -1 : 1;
    return a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0;
  });
}

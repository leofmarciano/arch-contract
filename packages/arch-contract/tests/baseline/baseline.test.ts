import { describe, expect, it } from 'vitest';

import { computeSummary } from '../../src/core/run-check.js';
import type { CheckResult, Violation } from '../../src/core/types.js';
import {
  applyBaseline,
  BaselineParseError,
  buildBaseline,
  loadBaseline,
  parseBaseline,
  serializeBaseline,
} from '../../src/baseline/index.js';
import { createViolation } from '../../src/rules/violations.js';

const NOW = new Date('2026-06-08T00:00:00.000Z');

function v(rule: string, file: string, target?: string): Violation {
  return createViolation({ rule, file, message: 'm', ...(target !== undefined ? { target } : {}) });
}

function result(violations: Violation[]): CheckResult {
  return { summary: computeSummary(violations, 3), violations };
}

describe('buildBaseline / serialize', () => {
  it('records each violation, reusing its fingerprint, sorted', () => {
    const b = buildBaseline([v('b', 'src/b.ts'), v('a', 'src/a.ts')], { now: NOW });
    expect(b.ignoredViolations.map((e) => e.fingerprint)).toEqual(['a:src/a.ts', 'b:src/b.ts']);
    expect(b.generatedAt).toBe('2026-06-08T00:00:00.000Z');
  });

  it('attaches an optional reason to every entry', () => {
    const b = buildBaseline([v('a', 'src/a.ts')], { now: NOW, reason: 'legacy' });
    expect(b.ignoredViolations[0]?.reason).toBe('legacy');
  });

  it('serializes under a top-level `baseline:` key and round-trips', () => {
    const b = buildBaseline([v('a', 'src/a.ts', 'express')], { now: NOW });
    const yaml = serializeBaseline(b);
    expect(yaml).toMatch(/^baseline:/m);
    expect(parseBaseline(yaml)).toEqual(b);
  });
});

describe('parseBaseline errors', () => {
  it('throws on a structurally invalid baseline', () => {
    expect(() => parseBaseline('baseline:\n  nope: 1\n')).toThrow(BaselineParseError);
  });
});

describe('loadBaseline', () => {
  it('returns null when the file is absent', () => {
    expect(loadBaseline('/no/such/baseline.yaml')).toBeNull();
  });
});

describe('applyBaseline', () => {
  it('suppresses baselined violations and keeps new ones', () => {
    const r = result([v('a', 'src/a.ts'), v('b', 'src/b.ts')]);
    const baseline = buildBaseline([v('a', 'src/a.ts')], { now: NOW });
    const filtered = applyBaseline(r, baseline);
    expect(filtered.violations.map((x) => x.rule)).toEqual(['b']);
    expect(filtered.summary.ignored).toBe(1);
    expect(filtered.summary.passed).toBe(false);
  });

  it('passes when only baselined violations remain', () => {
    const r = result([v('a', 'src/a.ts')]);
    const baseline = buildBaseline(r.violations, { now: NOW });
    const filtered = applyBaseline(r, baseline);
    expect(filtered.violations).toEqual([]);
    expect(filtered.summary.passed).toBe(true);
    expect(filtered.summary.ignored).toBe(1);
  });

  it('a stale baseline entry (violation gone) is tolerated', () => {
    const r = result([v('a', 'src/a.ts')]);
    const baseline = buildBaseline([v('a', 'src/a.ts'), v('gone', 'src/x.ts')], { now: NOW });
    expect(applyBaseline(r, baseline).summary.passed).toBe(true);
  });
});

describe('create -> apply roundtrip', () => {
  it('a baseline built from R suppresses all of R; a later new violation fails', () => {
    const r = result([v('a', 'src/a.ts'), v('b', 'src/b.ts')]);
    const baseline = buildBaseline(r.violations, { now: NOW });
    expect(applyBaseline(r, baseline).summary.passed).toBe(true);

    const r2 = result([...r.violations, v('c', 'src/c.ts')]);
    const applied = applyBaseline(r2, baseline);
    expect(applied.summary.passed).toBe(false);
    expect(applied.violations.map((x) => x.rule)).toEqual(['c']);
  });
});

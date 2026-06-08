import { describe, expect, it } from 'vitest';

import type { CheckResult, Selector, Severity, Violation } from '../../src/core/types.js';

// These assignments are compile-time contract checks: if the canonical shapes
// drift incompatibly, `tsc --noEmit` (the typecheck script) fails. The runtime
// assertions below merely let vitest count the file.

const globSelector: Selector = { kind: 'glob', patterns: ['src/**/*.ts'] };
const layerSelector: Selector = { kind: 'layer', layer: 'domain' };

function describeSelector(s: Selector): string {
  // Exhaustive discriminated-union narrowing — a new variant would break this.
  switch (s.kind) {
    case 'glob':
      return s.patterns.join(',');
    case 'layer':
      return s.layer;
  }
}

const severities: Severity[] = ['error', 'warning'];

const sampleViolation: Violation = {
  rule: 'layer-boundary',
  severity: 'error',
  file: 'src/domain/User.ts',
  message: 'Domain cannot depend on infrastructure.',
  fingerprint: 'layer-boundary:src/domain/User.ts:src/infra/db.ts',
};

const sampleResult: CheckResult = {
  summary: { errors: 1, warnings: 0, ignored: 0, rulesEvaluated: 3, passed: false },
  violations: [sampleViolation],
};

describe('canonical type contract', () => {
  it('selectors narrow exhaustively by kind', () => {
    expect(describeSelector(globSelector)).toBe('src/**/*.ts');
    expect(describeSelector(layerSelector)).toBe('domain');
  });

  it('exposes the two severities', () => {
    expect(severities).toEqual(['error', 'warning']);
  });

  it('result wraps a summary and violations', () => {
    expect(sampleResult.summary.passed).toBe(false);
    expect(sampleResult.violations).toHaveLength(1);
  });
});

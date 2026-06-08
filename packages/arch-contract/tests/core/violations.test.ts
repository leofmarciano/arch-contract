import { describe, expect, it } from 'vitest';

import type { Violation } from '../../src/core/types.js';
import { createViolation, sortViolations } from '../../src/rules/violations.js';

describe('createViolation', () => {
  it('defaults severity to error', () => {
    const v = createViolation({ rule: 'r', file: 'src/a.ts', message: 'm' });
    expect(v.severity).toBe('error');
  });

  it('computes the fingerprint from rule+file+target', () => {
    const v = createViolation({ rule: 'r', file: 'src/a.ts', target: 'express', message: 'm' });
    expect(v.fingerprint).toBe('r:src/a.ts:express');
  });

  it('uses the symbol as the fingerprint tail when no target is given', () => {
    const v = createViolation({ rule: 'r', file: 'src/a.ts', symbol: 'UserService', message: 'm' });
    expect(v.fingerprint).toBe('r:src/a.ts:UserService');
  });

  it('omits undefined optional fields (JSON-clean)', () => {
    const v = createViolation({ rule: 'r', file: 'src/a.ts', message: 'm' });
    expect('line' in v).toBe(false);
    expect('column' in v).toBe(false);
    expect('target' in v).toBe(false);
    expect('symbol' in v).toBe(false);
    expect('suggestion' in v).toBe(false);
    expect('cyclePath' in v).toBe(false);
  });

  it('keeps provided optional fields', () => {
    const v = createViolation({
      rule: 'r',
      file: 'src/a.ts',
      line: 3,
      column: 5,
      target: 't',
      message: 'm',
      suggestion: 's',
    });
    expect(v.line).toBe(3);
    expect(v.column).toBe(5);
    expect(v.target).toBe('t');
    expect(v.suggestion).toBe('s');
  });

  it('honors an explicit warning severity', () => {
    const v = createViolation({ rule: 'r', file: 'src/a.ts', severity: 'warning', message: 'm' });
    expect(v.severity).toBe('warning');
  });
});

describe('sortViolations', () => {
  it('orders by file, then line, then column, then rule', () => {
    const input: Violation[] = [
      createViolation({ rule: 'b', file: 'src/b.ts', line: 1, message: 'm' }),
      createViolation({ rule: 'a', file: 'src/a.ts', line: 10, column: 2, message: 'm' }),
      createViolation({ rule: 'a', file: 'src/a.ts', line: 10, column: 1, message: 'm' }),
      createViolation({ rule: 'a', file: 'src/a.ts', line: 2, message: 'm' }),
    ];
    const sorted = sortViolations(input).map((v) => `${v.file}:${v.line}:${v.column ?? '-'}:${v.rule}`);
    expect(sorted).toEqual([
      'src/a.ts:2:-:a',
      'src/a.ts:10:1:a',
      'src/a.ts:10:2:a',
      'src/b.ts:1:-:b',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [createViolation({ rule: 'a', file: 'b.ts', message: 'm' })];
    const copy = [...input];
    sortViolations(input);
    expect(input).toEqual(copy);
  });
});

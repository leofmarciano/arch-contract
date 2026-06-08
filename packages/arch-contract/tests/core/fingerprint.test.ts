import { describe, expect, it } from 'vitest';

import { canonicalizeCycle, fingerprint } from '../../src/rules/violations.js';

describe('fingerprint', () => {
  it('is stable for the same rule+file+target across calls', () => {
    const a = fingerprint({ rule: 'r', file: 'src/a.ts', target: 'express' });
    const b = fingerprint({ rule: 'r', file: 'src/a.ts', target: 'express' });
    expect(a).toBe(b);
  });

  it('matches the spec format `rule:file:target`', () => {
    expect(
      fingerprint({
        rule: 'domain-must-not-use-frameworks',
        file: 'src/domain/User.ts',
        target: 'express',
      }),
    ).toBe('domain-must-not-use-frameworks:src/domain/User.ts:express');
  });

  it('is independent of line and column (no positional input at all)', () => {
    // fingerprint() takes no line/column — stability is structural.
    const a = fingerprint({ rule: 'r', file: 'src/a.ts', target: 't' });
    const b = fingerprint({ rule: 'r', file: 'src/a.ts', target: 't' });
    expect(a).toBe(b);
  });

  it('omits the target segment when there is no target', () => {
    expect(fingerprint({ rule: 'no-default-export', file: 'src/a.ts' })).toBe(
      'no-default-export:src/a.ts',
    );
  });

  it('yields a different fingerprint for a different target', () => {
    const a = fingerprint({ rule: 'r', file: 'src/a.ts', target: 'express' });
    const b = fingerprint({ rule: 'r', file: 'src/a.ts', target: 'fastify' });
    expect(a).not.toBe(b);
  });

  it('produces an identical cycle fingerprint regardless of start member', () => {
    const a = fingerprint({ rule: 'no-cycles', file: 'x', cyclePath: ['a.ts', 'b.ts', 'c.ts'] });
    const b = fingerprint({ rule: 'no-cycles', file: 'x', cyclePath: ['b.ts', 'c.ts', 'a.ts'] });
    const c = fingerprint({ rule: 'no-cycles', file: 'x', cyclePath: ['c.ts', 'a.ts', 'b.ts'] });
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('distinguishes a cycle fingerprint from a plain violation on the same file', () => {
    const cycle = fingerprint({ rule: 'no-cycles', file: 'a.ts', cyclePath: ['a.ts', 'b.ts'] });
    const plain = fingerprint({ rule: 'no-cycles', file: 'a.ts', target: 'b.ts' });
    expect(cycle).not.toBe(plain);
  });
});

describe('canonicalizeCycle', () => {
  it('rotates so the smallest member leads while preserving direction', () => {
    expect(canonicalizeCycle(['c', 'a', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('returns single-member and empty cycles unchanged', () => {
    expect(canonicalizeCycle(['only'])).toEqual(['only']);
    expect(canonicalizeCycle([])).toEqual([]);
  });
});

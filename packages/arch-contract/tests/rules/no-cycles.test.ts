import { describe, expect, it } from 'vitest';

import type { NoCyclesRule } from '../../src/config/model.js';
import { noCyclesRule } from '../../src/rules/built-in/no-cycles.js';
import { analyze } from '../helpers/analysis.js';

const cfg: NoCyclesRule = { name: 'no-cycles', type: 'no-cycles', severity: 'error', scope: 'file' };

describe('noCyclesRule', () => {
  it('passes on an acyclic graph', () => {
    const { ctx } = analyze({
      '/proj/src/a.ts': `import { B } from './b';\nexport const a = B;`,
      '/proj/src/b.ts': `export const B = 1;`,
    });
    expect(noCyclesRule(cfg).check(ctx)).toEqual([]);
  });

  it('detects a two-file cycle and lists both members', () => {
    const { ctx } = analyze({
      '/proj/src/a.ts': `import { B } from './b';\nexport const A = 1;\nexport const useB = B;`,
      '/proj/src/b.ts': `import { A } from './a';\nexport const B = 1;\nexport const useA = A;`,
    });
    const v = noCyclesRule(cfg).check(ctx);
    expect(v).toHaveLength(1);
    // findCycles returns members already sorted deterministically
    expect(v[0]?.cyclePath).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('reports two independent cycles separately', () => {
    const { ctx } = analyze({
      '/proj/src/a.ts': `import { B } from './b';\nexport const A = 1; export const z = B;`,
      '/proj/src/b.ts': `import { A } from './a';\nexport const B = 1; export const z = A;`,
      '/proj/src/x.ts': `import { Y } from './y';\nexport const X = 1; export const z = Y;`,
      '/proj/src/y.ts': `import { X } from './x';\nexport const Y = 1; export const z = X;`,
    });
    expect(noCyclesRule(cfg).check(ctx)).toHaveLength(2);
  });

  it('produces a stable cycle fingerprint across runs', () => {
    const files = {
      '/proj/src/a.ts': `import { B } from './b';\nexport const A = 1; export const z = B;`,
      '/proj/src/b.ts': `import { A } from './a';\nexport const B = 1; export const z = A;`,
    };
    const f1 = noCyclesRule(cfg).check(analyze(files).ctx)[0]?.fingerprint;
    const f2 = noCyclesRule(cfg).check(analyze(files).ctx)[0]?.fingerprint;
    expect(f1).toBe(f2);
  });

  it('detects module-scoped cycles', () => {
    const { ctx } = analyze({
      '/proj/src/modules/a/x.ts': `import { Y } from '../b/y';\nexport const X = 1; export const z = Y;`,
      '/proj/src/modules/b/y.ts': `import { X } from '../a/x';\nexport const Y = 1; export const z = X;`,
    });
    const v = noCyclesRule({ ...cfg, scope: 'module' }).check(ctx);
    expect(v.length).toBeGreaterThanOrEqual(1);
  });
});

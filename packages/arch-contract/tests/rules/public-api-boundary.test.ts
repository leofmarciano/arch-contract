import { describe, expect, it } from 'vitest';

import type { PublicApiBoundaryRule } from '../../src/config/model.js';
import { publicApiBoundaryRule } from '../../src/rules/built-in/public-api-boundary.js';
import { analyze } from '../helpers/analysis.js';

const cfg: PublicApiBoundaryRule = {
  name: 'public-api',
  type: 'public-api-boundary',
  severity: 'error',
  except: { sameModule: true },
};

describe('publicApiBoundaryRule', () => {
  it('allows a cross-module import that targets the module barrel', () => {
    const { ctx } = analyze({
      '/proj/src/modules/billing/index.ts': `export const Api = 1;`,
      '/proj/src/modules/orders/svc.ts': `import { Api } from '../billing/index';\nexport const x = Api;`,
    });
    expect(publicApiBoundaryRule(cfg).check(ctx)).toEqual([]);
  });

  it('flags a cross-module deep import', () => {
    const { ctx } = analyze({
      '/proj/src/modules/billing/internal/x.ts': `export const Secret = 1;`,
      '/proj/src/modules/orders/svc.ts': `import { Secret } from '../billing/internal/x';\nexport const x = Secret;`,
    });
    const v = publicApiBoundaryRule(cfg).check(ctx);
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('src/modules/billing/internal/x.ts');
    expect(v[0]?.suggestion).toMatch(/src\/modules\/billing\/index\.ts/);
  });

  it('allows a same-module deep import', () => {
    const { ctx } = analyze({
      '/proj/src/modules/billing/internal/x.ts': `export const S = 1;`,
      '/proj/src/modules/billing/svc.ts': `import { S } from './internal/x';\nexport const x = S;`,
    });
    expect(publicApiBoundaryRule(cfg).check(ctx)).toEqual([]);
  });

  it('flags a deep import into a module even from a non-module file', () => {
    const { ctx } = analyze({
      '/proj/src/shared/util.ts': `import { S } from '../modules/billing/internal/x';\nexport const x = S;`,
      '/proj/src/modules/billing/internal/x.ts': `export const S = 1;`,
    });
    // shared/util has no module, but it still breaks billing's encapsulation.
    const v = publicApiBoundaryRule(cfg).check(ctx);
    expect(v).toHaveLength(1);
  });
});

import { describe, expect, it } from 'vitest';

import type { AllowedDependencyRule } from '../../src/config/model.js';
import { allowedDependencyRule } from '../../src/rules/built-in/allowed-dependency.js';
import { analyze } from '../helpers/analysis.js';

function rule(allow: string[]): AllowedDependencyRule {
  return {
    name: 'app-allow',
    type: 'allowed-dependency',
    severity: 'error',
    from: { kind: 'glob', patterns: ['src/app/**'] },
    allow: { kind: 'glob', patterns: allow },
  };
}

describe('allowedDependencyRule', () => {
  it('passes when the target is within the allow set', () => {
    const { ctx } = analyze({
      '/proj/src/app/svc.ts': `import { U } from '../domain/u';\nexport const x = U;`,
      '/proj/src/domain/u.ts': `export class U {}`,
    });
    expect(allowedDependencyRule(rule(['src/domain/**'])).check(ctx)).toEqual([]);
  });

  it('fails when the target is outside the allow set', () => {
    const { ctx } = analyze({
      '/proj/src/app/svc.ts': `import { Db } from '../infra/db';\nexport const x = Db;`,
      '/proj/src/infra/db.ts': `export class Db {}`,
    });
    const v = allowedDependencyRule(rule(['src/domain/**'])).check(ctx);
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('src/infra/db.ts');
  });

  it('leaves files not matching from unconstrained', () => {
    const { ctx } = analyze({
      '/proj/src/other/svc.ts': `import { Db } from '../infra/db';\nexport const x = Db;`,
      '/proj/src/infra/db.ts': `export class Db {}`,
    });
    expect(allowedDependencyRule(rule(['src/domain/**'])).check(ctx)).toEqual([]);
  });

  it('does not constrain external imports', () => {
    const { ctx } = analyze({
      '/proj/src/app/svc.ts': `import express from 'express';\nexport const x = express;`,
    });
    expect(allowedDependencyRule(rule(['src/domain/**'])).check(ctx)).toEqual([]);
  });
});

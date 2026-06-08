import { describe, expect, it } from 'vitest';

import type { ForbiddenImportRule } from '../../src/config/model.js';
import { forbiddenImportRule } from '../../src/rules/built-in/forbidden-import.js';
import { analyze } from '../helpers/analysis.js';

function rule(over: Partial<ForbiddenImportRule> = {}): ForbiddenImportRule {
  return {
    name: 'no-app-to-infra',
    type: 'forbidden-import',
    severity: 'error',
    from: { kind: 'glob', patterns: ['src/app/**'] },
    to: { kind: 'glob', patterns: ['src/infra/**'] },
    except: { sameModule: false, publicApi: [] },
    ...over,
  };
}

describe('forbiddenImportRule', () => {
  it('flags a from->to match', () => {
    const { ctx } = analyze({
      '/proj/src/app/svc.ts': `import { Db } from '../infra/db';\nexport const x = Db;`,
      '/proj/src/infra/db.ts': `export class Db {}`,
    });
    const v = forbiddenImportRule(rule()).check(ctx);
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('src/infra/db.ts');
  });

  it('ignores imports not matching from', () => {
    const { ctx } = analyze({
      '/proj/src/other/svc.ts': `import { Db } from '../infra/db';\nexport const x = Db;`,
      '/proj/src/infra/db.ts': `export class Db {}`,
    });
    expect(forbiddenImportRule(rule()).check(ctx)).toEqual([]);
  });

  it('ignores imports not matching to', () => {
    const { ctx } = analyze({
      '/proj/src/app/svc.ts': `import { U } from '../domain/u';\nexport const x = U;`,
      '/proj/src/domain/u.ts': `export class U {}`,
    });
    expect(forbiddenImportRule(rule()).check(ctx)).toEqual([]);
  });

  it('honors except.sameModule', () => {
    const { ctx } = analyze(
      {
        '/proj/src/modules/billing/app/svc.ts': `import { Db } from '../infra/db';\nexport const x = Db;`,
        '/proj/src/modules/billing/infra/db.ts': `export class Db {}`,
      },
    );
    const v = forbiddenImportRule(
      rule({
        from: { kind: 'glob', patterns: ['src/modules/*/app/**'] },
        to: { kind: 'glob', patterns: ['src/modules/*/infra/**'] },
        except: { sameModule: true, publicApi: [] },
      }),
    ).check(ctx);
    expect(v).toEqual([]);
  });

  it('honors except.publicApi', () => {
    const { ctx } = analyze({
      '/proj/src/app/svc.ts': `import { Api } from '../infra/index';\nexport const x = Api;`,
      '/proj/src/infra/index.ts': `export const Api = 1;`,
    });
    const v = forbiddenImportRule(
      rule({ except: { sameModule: false, publicApi: ['src/infra/index.ts'] } }),
    ).check(ctx);
    expect(v).toEqual([]);
  });

  it('matches external package targets by specifier', () => {
    const { ctx } = analyze({
      '/proj/src/app/svc.ts': `import express from 'express';\nexport const x = express;`,
    });
    const v = forbiddenImportRule(
      rule({ to: { kind: 'glob', patterns: ['express'] } }),
    ).check(ctx);
    expect(v).toHaveLength(1);
    expect(v[0]?.target).toBe('express');
  });
});

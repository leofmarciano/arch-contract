import { describe, expect, it } from 'vitest';

import { layerBoundaryRule } from '../../src/rules/built-in/layer-boundary.js';
import { analyze } from '../helpers/analysis.js';

const LAYERS = {
  layers: [
    { name: 'domain', match: 'src/domain/**/*.ts' },
    { name: 'application', match: 'src/application/**/*.ts' },
    { name: 'infrastructure', match: 'src/infrastructure/**/*.ts' },
  ],
  ruleset: {
    application: { mayDependOn: ['domain'] },
    domain: { mayDependOn: [] },
    infrastructure: { mayDependOn: ['domain', 'application'] },
  },
};

function run(files: Record<string, string>) {
  const { ctx } = analyze(files, LAYERS);
  return layerBoundaryRule().check(ctx);
}

describe('layerBoundaryRule', () => {
  it('passes when domain imports nothing', () => {
    expect(run({ '/proj/src/domain/User.ts': `export class User {}` })).toEqual([]);
  });

  it('passes when application imports domain (allowed)', () => {
    const v = run({
      '/proj/src/domain/User.ts': `export class User {}`,
      '/proj/src/application/CreateUser.ts': `import { User } from '../domain/User';\nexport const x = User;`,
    });
    expect(v).toEqual([]);
  });

  it('fails when domain imports infrastructure (forbidden)', () => {
    const v = run({
      '/proj/src/domain/User.ts': `import { Db } from '../infrastructure/Db';\nexport const x = Db;`,
      '/proj/src/infrastructure/Db.ts': `export class Db {}`,
    });
    expect(v).toHaveLength(1);
    expect(v[0]?.rule).toBe('layer-boundary');
    expect(v[0]?.file).toBe('src/domain/User.ts');
    expect(v[0]?.target).toBe('src/infrastructure/Db.ts');
    expect(v[0]?.message).toMatch(/cannot depend on layer "infrastructure"/);
  });

  it('allows same-layer imports', () => {
    const v = run({
      '/proj/src/domain/A.ts': `import { B } from './B';\nexport const x = B;`,
      '/proj/src/domain/B.ts': `export class B {}`,
    });
    expect(v).toEqual([]);
  });

  it('skips unconstrained layers (no ruleset entry)', () => {
    const { ctx } = analyze(
      {
        '/proj/src/domain/User.ts': `import { Db } from '../infrastructure/Db';\nexport const x = Db;`,
        '/proj/src/infrastructure/Db.ts': `export class Db {}`,
      },
      {
        layers: LAYERS.layers,
        ruleset: { infrastructure: { mayDependOn: [] } }, // domain not listed -> unconstrained
      },
    );
    expect(layerBoundaryRule().check(ctx)).toEqual([]);
  });
});

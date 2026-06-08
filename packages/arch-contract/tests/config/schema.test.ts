import { describe, expect, it } from 'vitest';

import { configSchema } from '../../src/config/schema.js';

function minimal(): Record<string, unknown> {
  return { version: 1, project: { name: 'demo' }, layers: [{ name: 'domain', match: 'src/**' }] };
}

function kitchenSink(): Record<string, unknown> {
  return {
    version: 1,
    project: { name: 'svc', language: 'typescript', packageManager: 'pnpm', tsconfig: 'tsconfig.json' },
    paths: { include: ['src'], exclude: ['**/*.test.ts'] },
    layers: [
      { name: 'presentation', match: ['src/**/controllers/**/*.ts'] },
      { name: 'application', match: 'src/**/application/**/*.ts' },
      { name: 'domain', match: ['src/**/domain/**/*.ts'] },
      { name: 'infrastructure', match: ['src/**/infrastructure/**/*.ts'] },
    ],
    ruleset: {
      presentation: { mayDependOn: ['application'] },
      application: { mayDependOn: 'domain' },
      domain: { mayDependOn: [] },
      infrastructure: { mayDependOn: ['application', 'domain'] },
    },
    rules: [
      {
        name: 'prevent-cross-module-internals',
        type: 'forbidden-import',
        from: { match: 'src/modules/*/**' },
        to: { match: 'src/modules/*/**' },
        except: { sameModule: true, publicApi: ['src/modules/*/index.ts'] },
        severity: 'error',
      },
      { name: 'no-cycles', type: 'no-cycles' },
      { name: 'public-api', type: 'public-api-boundary', except: { sameModule: true } },
      {
        name: 'allow-only',
        type: 'allowed-dependency',
        from: { layer: 'application' },
        allow: { layer: 'domain' },
      },
    ],
    expectations: [
      {
        name: 'everything',
        expect: { path: 'src/**/domain/entities/**/*.ts' },
        to: {
          be: ['class'],
          extend: ['BaseEntity'],
          implement: ['*RepositoryPort'],
          haveMethod: ['execute'],
          haveDecorator: ['Injectable'],
          notHaveDecorator: ['Deprecated'],
          notCall: ['console.log', 'process.exit'],
          notInstantiate: ['*Repository'],
          haveSuffix: ['Entity'],
          notHave: ['defaultExport'],
          export: { mode: 'namedOnly' },
          onlyBeUsedIn: ['src/**/application/**/*.ts'],
          notBeUsedIn: ['src/**/presentation/**/*.ts'],
          notDependOnPackages: ['express', '@nestjs/*'],
          notDependOnPaths: ['src/**/infrastructure/**/*.ts'],
        },
        ignoring: ['src/**/domain/entities/index.ts'],
        severity: 'error',
      },
      { name: 'by-layer', expect: { layer: 'domain' }, to: { notHave: ['defaultExport'] } },
    ],
    agent: {
      enabled: true,
      validationCommand: 'pnpm arch:check',
      updateDocs: ['AGENTS.md', 'CLAUDE.md'],
      markdownBlockId: 'arch-contract-agent-contract',
      instructions: ['Run pnpm arch:check after every task.'],
      afterTask: { run: ['pnpm arch:check'] },
      onFailure: { behavior: 'fix-before-finish' },
      configChangePolicy: { requireHumanApproval: true },
    },
    baseline: { path: '.arch-contract-baseline.yaml', createIfMissing: true },
    modules: { pattern: 'src/modules/*', publicApi: 'index.ts' },
    unassignedFiles: 'ignore',
  };
}

describe('configSchema — accepts well-formed configs', () => {
  it('accepts the kitchen-sink config exercising every section and verb', () => {
    expect(configSchema.safeParse(kitchenSink()).success).toBe(true);
  });

  it('accepts a minimal config', () => {
    expect(configSchema.safeParse(minimal()).success).toBe(true);
  });

  it('accepts string OR string[] for array-ish fields', () => {
    const c = minimal();
    c['paths'] = { include: 'src' };
    c['ruleset'] = { domain: { mayDependOn: 'domain' } };
    expect(configSchema.safeParse(c).success).toBe(true);
  });

  it('accepts baseline as a bare string path', () => {
    const c = minimal();
    c['baseline'] = 'baseline.yaml';
    expect(configSchema.safeParse(c).success).toBe(true);
  });
});

function firstIssuePaths(value: unknown): string[] {
  const r = configSchema.safeParse(value);
  if (r.success) return [];
  return r.error.issues.map((i) => i.path.join('.'));
}

describe('configSchema — rejects malformed configs', () => {
  it('rejects missing version', () => {
    const c = minimal();
    delete c['version'];
    expect(firstIssuePaths(c)).toContain('version');
  });

  it('rejects version !== 1', () => {
    const c = minimal();
    c['version'] = 2;
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects missing project.name', () => {
    const c = minimal();
    c['project'] = {};
    expect(firstIssuePaths(c)).toContain('project.name');
  });

  it('rejects unknown packageManager', () => {
    const c = minimal();
    c['project'] = { name: 'x', packageManager: 'rush' };
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects an empty layers array', () => {
    const c = minimal();
    c['layers'] = [];
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects a layer missing match', () => {
    const c = minimal();
    c['layers'] = [{ name: 'x' }];
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects an unknown rule.type', () => {
    const c = minimal();
    c['rules'] = [{ name: 'r', type: 'bogus' }];
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects a forbidden-import rule missing to', () => {
    const c = minimal();
    c['rules'] = [{ name: 'r', type: 'forbidden-import', from: { match: 'a' } }];
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects an expectation with BOTH path and layer', () => {
    const c = minimal();
    c['expectations'] = [{ name: 'e', expect: { path: 'a', layer: 'domain' }, to: { be: ['class'] } }];
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects an expectation with NEITHER path nor layer', () => {
    const c = minimal();
    c['expectations'] = [{ name: 'e', expect: {}, to: { be: ['class'] } }];
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects an expectation with an empty `to`', () => {
    const c = minimal();
    c['expectations'] = [{ name: 'e', expect: { layer: 'domain' }, to: {} }];
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects an invalid export.mode', () => {
    const c = minimal();
    c['expectations'] = [{ name: 'e', expect: { layer: 'domain' }, to: { export: { mode: 'all' } } }];
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects a `be` value outside the kind enum', () => {
    const c = minimal();
    c['expectations'] = [{ name: 'e', expect: { layer: 'domain' }, to: { be: ['widget'] } }];
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects an invalid severity', () => {
    const c = minimal();
    c['expectations'] = [
      { name: 'e', expect: { layer: 'domain' }, to: { be: ['class'] }, severity: 'fatal' },
    ];
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects unknown top-level keys (strict)', () => {
    const c = minimal();
    c['expectation'] = []; // typo of expectations
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('rejects an invalid agent.onFailure', () => {
    const c = minimal();
    c['agent'] = { onFailure: { behavior: 'explode' } };
    expect(configSchema.safeParse(c).success).toBe(false);
  });

  it('aggregates multiple issues in one pass', () => {
    const r = configSchema.safeParse({ project: {}, layers: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.length).toBeGreaterThan(1);
  });
});

import { describe, expect, it } from 'vitest';

import type { NormalizedConfig } from '../../src/config/model.js';
import { normalizeConfig } from '../../src/config/normalize-config.js';
import { configSchema } from '../../src/config/schema.js';
import { assignLayer, buildAnalysisContext } from '../../src/project/resolve-project.js';
import { inMemoryProject } from '../helpers/project.js';

function config(overrides: Record<string, unknown> = {}): NormalizedConfig {
  const raw = configSchema.parse({
    version: 1,
    project: { name: 'demo' },
    paths: { include: ['src'] },
    layers: [
      { name: 'domain', match: 'src/**/domain/**/*.ts' },
      { name: 'application', match: 'src/**/application/**/*.ts' },
    ],
    ...overrides,
  });
  return normalizeConfig(raw, { configPath: '/proj/arch-contract.yaml' });
}

describe('assignLayer', () => {
  it('returns the first matching layer (declaration order)', () => {
    const layers = [
      { name: 'a', match: ['src/**/*.ts'] },
      { name: 'b', match: ['src/b/**'] },
    ];
    expect(assignLayer('src/b/x.ts', layers)).toBe('a');
  });

  it('returns null when no layer matches', () => {
    expect(assignLayer('lib/x.ts', [{ name: 'a', match: ['src/**'] }])).toBeNull();
  });
});

describe('buildAnalysisContext', () => {
  const files = {
    '/proj/src/domain/User.ts': `export class User {}`,
    '/proj/src/application/CreateUser.ts': `import { User } from '../domain/User';\nexport class CreateUser { run() { return new User(); } }`,
    '/proj/src/domain/User.test.ts': `export const skip = 1;`,
  };

  it('discovers included files and excludes test files', () => {
    const ctx = buildAnalysisContext(inMemoryProject(files), config());
    const rels = ctx.files.map((f) => f.file.relPath);
    expect(rels).toContain('src/domain/User.ts');
    expect(rels).toContain('src/application/CreateUser.ts');
    expect(rels).not.toContain('src/domain/User.test.ts');
  });

  it('assigns layers per file', () => {
    const ctx = buildAnalysisContext(inMemoryProject(files), config());
    expect(ctx.layerOf('/proj/src/domain/User.ts')).toBe('domain');
    expect(ctx.layerOf('/proj/src/application/CreateUser.ts')).toBe('application');
  });

  it('assigns modules from the module pattern', () => {
    const ctx = buildAnalysisContext(
      inMemoryProject({ '/proj/src/modules/billing/svc.ts': `export class S {}` }),
      config(),
    );
    expect(ctx.moduleOf('/proj/src/modules/billing/svc.ts')).toBe('billing');
  });

  it('exposes reverse usage', () => {
    const ctx = buildAnalysisContext(inMemoryProject(files), config());
    const users = ctx.getUsersOfFile('/proj/src/domain/User.ts').map((u) => u.userFile);
    expect(users).toContain('/proj/src/application/CreateUser.ts');
  });

  it('produces a JSON-serializable index (no ts-morph nodes leak)', () => {
    const ctx = buildAnalysisContext(inMemoryProject(files), config());
    expect(() => JSON.stringify(ctx.files)).not.toThrow();
  });

  it('orders files deterministically by relative path', () => {
    const ctx = buildAnalysisContext(inMemoryProject(files), config());
    const rels = ctx.files.map((f) => f.file.relPath);
    expect([...rels]).toEqual([...rels].sort());
  });
});

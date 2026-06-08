import { describe, expect, it } from 'vitest';

import { matchesForbiddenPackage } from '../../src/rules/built-in/package-boundary.js';
import { buildGraphRules, runRules } from '../../src/rules/rule-engine.js';
import { analyze } from '../helpers/analysis.js';

describe('buildGraphRules', () => {
  it('includes layer-boundary when a ruleset is present', () => {
    const { config } = analyze({}, { ruleset: { root: { mayDependOn: [] } } });
    expect(buildGraphRules(config).map((r) => r.id)).toContain('layer-boundary');
  });

  it('maps each config rule to a rule by type', () => {
    const { config } = analyze(
      {},
      {
        rules: [
          { name: 'fi', type: 'forbidden-import', from: { match: 'a' }, to: { match: 'b' } },
          { name: 'nc', type: 'no-cycles' },
          { name: 'pa', type: 'public-api-boundary' },
        ],
      },
    );
    expect(buildGraphRules(config).map((r) => r.id)).toEqual(
      expect.arrayContaining(['fi', 'nc', 'pa']),
    );
  });

  it('adds an unassigned-file rule when the policy is not ignore', () => {
    const { config } = analyze({}, { unassignedFiles: 'error' });
    expect(buildGraphRules(config).map((r) => r.id)).toContain('unassigned-file');
  });
});

describe('runRules', () => {
  it('runs all rules and sorts violations deterministically', () => {
    const { ctx, config } = analyze(
      {
        '/proj/src/domain/User.ts': `import { Db } from '../infra/Db';\nexport const x = Db;`,
        '/proj/src/infra/Db.ts': `export class Db {}`,
      },
      {
        layers: [
          { name: 'domain', match: 'src/domain/**' },
          { name: 'infra', match: 'src/infra/**' },
        ],
        ruleset: { domain: { mayDependOn: [] }, infra: { mayDependOn: [] } },
      },
    );
    const violations = runRules(buildGraphRules(config), ctx);
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations.every((v) => v.fingerprint.length > 0)).toBe(true);
  });

  it('reports an unassigned file when the policy is error', () => {
    const { ctx, config } = analyze(
      { '/proj/src/orphan.ts': `export const x = 1;` },
      { layers: [{ name: 'domain', match: 'src/domain/**' }], unassignedFiles: 'error' },
    );
    const v = runRules(buildGraphRules(config), ctx);
    expect(v.some((x) => x.rule === 'unassigned-file' && x.file === 'src/orphan.ts')).toBe(true);
  });
});

describe('matchesForbiddenPackage', () => {
  const imp = (specifier: string, packageName: string | null) => ({
    specifier,
    targetFile: null,
    isExternalPackage: packageName !== null,
    packageName,
    importedSymbols: [],
    kinds: ['default' as const],
    isTypeOnly: false,
    line: 1,
    column: 1,
  });

  it('matches a bare package and a scoped wildcard', () => {
    expect(matchesForbiddenPackage(imp('express', 'express'), ['express'])).toBe(true);
    expect(matchesForbiddenPackage(imp('@nestjs/common', '@nestjs/common'), ['@nestjs/*'])).toBe(true);
  });

  it('matches a subpath against the bare package pattern', () => {
    expect(
      matchesForbiddenPackage(imp('@prisma/client/edge', '@prisma/client'), ['@prisma/client']),
    ).toBe(true);
  });

  it('does not match an allowed package or an intra-project import', () => {
    expect(matchesForbiddenPackage(imp('lodash', 'lodash'), ['express'])).toBe(false);
    expect(matchesForbiddenPackage(imp('./local', null), ['express'])).toBe(false);
  });
});

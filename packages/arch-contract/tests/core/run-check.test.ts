import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { runCheck } from '../../src/core/run-check.js';

const SAMPLE = fileURLToPath(new URL('../fixtures/sample-project', import.meta.url));

describe('runCheck (e2e over the sample fixture)', () => {
  it('loads config, analyzes the project and reports violations', () => {
    const { result, config, configPath } = runCheck({ cwd: SAMPLE });
    expect(config.project.name).toBe('sample-service');
    expect(configPath.endsWith('arch-contract.yaml')).toBe(true);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  it('detects the intentional layer-boundary violation', () => {
    const { result } = runCheck({ cwd: SAMPLE });
    const v = result.violations.find(
      (x) => x.rule === 'layer-boundary' && x.file === 'src/domain/Tainted.ts',
    );
    expect(v?.target).toBe('src/infrastructure/Db.ts');
  });

  it('detects the intentional framework-dependency violation', () => {
    const { result } = runCheck({ cwd: SAMPLE });
    const v = result.violations.find((x) => x.rule === 'domain-must-not-use-frameworks');
    expect(v?.file).toBe('src/domain/Tainted.ts');
    expect(v?.target).toBe('express');
  });

  it('does not flag the allowed application -> domain dependency', () => {
    const { result } = runCheck({ cwd: SAMPLE });
    const bad = result.violations.find((x) => x.file === 'src/application/CreateUser.ts');
    expect(bad).toBeUndefined();
  });

  it('summary marks the run as failed with the right error count', () => {
    const { result } = runCheck({ cwd: SAMPLE });
    expect(result.summary.passed).toBe(false);
    expect(result.summary.errors).toBeGreaterThanOrEqual(2);
    expect(result.summary.rulesEvaluated).toBeGreaterThan(0);
  });

  it('every violation carries a stable fingerprint and relative file path', () => {
    const { result } = runCheck({ cwd: SAMPLE });
    for (const v of result.violations) {
      expect(v.fingerprint.length).toBeGreaterThan(0);
      expect(v.file.startsWith('/')).toBe(false);
    }
  });
});

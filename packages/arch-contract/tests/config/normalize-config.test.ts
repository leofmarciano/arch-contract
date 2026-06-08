import { describe, expect, it } from 'vitest';

import { DEFAULT_EXCLUDES } from '../../src/config/model.js';
import { expandClauses, normalizeConfig, toSelector } from '../../src/config/normalize-config.js';
import { configSchema, type RawConfig } from '../../src/config/schema.js';

const CONFIG_PATH = '/proj/arch-contract.yaml';

function normalize(obj: Record<string, unknown>) {
  const raw = configSchema.parse(obj) as RawConfig;
  return normalizeConfig(raw, { configPath: CONFIG_PATH });
}

const base = { version: 1, project: { name: 'demo' }, layers: [{ name: 'domain', match: 'src/**' }] };

describe('normalizeConfig — defaults & coercion', () => {
  it('defaults rule.severity to error', () => {
    const c = normalize({
      ...base,
      rules: [{ name: 'r', type: 'forbidden-import', from: { match: 'a' }, to: { match: 'b' } }],
    });
    expect(c.rules[0]?.severity).toBe('error');
  });

  it('defaults expectation.severity to error and ignoring to []', () => {
    const c = normalize({
      ...base,
      expectations: [{ name: 'e', expect: { layer: 'domain' }, to: { be: ['class'] } }],
    });
    expect(c.expectations[0]?.severity).toBe('error');
    expect(c.expectations[0]?.ignoring).toEqual([]);
  });

  it('defaults include to [src] and exclude to DEFAULT_EXCLUDES when omitted', () => {
    const c = normalize(base);
    expect(c.paths.include).toEqual(['src']);
    expect(c.paths.exclude).toEqual(DEFAULT_EXCLUDES);
  });

  it('coerces a single-string match into a one-element array', () => {
    const c = normalize(base);
    expect(c.layers[0]?.match).toEqual(['src/**']);
  });

  it('defaults ruleset entry mayDependOn to [] when value is empty', () => {
    const c = normalize({ ...base, ruleset: { domain: {} } });
    expect(c.ruleset['domain']?.mayDependOn).toEqual([]);
  });

  it('defaults agent.enabled false and onFailure fix-before-finish', () => {
    const c = normalize(base);
    expect(c.agent.enabled).toBe(false);
    expect(c.agent.onFailure).toBe('fix-before-finish');
    expect(c.agent.markdownBlockId).toBe('arch-contract-agent-contract');
  });

  it('sets project.language to typescript and packageManager to pnpm by default', () => {
    const c = normalize(base);
    expect(c.project.language).toBe('typescript');
    expect(c.project.packageManager).toBe('pnpm');
  });

  it('normalizes a bare-string baseline into resolved enabled form', () => {
    const c = normalize({ ...base, baseline: 'baseline.yaml' });
    expect(c.baseline).toEqual({
      enabled: true,
      path: '/proj/baseline.yaml',
      createIfMissing: false,
    });
  });

  it('normalizes an absent baseline into disabled/null', () => {
    const c = normalize(base);
    expect(c.baseline).toEqual({ enabled: false, path: null, createIfMissing: false });
  });

  it('resolves tsconfig relative to the config directory', () => {
    const c = normalize({ ...base, project: { name: 'd', tsconfig: 'tsconfig.json' } });
    expect(c.project.tsconfig).toBe('/proj/tsconfig.json');
  });

  it('sets rootDir to the config directory and sourcePath to the file', () => {
    const c = normalize(base);
    expect(c.rootDir).toBe('/proj');
    expect(c.sourcePath).toBe('/proj/arch-contract.yaml');
  });
});

describe('toSelector & expandClauses', () => {
  it('maps expect.path to a glob selector', () => {
    expect(toSelector({ path: ['a', 'b'] })).toEqual({ kind: 'glob', patterns: ['a', 'b'] });
  });

  it('maps expect.layer to a layer selector', () => {
    expect(toSelector({ layer: 'domain' })).toEqual({ kind: 'layer', layer: 'domain' });
  });

  it('expands a multi-verb `to` into ordered clauses', () => {
    const clauses = expandClauses({ be: ['class'], extend: 'Base', haveSuffix: ['Entity'] });
    expect(clauses.map((c) => c.kind)).toEqual(['be', 'extend', 'haveSuffix']);
    const extend = clauses.find((c) => c.kind === 'extend');
    expect(extend).toEqual({ kind: 'extend', values: ['Base'] });
  });

  it('maps export verb to an export clause carrying its mode', () => {
    const clauses = expandClauses({ export: { mode: 'namedOnly' } });
    expect(clauses[0]).toEqual({ kind: 'export', mode: 'namedOnly' });
  });

  it('normalizes a forbidden-import rule from/to into selectors', () => {
    const c = normalize({
      ...base,
      rules: [
        {
          name: 'r',
          type: 'forbidden-import',
          from: { layer: 'domain' },
          to: { match: 'src/infra/**' },
          except: { sameModule: true, publicApi: 'src/modules/*/index.ts' },
        },
      ],
    });
    const rule = c.rules[0];
    expect(rule).toMatchObject({
      type: 'forbidden-import',
      from: { kind: 'layer', layer: 'domain' },
      to: { kind: 'glob', patterns: ['src/infra/**'] },
      except: { sameModule: true, publicApi: ['src/modules/*/index.ts'] },
    });
  });
});

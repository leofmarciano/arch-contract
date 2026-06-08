import { afterEach, describe, expect, it } from 'vitest';

import {
  ConfigNotFoundError,
  ConfigParseError,
  ConfigValidationError,
} from '../../src/config/errors.js';
import { loadConfigFile } from '../../src/config/load-config.js';
import { loadAndValidate, validateConfig } from '../../src/config/validate-config.js';
import { makeTmpDir, rmDir, writeFile } from '../helpers/tmp.js';

const dirs: string[] = [];
function tmp(): string {
  const d = makeTmpDir();
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) rmDir(dirs.pop() as string);
});

function source(raw: unknown) {
  return { raw, configPath: '/proj/arch-contract.yaml', text: '' };
}

const valid = {
  version: 1,
  project: { name: 'demo' },
  layers: [
    { name: 'domain', match: 'src/domain/**' },
    { name: 'app', match: 'src/app/**' },
  ],
  ruleset: { app: { mayDependOn: ['domain'] }, domain: { mayDependOn: [] } },
};

describe('validateConfig — semantic cross-references', () => {
  it('returns a NormalizedConfig for a consistent config', () => {
    const { config } = validateConfig(source(valid));
    expect(config.layers).toHaveLength(2);
  });

  it('rejects a ruleset key naming an unknown layer', () => {
    const bad = { ...valid, ruleset: { nope: { mayDependOn: [] } } };
    expect(() => validateConfig(source(bad))).toThrow(/Unknown layer "nope"/);
  });

  it('rejects ruleset.mayDependOn referencing an unknown layer', () => {
    const bad = { ...valid, ruleset: { app: { mayDependOn: ['ghost'] } } };
    expect(() => validateConfig(source(bad))).toThrow(/Unknown layer "ghost"/);
  });

  it('rejects an expectation expect.layer referencing an unknown layer', () => {
    const bad = {
      ...valid,
      expectations: [{ name: 'e', expect: { layer: 'missing' }, to: { be: ['class'] } }],
    };
    expect(() => validateConfig(source(bad))).toThrow(/Unknown layer "missing"/);
  });

  it('rejects a forbidden-import rule referencing an unknown layer', () => {
    const bad = {
      ...valid,
      rules: [
        { name: 'r', type: 'forbidden-import', from: { layer: 'ghost' }, to: { match: 'x' } },
      ],
    };
    expect(() => validateConfig(source(bad))).toThrow(/Unknown layer "ghost"/);
  });

  it('rejects duplicate layer names', () => {
    const bad = {
      ...valid,
      layers: [
        { name: 'domain', match: 'a' },
        { name: 'domain', match: 'b' },
      ],
    };
    expect(() => validateConfig(source(bad))).toThrow(/Duplicate layer name "domain"/);
  });

  it('rejects duplicate expectation names', () => {
    const bad = {
      ...valid,
      expectations: [
        { name: 'dup', expect: { layer: 'domain' }, to: { be: ['class'] } },
        { name: 'dup', expect: { layer: 'app' }, to: { be: ['class'] } },
      ],
    };
    expect(() => validateConfig(source(bad))).toThrow(/Duplicate expectation name "dup"/);
  });

  it('aggregates ALL semantic issues (does not fail fast)', () => {
    const bad = {
      ...valid,
      ruleset: { ghost1: { mayDependOn: ['ghost2'] } },
    };
    try {
      validateConfig(source(bad));
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      expect((err as ConfigValidationError).issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('loadAndValidate — end to end', () => {
  it('loads a real on-disk config and returns a NormalizedConfig with sourcePath', () => {
    const d = tmp();
    writeFile(
      d,
      'arch-contract.yaml',
      'version: 1\nproject:\n  name: demo\nlayers:\n  - name: domain\n    match: src/domain/**\n',
    );
    const { config, sourcePath } = loadAndValidate({ cwd: d });
    expect(config.project.name).toBe('demo');
    expect(sourcePath.endsWith('arch-contract.yaml')).toBe(true);
  });

  it('throws ConfigNotFoundError when nothing is found', () => {
    const d = tmp();
    writeFile(d, '.keep', '');
    expect(() => loadAndValidate({ cwd: d, walkUp: false })).toThrow(ConfigNotFoundError);
  });

  it('surfaces ConfigParseError for malformed YAML before schema runs', () => {
    const d = tmp();
    const p = writeFile(d, 'arch-contract.yaml', 'version: 1\n bad: : :\n');
    expect(() => loadConfigFile(p)).toThrow(ConfigParseError);
  });

  it('surfaces ConfigValidationError for a schema-invalid config', () => {
    const d = tmp();
    writeFile(d, 'arch-contract.yaml', 'version: 1\nlayers: []\n');
    expect(() => loadAndValidate({ cwd: d })).toThrow(ConfigValidationError);
  });
});

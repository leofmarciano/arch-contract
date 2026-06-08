import { afterEach, describe, expect, it } from 'vitest';

import { ConfigParseError } from '../../src/config/errors.js';
import { loadConfigFile } from '../../src/config/load-config.js';
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

describe('loadConfigFile', () => {
  it('parses a minimal valid document into a plain object', () => {
    const p = writeFile(tmp(), 'arch-contract.yaml', 'version: 1\nproject:\n  name: demo\n');
    const { raw } = loadConfigFile(p);
    expect(raw).toMatchObject({ version: 1, project: { name: 'demo' } });
  });

  it('preserves source text for downstream annotation', () => {
    const text = 'version: 1\n';
    const p = writeFile(tmp(), 'arch-contract.yaml', text);
    expect(loadConfigFile(p).text).toBe(text);
  });

  it('throws ConfigParseError with position on malformed YAML', () => {
    const p = writeFile(tmp(), 'arch-contract.yaml', 'version: 1\n  bad: : :\n');
    expect(() => loadConfigFile(p)).toThrow(ConfigParseError);
  });

  it('throws ConfigParseError when the root is a scalar', () => {
    const p = writeFile(tmp(), 'arch-contract.yaml', 'just a string');
    expect(() => loadConfigFile(p)).toThrow(/root must be a mapping/);
  });

  it('throws ConfigParseError when the root is a list', () => {
    const p = writeFile(tmp(), 'arch-contract.yaml', '- a\n- b\n');
    expect(() => loadConfigFile(p)).toThrow(/a list/);
  });

  it('throws ConfigParseError for an empty file', () => {
    const p = writeFile(tmp(), 'arch-contract.yaml', '');
    expect(() => loadConfigFile(p)).toThrow(/empty/);
  });

  it('throws ConfigParseError when the file cannot be read', () => {
    expect(() => loadConfigFile('/no/such/arch-contract.yaml')).toThrow(ConfigParseError);
  });
});

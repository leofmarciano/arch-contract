import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { discoverConfig } from '../../src/config/discovery.js';
import { ConfigNotFoundError } from '../../src/config/errors.js';
import { toPosix } from '../../src/project/path-utils.js';
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

describe('discoverConfig — filename precedence', () => {
  it('returns arch-contract.yaml when all four candidates exist (precedence #1)', () => {
    const d = tmp();
    for (const f of ['arch-contract.yaml', 'architecture.yaml', '.arch-contract.yaml', 'arch-contract.config.yaml']) {
      writeFile(d, f, 'version: 1');
    }
    expect(discoverConfig({ cwd: d }).configPath).toBe(toPosix(path.join(d, 'arch-contract.yaml')));
  });

  it('falls through to architecture.yaml when arch-contract.yaml is absent', () => {
    const d = tmp();
    writeFile(d, 'architecture.yaml', 'version: 1');
    writeFile(d, '.arch-contract.yaml', 'version: 1');
    expect(discoverConfig({ cwd: d }).configPath).toBe(toPosix(path.join(d, 'architecture.yaml')));
  });

  it('falls through to .arch-contract.yaml', () => {
    const d = tmp();
    writeFile(d, '.arch-contract.yaml', 'version: 1');
    writeFile(d, 'arch-contract.config.yaml', 'version: 1');
    expect(discoverConfig({ cwd: d }).configPath).toBe(toPosix(path.join(d, '.arch-contract.yaml')));
  });

  it('falls through to arch-contract.config.yaml (precedence #4)', () => {
    const d = tmp();
    writeFile(d, 'arch-contract.config.yaml', 'version: 1');
    expect(discoverConfig({ cwd: d }).configPath).toBe(
      toPosix(path.join(d, 'arch-contract.config.yaml')),
    );
  });
});

describe('discoverConfig — directory walking', () => {
  it('per-directory precedence: a lower-precedence file in cwd beats a higher-precedence file in a parent', () => {
    const root = tmp();
    writeFile(root, 'arch-contract.yaml', 'version: 1');
    const child = path.join(root, 'packages', 'app');
    writeFile(child, 'architecture.yaml', 'version: 1');
    expect(discoverConfig({ cwd: child }).configPath).toBe(
      toPosix(path.join(child, 'architecture.yaml')),
    );
  });

  it('walks up parent directories when walkUp is true', () => {
    const root = tmp();
    writeFile(root, 'arch-contract.yaml', 'version: 1');
    const child = path.join(root, 'a', 'b', 'c');
    writeFile(child, '.keep', '');
    expect(discoverConfig({ cwd: child, walkUp: true }).configPath).toBe(
      toPosix(path.join(root, 'arch-contract.yaml')),
    );
  });

  it('does NOT walk up when walkUp is false (throws ConfigNotFoundError)', () => {
    const root = tmp();
    writeFile(root, 'arch-contract.yaml', 'version: 1');
    const child = path.join(root, 'nested');
    writeFile(child, '.keep', '');
    expect(() => discoverConfig({ cwd: child, walkUp: false })).toThrow(ConfigNotFoundError);
  });

  it('stops walking at stopAt boundary', () => {
    const root = tmp();
    writeFile(root, 'arch-contract.yaml', 'version: 1');
    const mid = path.join(root, 'mid');
    const leaf = path.join(mid, 'leaf');
    writeFile(leaf, '.keep', '');
    expect(() => discoverConfig({ cwd: leaf, stopAt: mid })).toThrow(ConfigNotFoundError);
  });
});

describe('discoverConfig — explicit path and errors', () => {
  it('explicitPath bypasses discovery and returns that exact path', () => {
    const d = tmp();
    const p = writeFile(d, 'custom/my-arch.yaml', 'version: 1');
    expect(discoverConfig({ cwd: d, explicitPath: 'custom/my-arch.yaml' }).configPath).toBe(
      toPosix(p),
    );
  });

  it('explicitPath that does not exist throws (no silent fallthrough)', () => {
    const d = tmp();
    writeFile(d, 'arch-contract.yaml', 'version: 1');
    expect(() => discoverConfig({ cwd: d, explicitPath: 'nope.yaml' })).toThrow(ConfigNotFoundError);
  });

  it('ConfigNotFoundError.searched lists probed paths', () => {
    const d = tmp();
    writeFile(d, '.keep', '');
    try {
      discoverConfig({ cwd: d, walkUp: false });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigNotFoundError);
      const searched = (err as ConfigNotFoundError).searched;
      expect(searched).toContain(toPosix(path.join(d, 'arch-contract.yaml')));
      expect(searched).toContain(toPosix(path.join(d, 'arch-contract.config.yaml')));
    }
  });

  it('ConfigNotFoundError.message is condensed (no 16-line path dump) with an init hint', () => {
    // Simulate a deep walk-up: 4 filenames probed across 4 directories = 16 paths.
    const searched = ['/a/b/c', '/a/b', '/a', '/'].flatMap((dir) =>
      ['arch-contract.yaml', 'architecture.yaml', '.arch-contract.yaml', 'arch-contract.config.yaml'].map(
        (f) => toPosix(path.join(dir, f)),
      ),
    );
    const msg = new ConfigNotFoundError(searched).message;
    expect(msg).toContain('arch-contract init');
    expect(msg).toContain('arch-contract.yaml');
    expect(msg).toContain(String(searched.length)); // "16"
    // condensed: it must NOT print one line per probed path
    expect(msg.split('\n').length).toBeLessThan(searched.length);
  });
});

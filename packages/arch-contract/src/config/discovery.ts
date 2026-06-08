import fs from 'node:fs';
import path from 'node:path';

import { resolvePosix, toPosix } from '../project/path-utils.js';
import { ConfigNotFoundError } from './errors.js';

/** Candidate config filenames, in precedence order (first found wins per directory). */
export const CONFIG_FILENAMES = [
  'arch-contract.yaml',
  'architecture.yaml',
  '.arch-contract.yaml',
  'arch-contract.config.yaml',
] as const;

export interface DiscoveryOptions {
  cwd?: string;
  /** explicit path (from `--config`); bypasses discovery entirely */
  explicitPath?: string;
  /** walk up parent directories when no candidate exists in cwd (default true) */
  walkUp?: boolean;
  /** stop walking at this directory (inclusive). Defaults to filesystem root. */
  stopAt?: string;
}

export interface DiscoveryResult {
  /** absolute POSIX path of the config file */
  configPath: string;
  /** absolute POSIX directory containing it */
  dir: string;
}

function existsFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

export function discoverConfig(opts: DiscoveryOptions = {}): DiscoveryResult {
  const cwd = resolvePosix(opts.cwd ?? process.cwd());
  const walkUp = opts.walkUp ?? true;
  const searched: string[] = [];

  if (opts.explicitPath !== undefined) {
    const configPath = resolvePosix(cwd, opts.explicitPath);
    searched.push(configPath);
    if (existsFile(configPath)) {
      return { configPath, dir: toPosix(path.dirname(configPath)) };
    }
    throw new ConfigNotFoundError(searched);
  }

  const stopAt = opts.stopAt !== undefined ? resolvePosix(opts.stopAt) : undefined;
  let dir = cwd;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = toPosix(path.join(dir, filename));
      searched.push(candidate);
      if (existsFile(candidate)) {
        return { configPath: candidate, dir };
      }
    }
    if (!walkUp) break;
    if (stopAt !== undefined && dir === stopAt) break;
    const parent = toPosix(path.dirname(dir));
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  throw new ConfigNotFoundError(searched);
}

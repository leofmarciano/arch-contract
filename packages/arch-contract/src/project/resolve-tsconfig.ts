import path from 'node:path';

import { ts } from 'ts-morph';

import { toPosix } from './path-utils.js';

export interface ResolvedTsConfig {
  /** absolute POSIX baseUrl, or null */
  baseUrl: string | null;
  paths: Record<string, string[]>;
  compilerOptions: ts.CompilerOptions;
}

/** Read a tsconfig and extract resolved compilerOptions (baseUrl/paths/extends-aware). */
export function resolveTsConfig(tsConfigPath: string): ResolvedTsConfig {
  const read = ts.readConfigFile(tsConfigPath, (p) => ts.sys.readFile(p));
  const dir = path.dirname(tsConfigPath);
  const parsed = ts.parseJsonConfigFileContent(read.config ?? {}, ts.sys, dir);
  const options = parsed.options;
  return {
    baseUrl: options.baseUrl !== undefined ? toPosix(options.baseUrl) : null,
    paths: (options.paths ?? {}) as Record<string, string[]>,
    compilerOptions: options,
  };
}

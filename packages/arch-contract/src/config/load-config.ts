import fs from 'node:fs';

import { parse as parseYaml, YAMLParseError } from 'yaml';

import { toPosix } from '../project/path-utils.js';
import { ConfigParseError } from './errors.js';

export interface LoadedConfigSource {
  /** the raw, untyped YAML document */
  raw: unknown;
  /** absolute POSIX path of the config file */
  configPath: string;
  /** original file text, for error annotation */
  text: string;
}

/** Read + YAML-parse a config file, guarding that the root is a mapping. */
export function loadConfigFile(configPath: string): LoadedConfigSource {
  const posixPath = toPosix(configPath);
  let text: string;
  try {
    text = fs.readFileSync(configPath, 'utf8');
  } catch (err) {
    throw new ConfigParseError(posixPath, `Cannot read config file: ${(err as Error).message}`);
  }

  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (err) {
    if (err instanceof YAMLParseError) {
      const pos = err.linePos?.[0];
      throw new ConfigParseError(posixPath, err.message, pos?.line, pos?.col);
    }
    throw new ConfigParseError(posixPath, (err as Error).message);
  }

  if (raw === null || raw === undefined) {
    throw new ConfigParseError(posixPath, 'Config file is empty.');
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ConfigParseError(
      posixPath,
      `Config root must be a mapping, got ${Array.isArray(raw) ? 'a list' : typeof raw}.`,
    );
  }

  return { raw, configPath: posixPath, text };
}

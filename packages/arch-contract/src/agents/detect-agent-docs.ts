import fs from 'node:fs';
import path from 'node:path';

import picomatch from 'picomatch';

import type { NormalizedAgent } from '../config/model.js';
import { relativePosix, toPosix } from '../project/path-utils.js';

export const DEFAULT_AGENT_DOC_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  'CODEX.md',
  'CURSOR.md',
  'WINDSURF.md',
] as const;

function hasGlob(p: string): boolean {
  return /[*?{}[\]()!+@]/.test(p);
}

function listMarkdown(rootDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
        walk(abs);
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
        out.push(toPosix(abs));
      }
    }
  };
  walk(rootDir);
  return out;
}

/**
 * Resolve the markdown files to sync. Literal filenames in `updateDocs` are
 * always targeted (created if missing); glob patterns match existing files.
 * Result is absolute POSIX, de-duplicated, deterministic.
 */
export function resolveAgentDocTargets(rootDir: string, agent: NormalizedAgent): string[] {
  const targets = new Set<string>();
  const literals = agent.updateDocs.filter((p) => !hasGlob(p));
  const globs = agent.updateDocs.filter(hasGlob);

  for (const lit of literals) {
    targets.add(toPosix(path.resolve(rootDir, lit)));
  }

  if (globs.length > 0) {
    const isMatch = picomatch(globs, { dot: true });
    for (const abs of listMarkdown(rootDir)) {
      if (isMatch(relativePosix(rootDir, abs))) targets.add(abs);
    }
  }

  return [...targets].sort();
}

import fs from 'node:fs';

import type { NormalizedAgent } from '../config/model.js';
import { resolveAgentDocTargets } from './detect-agent-docs.js';
import { buildInstructions, upsertBlock } from './instruction-block.js';

export interface SyncResultEntry {
  path: string;
  changed: boolean;
}

export interface SyncResult {
  results: SyncResultEntry[];
  drift: boolean;
}

/**
 * Insert/update the controlled block in every target doc. In `check` mode no
 * file is written; `drift` reports whether any file is out of date.
 */
export function syncAgentDocs(
  rootDir: string,
  agent: NormalizedAgent,
  opts: { check?: boolean } = {},
): SyncResult {
  const body = buildInstructions(agent);
  const targets = resolveAgentDocTargets(rootDir, agent);
  const results: SyncResultEntry[] = [];

  for (const file of targets) {
    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      content = '';
    }
    const { next, changed } = upsertBlock(content, agent.markdownBlockId, body);
    if (changed && opts.check !== true) {
      fs.writeFileSync(file, next, 'utf8');
    }
    results.push({ path: file, changed });
  }

  return { results, drift: results.some((r) => r.changed) };
}

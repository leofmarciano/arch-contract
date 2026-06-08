import fs from 'node:fs';

import type { NormalizedAgent, NormalizedConfig } from '../config/model.js';
import { DEFAULT_ARCHITECTURE_BLOCK_ID } from '../config/model.js';
import { buildArchitectureGuide } from './architecture-guide.js';
import {
  DEFAULT_AGENT_DOC_FILES,
  resolveAgentDocTargets,
  resolveDocTargets,
} from './detect-agent-docs.js';
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
 * Insert/update one controlled block (`blockId`) in every target file. In
 * `check` mode nothing is written; `drift` reports whether any file is stale.
 * The block is matched by its markers, so distinct ids coexist in one file.
 */
function syncBlockToTargets(
  targets: string[],
  blockId: string,
  body: string,
  opts: { check?: boolean },
): SyncResult {
  const results: SyncResultEntry[] = [];
  for (const file of targets) {
    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      content = '';
    }
    const { next, changed } = upsertBlock(content, blockId, body);
    if (changed && opts.check !== true) {
      fs.writeFileSync(file, next, 'utf8');
    }
    results.push({ path: file, changed });
  }
  return { results, drift: results.some((r) => r.changed) };
}

/**
 * Insert/update the agent-contract block (validation command + instructions) in
 * every doc configured via `agent.updateDocs`.
 */
export function syncAgentDocs(
  rootDir: string,
  agent: NormalizedAgent,
  opts: { check?: boolean } = {},
): SyncResult {
  const targets = resolveAgentDocTargets(rootDir, agent);
  return syncBlockToTargets(targets, agent.markdownBlockId, buildInstructions(agent), opts);
}

/**
 * Insert/update the generated architecture-rules block in the known agent docs
 * (the full default set, plus any extra files/globs in `agent.updateDocs`).
 * Missing literal files are created unless `onlyExisting` is set.
 */
export function syncArchitectureGuide(
  rootDir: string,
  config: NormalizedConfig,
  opts: { check?: boolean; onlyExisting?: boolean } = {},
): SyncResult {
  const docs = [...new Set([...DEFAULT_AGENT_DOC_FILES, ...config.agent.updateDocs])];
  const targets = resolveDocTargets(rootDir, docs, {
    ...(opts.onlyExisting !== undefined ? { onlyExisting: opts.onlyExisting } : {}),
  });
  const body = buildArchitectureGuide(config);
  return syncBlockToTargets(targets, DEFAULT_ARCHITECTURE_BLOCK_ID, body, {
    ...(opts.check !== undefined ? { check: opts.check } : {}),
  });
}

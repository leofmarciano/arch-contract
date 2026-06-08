import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { hasBlock } from '../../src/agents/instruction-block.js';
import { syncAgentDocs } from '../../src/agents/update-agent-docs.js';
import { syncArchitectureGuide } from '../../src/agents/update-agent-docs.js';
import { loadAndValidate } from '../../src/config/index.js';
import { DEFAULT_ARCHITECTURE_BLOCK_ID } from '../../src/config/model.js';
import { makeTmpDir, rmDir, writeFile } from '../helpers/tmp.js';

const YAML = `version: 1
project:
  name: t
layers:
  - name: domain
    match: src/**/*.ts
agent:
  enabled: true
  validationCommand: pnpm arch:check
  updateDocs:
    - AGENTS.md
`;

const dirs: string[] = [];
function projectDir(): string {
  const d = makeTmpDir();
  dirs.push(d);
  writeFile(d, 'arch-contract.yaml', YAML);
  return d;
}
function config(d: string) {
  return loadAndValidate({ cwd: d }).config;
}
afterEach(() => {
  while (dirs.length) rmDir(dirs.pop() as string);
});

describe('syncArchitectureGuide', () => {
  it('creates the broadened set of known agent docs', () => {
    const d = projectDir();
    const { drift } = syncArchitectureGuide(d, config(d));
    expect(drift).toBe(true);
    for (const name of ['AGENTS.md', 'CLAUDE.md', 'CURSOR.md', 'GEMINI.md']) {
      const content = fs.readFileSync(path.join(d, name), 'utf8');
      expect(hasBlock(content, DEFAULT_ARCHITECTURE_BLOCK_ID)).toBe(true);
    }
  });

  it('is idempotent on a second run', () => {
    const d = projectDir();
    syncArchitectureGuide(d, config(d));
    expect(syncArchitectureGuide(d, config(d)).drift).toBe(false);
  });

  it('check mode reports drift without writing', () => {
    const d = projectDir();
    const { drift } = syncArchitectureGuide(d, config(d), { check: true });
    expect(drift).toBe(true);
    expect(fs.existsSync(path.join(d, 'AGENTS.md'))).toBe(false);
  });

  it('onlyExisting skips files that do not exist yet', () => {
    const d = projectDir();
    writeFile(d, 'CLAUDE.md', '# project\n');
    const { results } = syncArchitectureGuide(d, config(d), { onlyExisting: true });
    expect(results.map((r) => path.basename(r.path))).toEqual(['CLAUDE.md']);
    expect(fs.existsSync(path.join(d, 'AGENTS.md'))).toBe(false);
  });

  it('coexists with the sync-agent-docs block in the same file', () => {
    const d = projectDir();
    const cfg = config(d);
    syncAgentDocs(d, cfg.agent);
    syncArchitectureGuide(d, cfg);
    const content = fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8');
    expect(hasBlock(content, cfg.agent.markdownBlockId)).toBe(true);
    expect(hasBlock(content, DEFAULT_ARCHITECTURE_BLOCK_ID)).toBe(true);
  });
});

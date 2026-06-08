import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { NormalizedAgent } from '../../src/config/model.js';
import { resolveAgentDocTargets } from '../../src/agents/detect-agent-docs.js';
import { syncAgentDocs } from '../../src/agents/update-agent-docs.js';
import { hasBlock } from '../../src/agents/instruction-block.js';
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

function agent(updateDocs: string[]): NormalizedAgent {
  return {
    enabled: true,
    validationCommand: 'pnpm arch:check',
    updateDocs,
    markdownBlockId: 'arch-contract-agent-contract',
    instructions: ['Run it.'],
    afterTask: [],
    onFailure: 'fix-before-finish',
    configChangePolicy: { requireHumanApproval: true },
  };
}

describe('resolveAgentDocTargets', () => {
  it('always targets literal filenames (even if missing) and de-duplicates', () => {
    const d = tmp();
    const targets = resolveAgentDocTargets(d, agent(['AGENTS.md', 'CLAUDE.md']));
    expect(targets).toEqual([
      toPosix(path.join(d, 'AGENTS.md')),
      toPosix(path.join(d, 'CLAUDE.md')),
    ]);
  });

  it('matches existing files for glob patterns', () => {
    const d = tmp();
    writeFile(d, 'docs/CONTRIBUTING.md', '# c');
    writeFile(d, 'README.md', '# r');
    const targets = resolveAgentDocTargets(d, agent(['**/*.md']));
    expect(targets).toContain(toPosix(path.join(d, 'docs/CONTRIBUTING.md')));
    expect(targets).toContain(toPosix(path.join(d, 'README.md')));
  });
});

describe('syncAgentDocs', () => {
  it('creates and updates the controlled block in each target', () => {
    const d = tmp();
    const { results, drift } = syncAgentDocs(d, agent(['AGENTS.md']));
    expect(drift).toBe(true);
    expect(results[0]?.changed).toBe(true);
    const content = fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8');
    expect(hasBlock(content, 'arch-contract-agent-contract')).toBe(true);
  });

  it('is idempotent on a second run (no drift)', () => {
    const d = tmp();
    syncAgentDocs(d, agent(['AGENTS.md']));
    expect(syncAgentDocs(d, agent(['AGENTS.md'])).drift).toBe(false);
  });

  it('check mode reports drift without writing', () => {
    const d = tmp();
    const { drift } = syncAgentDocs(d, agent(['AGENTS.md']), { check: true });
    expect(drift).toBe(true);
    expect(fs.existsSync(path.join(d, 'AGENTS.md'))).toBe(false);
  });

  it('preserves pre-existing markdown content', () => {
    const d = tmp();
    writeFile(d, 'AGENTS.md', '# My agents\n\nKeep this.\n');
    syncAgentDocs(d, agent(['AGENTS.md']));
    const content = fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8');
    expect(content).toContain('# My agents');
    expect(content).toContain('Keep this.');
  });
});

import { describe, expect, it } from 'vitest';

import type { NormalizedAgent } from '../../src/config/model.js';
import {
  buildInstructions,
  hasBlock,
  makeMarkers,
  upsertBlock,
} from '../../src/agents/instruction-block.js';

const ID = 'arch-contract-agent-contract';

const agent: NormalizedAgent = {
  enabled: true,
  validationCommand: 'pnpm arch:check',
  updateDocs: ['AGENTS.md'],
  markdownBlockId: ID,
  instructions: ['Run pnpm arch:check after every task.'],
  afterTask: [],
  onFailure: 'fix-before-finish',
  configChangePolicy: { requireHumanApproval: true },
};

describe('buildInstructions', () => {
  it('embeds the validation command and instructions deterministically', () => {
    const body = buildInstructions(agent);
    expect(body).toContain('pnpm arch:check');
    expect(body).toContain('Run pnpm arch:check after every task.');
    expect(buildInstructions(agent)).toBe(body);
  });
});

describe('upsertBlock', () => {
  it('inserts a block when absent and reports changed', () => {
    const { next, changed } = upsertBlock('# Docs\n', ID, 'BODY');
    expect(changed).toBe(true);
    expect(next).toContain(makeMarkers(ID).start);
    expect(next).toContain(makeMarkers(ID).end);
    expect(next.startsWith('# Docs')).toBe(true);
  });

  it('replaces an existing block in place without duplicating markers', () => {
    const first = upsertBlock('# Docs\n', ID, 'OLD').next;
    const second = upsertBlock(first, ID, 'NEW').next;
    expect(second).toContain('NEW');
    expect(second).not.toContain('OLD');
    expect(second.match(/:start -->/g)?.length).toBe(1);
  });

  it('is idempotent for an unchanged body', () => {
    const first = upsertBlock('# Docs\n', ID, 'BODY').next;
    expect(upsertBlock(first, ID, 'BODY').changed).toBe(false);
  });

  it('preserves content outside the markers', () => {
    const content = '# Top\n\n<!-- keep me -->\n';
    const next = upsertBlock(content, ID, 'BODY').next;
    expect(next).toContain('# Top');
    expect(next).toContain('<!-- keep me -->');
  });

  it('hasBlock detects an existing block', () => {
    const next = upsertBlock('', ID, 'BODY').next;
    expect(hasBlock(next, ID)).toBe(true);
    expect(hasBlock('# nothing', ID)).toBe(false);
  });
});

import type { NormalizedAgent } from '../config/model.js';

export function makeMarkers(id: string): { start: string; end: string } {
  return { start: `<!-- ${id}:start -->`, end: `<!-- ${id}:end -->` };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build the controlled-block body from the agent config (deterministic). */
export function buildInstructions(agent: NormalizedAgent): string {
  const lines: string[] = [
    '## Architecture Validation',
    '',
    'After every implementation task, run:',
    '',
    '```bash',
    agent.validationCommand,
    '```',
    '',
    'You must not finish a task while architecture violations are present.',
  ];
  if (agent.instructions.length > 0) {
    lines.push('', 'Rules:');
    for (const i of agent.instructions) lines.push(`- ${i}`);
  }
  return lines.join('\n');
}

export function hasBlock(content: string, id: string): boolean {
  const { start, end } = makeMarkers(id);
  const re = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  return re.test(content);
}

/**
 * Insert or replace the controlled block, never duplicating it. Returns the new
 * content and whether it changed (idempotent for an already-current block).
 */
export function upsertBlock(
  content: string,
  id: string,
  body: string,
): { next: string; changed: boolean } {
  const { start, end } = makeMarkers(id);
  const block = `${start}\n\n${body}\n\n${end}`;
  const re = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  if (re.test(content)) {
    const next = content.replace(re, block);
    return { next, changed: next !== content };
  }
  const sep = content.length === 0 ? '' : content.endsWith('\n') ? '\n' : '\n\n';
  const next = `${content}${sep}${block}\n`;
  return { next, changed: true };
}

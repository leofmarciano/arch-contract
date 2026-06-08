import type { Violation } from '../../src/core/types.js';
import { validateConfig } from '../../src/config/validate-config.js';
import { buildAnalysisContext } from '../../src/project/resolve-project.js';
import { createRuleContext } from '../../src/rules/rule-context.js';
import { buildRules, runRules } from '../../src/rules/rule-engine.js';
import { inMemoryProject } from './project.js';

/** Resolve a preset, analyze an in-memory project, and return all violations. */
export function runPreset(
  name: string,
  files: Record<string, string>,
  extra: Record<string, unknown> = {},
): Violation[] {
  const { config } = validateConfig({
    raw: { version: 1, project: { name: 'demo' }, presets: [name], ...extra },
    configPath: '/proj/arch-contract.yaml',
    text: '',
  });
  const analysis = buildAnalysisContext(inMemoryProject(files), config);
  const ctx = createRuleContext(config, analysis);
  return runRules(buildRules(config), ctx);
}

export const errorsOf = (violations: Violation[]): Violation[] =>
  violations.filter((v) => v.severity === 'error');

export const ruleNames = (violations: Violation[]): string[] => violations.map((v) => v.rule);

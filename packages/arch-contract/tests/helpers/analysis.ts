import type { NormalizedConfig } from '../../src/config/model.js';
import type { AnalysisContext, Violation } from '../../src/core/types.js';
import { normalizeConfig } from '../../src/config/normalize-config.js';
import { configSchema } from '../../src/config/schema.js';
import { buildAnalysisContext } from '../../src/project/resolve-project.js';
import { createRuleContext, type RuleContext } from '../../src/rules/rule-context.js';
import { expectationRule } from '../../src/rules/rule-engine.js';
import { inMemoryProject } from './project.js';

export interface Analyzed {
  config: NormalizedConfig;
  analysis: AnalysisContext;
  ctx: RuleContext;
}

export function buildConfig(overrides: Record<string, unknown> = {}): NormalizedConfig {
  const raw = configSchema.parse({
    version: 1,
    project: { name: 'demo' },
    paths: { include: ['src'] },
    layers: [{ name: 'root', match: 'src/**/*.ts' }],
    ...overrides,
  });
  return normalizeConfig(raw, { configPath: '/proj/arch-contract.yaml' });
}

export function analyze(files: Record<string, string>, overrides: Record<string, unknown> = {}): Analyzed {
  const config = buildConfig(overrides);
  const analysis = buildAnalysisContext(inMemoryProject(files), config);
  return { config, analysis, ctx: createRuleContext(config, analysis) };
}

const ALL_LAYER = [{ name: 'root', match: 'src/**/*.ts' }];

/** Build a config with a single expectation and evaluate it against the fixtures. */
export function runExpectation(
  files: Record<string, string>,
  expectation: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Violation[] {
  const { ctx, config } = analyze(files, {
    layers: ALL_LAYER,
    expectations: [expectation],
    ...extra,
  });
  const exp = config.expectations[0];
  if (!exp) throw new Error('expectation did not normalize');
  return expectationRule(exp).check(ctx);
}

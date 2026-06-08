import type { DiscoveryOptions } from '../config/discovery.js';
import type { NormalizedConfig } from '../config/model.js';
import { loadAndValidate } from '../config/validate-config.js';
import { analyzeProject } from '../project/resolve-project.js';
import { createRuleContext } from '../rules/rule-context.js';
import { buildRules, runRules } from '../rules/rule-engine.js';
import type { CheckResult, Summary, Violation } from './types.js';

export function computeSummary(violations: Violation[], rulesEvaluated: number): Summary {
  let errors = 0;
  let warnings = 0;
  for (const v of violations) {
    if (v.severity === 'error') errors++;
    else warnings++;
  }
  return { errors, warnings, ignored: 0, rulesEvaluated, passed: errors === 0 };
}

export interface RunCheckOptions {
  /** explicit config path (`--config`) */
  config?: string;
  /** working directory for discovery */
  cwd?: string;
}

export interface RunCheckResult {
  result: CheckResult;
  config: NormalizedConfig;
  configPath: string;
}

/**
 * The end-to-end pipeline: load+validate config -> analyze the project ->
 * build & run every rule (graph + AST/usage) -> summarize into a CheckResult.
 * Baseline suppression is applied by the caller (CLI), not here.
 */
export function runCheck(opts: RunCheckOptions = {}): RunCheckResult {
  const discovery: DiscoveryOptions = {};
  if (opts.cwd !== undefined) discovery.cwd = opts.cwd;
  if (opts.config !== undefined) discovery.explicitPath = opts.config;

  const { config, sourcePath } = loadAndValidate(discovery);
  const analysis = analyzeProject(config);
  const ctx = createRuleContext(config, analysis);
  const rules = buildRules(config);
  const violations = runRules(rules, ctx);

  return {
    result: { summary: computeSummary(violations, rules.length), violations },
    config,
    configPath: sourcePath,
  };
}

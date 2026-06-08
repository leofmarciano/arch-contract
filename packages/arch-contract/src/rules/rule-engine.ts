import type { Clause, NormalizedConfig, NormalizedExpectation } from '../config/model.js';
import type { FileFacts, Violation } from '../core/types.js';
import { allowedDependencyRule } from './built-in/allowed-dependency.js';
import { evalClassClause } from './built-in/class-expectations.js';
import { evalNamingClause } from './built-in/file-naming.js';
import { forbiddenImportRule } from './built-in/forbidden-import.js';
import { layerBoundaryRule } from './built-in/layer-boundary.js';
import { noCyclesRule } from './built-in/no-cycles.js';
import { publicApiBoundaryRule } from './built-in/public-api-boundary.js';
import { evalUsageClause } from './built-in/usage-expectations.js';
import type { Rule, RuleContext } from './rule-context.js';
import { createViolation, sortViolations } from './violations.js';

const USAGE_KINDS = new Set<Clause['kind']>([
  'onlyBeUsedIn',
  'notBeUsedIn',
  'notDependOnPackages',
  'notDependOnPaths',
]);
const NAMING_KINDS = new Set<Clause['kind']>(['haveSuffix']);

function unassignedFilesRule(): Rule {
  return {
    id: 'unassigned-file',
    check(ctx) {
      if (ctx.config.unassignedFiles === 'ignore') return [];
      const severity = ctx.config.unassignedFiles === 'error' ? 'error' : 'warning';
      return ctx.analysis.files
        .filter((f) => f.file.layer === null)
        .map((f) =>
          createViolation({
            rule: 'unassigned-file',
            severity,
            file: f.file.relPath,
            message: `File "${f.file.relPath}" is not assigned to any layer.`,
            suggestion:
              'Add a layer whose match globs cover this file, or exclude it via paths.exclude.',
          }),
        );
    },
  };
}

/** Build the graph-level rules from config (layer-boundary is always-on when a ruleset exists). */
export function buildGraphRules(config: NormalizedConfig): Rule[] {
  const rules: Rule[] = [];
  if (Object.keys(config.ruleset).length > 0) rules.push(layerBoundaryRule());
  if (config.unassignedFiles !== 'ignore') rules.push(unassignedFilesRule());
  for (const r of config.rules) {
    switch (r.type) {
      case 'forbidden-import':
        rules.push(forbiddenImportRule(r));
        break;
      case 'allowed-dependency':
        rules.push(allowedDependencyRule(r));
        break;
      case 'no-cycles':
        rules.push(noCyclesRule(r));
        break;
      case 'public-api-boundary':
        rules.push(publicApiBoundaryRule(r));
        break;
      default:
        throw new Error(`Unknown rule type: ${(r as { type: string }).type}`);
    }
  }
  return rules;
}

/** Wrap a normalized expectation as a Rule: select files (minus `ignoring`), run each clause. */
export function expectationRule(exp: NormalizedExpectation): Rule {
  return {
    id: exp.name,
    check(ctx: RuleContext) {
      const files: FileFacts[] = ctx.analysis.files.filter((f) => {
        if (!ctx.matchesSelector(f.file.path, exp.selector)) return false;
        if (exp.ignoring.length > 0 && ctx.matchPath(f.file.relPath, exp.ignoring)) return false;
        return true;
      });
      const out: Violation[] = [];
      for (const clause of exp.clauses) {
        if (USAGE_KINDS.has(clause.kind)) {
          out.push(...evalUsageClause(ctx, exp, clause, files));
        } else if (NAMING_KINDS.has(clause.kind)) {
          out.push(...evalNamingClause(exp, clause, files));
        } else {
          out.push(...evalClassClause(exp, clause, files));
        }
      }
      return out;
    },
  };
}

export function buildExpectationRules(config: NormalizedConfig): Rule[] {
  return config.expectations.map(expectationRule);
}

/** All rules for a config: graph rules + AST/usage expectations. */
export function buildRules(config: NormalizedConfig): Rule[] {
  return [...buildGraphRules(config), ...buildExpectationRules(config)];
}

export function runRules(rules: Rule[], ctx: RuleContext): Violation[] {
  const out: Violation[] = [];
  for (const rule of rules) out.push(...rule.check(ctx));
  return sortViolations(out);
}

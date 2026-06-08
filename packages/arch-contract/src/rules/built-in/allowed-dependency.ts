import type { AllowedDependencyRule } from '../../config/model.js';
import { createViolation } from '../violations.js';
import { importMatchesSelector, importTargetLabel } from './import-matching.js';
import type { Rule, RuleContext } from '../rule-context.js';

/**
 * Whitelist form: for files matching `from`, every intra-project import target
 * MUST match `allow`; any intra-project target not allowed is a violation.
 * External imports are not constrained by this rule.
 */
export function allowedDependencyRule(cfg: AllowedDependencyRule): Rule {
  return {
    id: cfg.name,
    check(ctx: RuleContext) {
      const violations = [];
      for (const f of ctx.analysis.files) {
        if (!ctx.matchesSelector(f.file.path, cfg.from)) continue;
        for (const imp of f.imports) {
          if (imp.targetFile === null) continue; // externals unconstrained
          if (importMatchesSelector(ctx, imp, cfg.allow)) continue;
          const target = importTargetLabel(ctx, imp);
          violations.push(
            createViolation({
              rule: cfg.name,
              severity: cfg.severity,
              file: f.file.relPath,
              line: imp.line,
              column: imp.column,
              target,
              message: `Dependency not allowed: "${f.file.relPath}" may only import the allowed set, not "${target}".`,
            }),
          );
        }
      }
      return violations;
    },
  };
}

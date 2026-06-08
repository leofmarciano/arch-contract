import type { PublicApiBoundaryRule } from '../../config/model.js';
import { publicApiPathOf } from '../../graph/module-boundary.js';
import { createViolation } from '../violations.js';
import type { Rule, RuleContext } from '../rule-context.js';

/**
 * Cross-module intra-project imports must target the importee module's
 * public-api/barrel file; deep imports into another module are violations.
 * Same-module imports are always allowed.
 */
export function publicApiBoundaryRule(cfg: PublicApiBoundaryRule): Rule {
  return {
    id: cfg.name,
    check(ctx: RuleContext) {
      const { pattern, publicApi } = ctx.config.modules;
      const violations = [];
      for (const f of ctx.analysis.files) {
        const fromModule = ctx.moduleOf(f.file.path);
        for (const imp of f.imports) {
          if (imp.targetFile === null) continue;
          const toModule = ctx.moduleOf(imp.targetFile);
          if (toModule === null) continue;
          if (fromModule === toModule) continue; // same module always allowed
          if (ctx.isPublicApiFile(imp.targetFile)) continue; // importing the barrel is fine

          const targetRel = ctx.rel(imp.targetFile);
          const barrel = publicApiPathOf(targetRel, pattern, publicApi);
          violations.push(
            createViolation({
              rule: cfg.name,
              severity: cfg.severity,
              file: f.file.relPath,
              line: imp.line,
              column: imp.column,
              target: targetRel,
              message: `Cross-module deep import: "${f.file.relPath}" must import module "${toModule}" through its public API, not "${targetRel}".`,
              ...(barrel !== null ? { suggestion: `Import from "${barrel}" instead.` } : {}),
            }),
          );
        }
      }
      return violations;
    },
  };
}

import { createViolation } from '../violations.js';
import type { Rule, RuleContext } from '../rule-context.js';

/**
 * Enforce `ruleset.mayDependOn`. A file in layer A importing a file in layer B
 * (A != B) is a violation unless B is listed in `ruleset[A].mayDependOn`. Layers
 * absent from the ruleset are unconstrained; unassigned files are skipped.
 */
export function layerBoundaryRule(): Rule {
  return {
    id: 'layer-boundary',
    check(ctx: RuleContext) {
      const violations = [];
      const { ruleset } = ctx.config;
      for (const f of ctx.analysis.files) {
        const fromLayer = f.file.layer;
        if (fromLayer === null) continue;
        const allowed = ruleset[fromLayer];
        if (allowed === undefined) continue; // layer not constrained by the ruleset
        const allow = new Set(allowed.mayDependOn);
        for (const imp of f.imports) {
          if (imp.targetFile === null) continue;
          const toLayer = ctx.layerOf(imp.targetFile);
          if (toLayer === null || toLayer === fromLayer) continue;
          if (allow.has(toLayer)) continue;
          violations.push(
            createViolation({
              rule: 'layer-boundary',
              severity: 'error',
              file: f.file.relPath,
              line: imp.line,
              column: imp.column,
              target: ctx.rel(imp.targetFile),
              message: `Layer "${fromLayer}" cannot depend on layer "${toLayer}".`,
              suggestion: `Allowed dependencies for "${fromLayer}": ${
                allowed.mayDependOn.join(', ') || '(none)'
              }.`,
            }),
          );
        }
      }
      return violations;
    },
  };
}

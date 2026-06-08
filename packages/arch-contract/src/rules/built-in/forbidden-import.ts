import type { ForbiddenImportRule } from '../../config/model.js';
import { createViolation } from '../violations.js';
import { importMatchesSelector, importTargetLabel } from './import-matching.js';
import type { Rule, RuleContext } from '../rule-context.js';

export function forbiddenImportRule(cfg: ForbiddenImportRule): Rule {
  return {
    id: cfg.name,
    check(ctx: RuleContext) {
      const violations = [];
      for (const f of ctx.analysis.files) {
        if (!ctx.matchesSelector(f.file.path, cfg.from)) continue;
        const fromModule = ctx.moduleOf(f.file.path);
        for (const imp of f.imports) {
          if (!importMatchesSelector(ctx, imp, cfg.to)) continue;

          // except.sameModule
          if (cfg.except.sameModule && imp.targetFile !== null) {
            const toModule = ctx.moduleOf(imp.targetFile);
            if (fromModule !== null && fromModule === toModule) continue;
          }
          // except.publicApi
          if (
            cfg.except.publicApi.length > 0 &&
            imp.targetFile !== null &&
            ctx.matchPath(ctx.rel(imp.targetFile), cfg.except.publicApi)
          ) {
            continue;
          }

          const target = importTargetLabel(ctx, imp);
          violations.push(
            createViolation({
              rule: cfg.name,
              severity: cfg.severity,
              file: f.file.relPath,
              line: imp.line,
              column: imp.column,
              target,
              message: `Forbidden import: "${f.file.relPath}" must not import "${target}".`,
            }),
          );
        }
      }
      return violations;
    },
  };
}

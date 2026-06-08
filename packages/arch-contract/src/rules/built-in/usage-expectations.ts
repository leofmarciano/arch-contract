import type { Clause, NormalizedExpectation } from '../../config/model.js';
import type { FileFacts, Violation } from '../../core/types.js';
import { createViolation } from '../violations.js';
import { matchesForbiddenPackage } from './package-boundary.js';
import type { RuleContext } from '../rule-context.js';

/** Usage/dependency clauses driven by the reverse usage index and import edges. */
export function evalUsageClause(
  ctx: RuleContext,
  exp: NormalizedExpectation,
  clause: Clause,
  files: FileFacts[],
): Violation[] {
  const out: Violation[] = [];

  for (const facts of files) {
    switch (clause.kind) {
      case 'onlyBeUsedIn': {
        for (const u of ctx.analysis.getUsersOfFile(facts.file.path)) {
          const userRel = ctx.rel(u.userFile);
          if (exp.ignoring.length > 0 && ctx.matchPath(userRel, exp.ignoring)) continue;
          if (ctx.matchPath(userRel, clause.values)) continue;
          out.push(
            createViolation({
              rule: exp.name,
              severity: exp.severity,
              file: userRel,
              line: u.line,
              column: u.column,
              target: facts.file.relPath,
              message: `"${userRel}" may not use "${facts.file.relPath}"; only [${clause.values.join(', ')}] are allowed.`,
            }),
          );
        }
        break;
      }
      case 'notBeUsedIn': {
        for (const u of ctx.analysis.getUsersOfFile(facts.file.path)) {
          const userRel = ctx.rel(u.userFile);
          if (exp.ignoring.length > 0 && ctx.matchPath(userRel, exp.ignoring)) continue;
          if (ctx.matchPath(userRel, clause.values)) {
            out.push(
              createViolation({
                rule: exp.name,
                severity: exp.severity,
                file: userRel,
                line: u.line,
                column: u.column,
                target: facts.file.relPath,
                message: `"${userRel}" must not use "${facts.file.relPath}".`,
              }),
            );
          }
        }
        break;
      }
      case 'notDependOnPackages': {
        for (const imp of facts.imports) {
          if (matchesForbiddenPackage(imp, clause.values)) {
            // Report the exact specifier written in source (e.g. `encore.dev/api`);
            // it is the most precise/actionable target and survives node_modules
            // resolution that would otherwise drop `packageName`.
            const pkg = imp.specifier;
            out.push(
              createViolation({
                rule: exp.name,
                severity: exp.severity,
                file: facts.file.relPath,
                line: imp.line,
                column: imp.column,
                target: pkg,
                message: `"${facts.file.relPath}" must not depend on package "${pkg}".`,
              }),
            );
          }
        }
        break;
      }
      case 'notDependOnPaths': {
        for (const imp of facts.imports) {
          if (imp.targetFile === null) continue;
          const targetRel = ctx.rel(imp.targetFile);
          if (ctx.matchPath(targetRel, clause.values)) {
            out.push(
              createViolation({
                rule: exp.name,
                severity: exp.severity,
                file: facts.file.relPath,
                line: imp.line,
                column: imp.column,
                target: targetRel,
                message: `"${facts.file.relPath}" must not depend on path "${targetRel}".`,
              }),
            );
          }
        }
        break;
      }
      default:
        break;
    }
  }

  return out;
}

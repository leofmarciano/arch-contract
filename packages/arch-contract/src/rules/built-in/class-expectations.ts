import type { Clause, NormalizedExpectation } from '../../config/model.js';
import type { DeclarationRecord, FileFacts, Violation } from '../../core/types.js';
import { createViolation } from '../violations.js';
import { matchAnyName } from './name-match.js';

function exportedClasses(facts: FileFacts): DeclarationRecord[] {
  return facts.declarations.filter(
    (d) => d.kind === 'class' && (d.isExported || d.isDefaultExport),
  );
}

function exportedDecls(facts: FileFacts): DeclarationRecord[] {
  return facts.declarations.filter((d) => d.isExported || d.isDefaultExport);
}

function v(
  exp: NormalizedExpectation,
  facts: FileFacts,
  parts: { line?: number; column?: number; symbol?: string; target?: string; message: string; suggestion?: string },
): Violation {
  return createViolation({
    rule: exp.name,
    severity: exp.severity,
    file: facts.file.relPath,
    ...parts,
  });
}

/** Evaluate one declaration-level (class/structure) clause against the selected files. */
export function evalClassClause(
  exp: NormalizedExpectation,
  clause: Clause,
  files: FileFacts[],
): Violation[] {
  const out: Violation[] = [];

  for (const facts of files) {
    switch (clause.kind) {
      case 'be': {
        const allowed = new Set(clause.values);
        for (const d of exportedDecls(facts)) {
          if (!allowed.has(d.kind)) {
            out.push(
              v(exp, facts, {
                line: d.line,
                column: d.column,
                symbol: d.name || '(default)',
                message: `Expected only [${clause.values.join(', ')}], but "${d.name || 'default export'}" is a ${d.kind}.`,
              }),
            );
          }
        }
        break;
      }
      case 'extend': {
        for (const d of exportedClasses(facts)) {
          if (d.extendsName === null || !matchAnyName(d.extendsName, clause.values)) {
            out.push(
              v(exp, facts, {
                line: d.line,
                column: d.column,
                symbol: d.name,
                message: `Class "${d.name}" must extend one of [${clause.values.join(', ')}]${d.extendsName ? `, but extends "${d.extendsName}"` : ''}.`,
              }),
            );
          }
        }
        break;
      }
      case 'implement': {
        for (const d of exportedClasses(facts)) {
          const ok = d.implementsNames.some((i) => matchAnyName(i, clause.values));
          if (!ok) {
            out.push(
              v(exp, facts, {
                line: d.line,
                column: d.column,
                symbol: d.name,
                message: `Class "${d.name}" must implement one of [${clause.values.join(', ')}].`,
              }),
            );
          }
        }
        break;
      }
      case 'haveMethod': {
        for (const d of exportedClasses(facts)) {
          const methods = new Set(d.methods.map((m) => m.name));
          for (const required of clause.values) {
            if (!methods.has(required)) {
              out.push(
                v(exp, facts, {
                  line: d.line,
                  column: d.column,
                  symbol: d.name,
                  target: required,
                  message: `Class "${d.name}" must declare method "${required}".`,
                }),
              );
            }
          }
        }
        break;
      }
      case 'haveDecorator': {
        for (const d of exportedClasses(facts)) {
          const decs = new Set(d.decorators.map((x) => x.name));
          for (const required of clause.values) {
            if (!decs.has(required)) {
              out.push(
                v(exp, facts, {
                  line: d.line,
                  column: d.column,
                  symbol: d.name,
                  target: required,
                  message: `Class "${d.name}" must have decorator "@${required}".`,
                }),
              );
            }
          }
        }
        break;
      }
      case 'notHaveDecorator': {
        for (const d of exportedClasses(facts)) {
          for (const dec of d.decorators) {
            if (clause.values.includes(dec.name)) {
              out.push(
                v(exp, facts, {
                  line: dec.line,
                  column: dec.column,
                  symbol: d.name,
                  target: dec.name,
                  message: `Class "${d.name}" must not have decorator "@${dec.name}".`,
                }),
              );
            }
          }
          for (const m of d.methods) {
            for (const dec of m.decorators) {
              if (clause.values.includes(dec.name)) {
                out.push(
                  v(exp, facts, {
                    line: dec.line,
                    column: dec.column,
                    symbol: `${d.name}.${m.name}`,
                    target: dec.name,
                    message: `Method "${d.name}.${m.name}" must not have decorator "@${dec.name}".`,
                  }),
                );
              }
            }
          }
        }
        break;
      }
      case 'notCall': {
        for (const call of facts.calls) {
          if (matchAnyName(call.calleeText, clause.values)) {
            out.push(
              v(exp, facts, {
                line: call.line,
                column: call.column,
                target: call.calleeText,
                message: `Forbidden call to "${call.calleeText}".`,
              }),
            );
          }
        }
        break;
      }
      case 'notInstantiate': {
        for (const n of facts.news) {
          if (matchAnyName(n.className, clause.values)) {
            out.push(
              v(exp, facts, {
                line: n.line,
                column: n.column,
                target: n.className,
                message: `Forbidden instantiation: new ${n.className}().`,
              }),
            );
          }
        }
        break;
      }
      case 'export':
      case 'notHave': {
        const forbidsDefault =
          clause.kind === 'export' || (clause.kind === 'notHave' && clause.values.includes('defaultExport'));
        if (forbidsDefault) {
          const def = facts.declarations.find((d) => d.isDefaultExport);
          const hasDefault = facts.exports.some((e) => e.isDefaultExport) || def !== undefined;
          if (hasDefault) {
            out.push(
              v(exp, facts, {
                ...(def ? { line: def.line, column: def.column } : {}),
                target: 'defaultExport',
                message: `File must not have a default export (named exports only).`,
              }),
            );
          }
        }
        if (clause.kind === 'notHave' && clause.values.includes('namespaceExport') && facts.hasNamespaceExport) {
          out.push(
            v(exp, facts, {
              target: 'namespaceExport',
              message: `File must not have a namespace/star export (\`export * ...\`).`,
            }),
          );
        }
        break;
      }
      default:
        break;
    }
  }

  return out;
}

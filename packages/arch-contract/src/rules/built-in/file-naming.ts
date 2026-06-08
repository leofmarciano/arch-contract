import type { Clause, NormalizedExpectation } from '../../config/model.js';
import type { FileFacts, Violation } from '../../core/types.js';
import { createViolation } from '../violations.js';

/** `haveSuffix`: every exported declaration name must end with one of the suffixes. */
export function evalNamingClause(
  exp: NormalizedExpectation,
  clause: Clause,
  files: FileFacts[],
): Violation[] {
  if (clause.kind !== 'haveSuffix') return [];
  const out: Violation[] = [];
  for (const facts of files) {
    for (const d of facts.declarations) {
      if (!d.isExported && !d.isDefaultExport) continue;
      if (d.name === '') continue;
      if (!clause.values.some((suffix) => d.name.endsWith(suffix))) {
        out.push(
          createViolation({
            rule: exp.name,
            severity: exp.severity,
            file: facts.file.relPath,
            line: d.line,
            column: d.column,
            symbol: d.name,
            message: `"${d.name}" must end with one of [${clause.values.join(', ')}].`,
          }),
        );
      }
    }
  }
  return out;
}

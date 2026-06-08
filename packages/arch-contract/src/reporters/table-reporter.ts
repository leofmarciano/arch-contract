import type { CheckResult, Violation } from '../core/types.js';
import { locationSuffix, type Reporter } from './reporter.js';

function groupByRule(violations: Violation[]): Map<string, Violation[]> {
  const groups = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = groups.get(v.rule) ?? [];
    list.push(v);
    groups.set(v.rule, list);
  }
  return groups;
}

/** Human terminal report: violations grouped by rule with a summary footer. */
export const tableReporter: Reporter = {
  format: 'table',
  render(result: CheckResult): string {
    const { violations, summary } = result;
    if (violations.length === 0) return 'No architecture violations found.';

    const lines: string[] = [`Architecture violations found: ${violations.length}`, ''];
    for (const [rule, group] of groupByRule(violations)) {
      lines.push(`${group[0]?.severity === 'warning' ? '[warning]' : '[error]'} ${rule}`);
      for (const v of group) {
        lines.push(`  ${v.file}${locationSuffix(v.line, v.column)}  ${v.message}`);
        if (v.suggestion !== undefined) lines.push(`    fix: ${v.suggestion}`);
      }
      lines.push('');
    }
    lines.push(
      `Errors: ${summary.errors}  Warnings: ${summary.warnings}  Ignored: ${summary.ignored}`,
    );
    return lines.join('\n');
  },
};

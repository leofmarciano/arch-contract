import type { CheckResult, Violation } from '../core/types.js';
import { locationSuffix, type Reporter } from './reporter.js';
import { PLAIN_THEME, type Theme } from './theme.js';

function groupByRule(violations: Violation[]): Map<string, Violation[]> {
  const groups = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = groups.get(v.rule) ?? [];
    list.push(v);
    groups.set(v.rule, list);
  }
  return groups;
}

/**
 * Human terminal report: violations grouped by rule with a summary footer.
 * With a disabled theme (or none) the output is byte-identical to the plain
 * form; an enabled theme only adds ANSI coloring, never changes the text.
 */
export const tableReporter: Reporter = {
  format: 'table',
  render(result: CheckResult, theme: Theme = PLAIN_THEME): string {
    const { violations, summary } = result;
    if (violations.length === 0) {
      // Disabled theme keeps the exact legacy string; enabled adds a green check.
      return theme.enabled
        ? `${theme.symbolOk()} No architecture violations found.`
        : 'No architecture violations found.';
    }

    const lines: string[] = [
      theme.heading(`Architecture violations found: ${violations.length}`),
      '',
    ];
    for (const [rule, group] of groupByRule(violations)) {
      const isWarning = group[0]?.severity === 'warning';
      const tag = isWarning ? theme.warn('[warning]') : theme.err('[error]');
      lines.push(`${tag} ${theme.bold(rule)}`);
      for (const v of group) {
        const loc = theme.hint(`${v.file}${locationSuffix(v.line, v.column)}`);
        lines.push(`  ${loc}  ${v.message}`);
        if (v.suggestion !== undefined) lines.push(`    ${theme.hint(`fix: ${v.suggestion}`)}`);
      }
      lines.push('');
    }
    lines.push(
      `${theme.bold('Errors:')} ${summary.errors}  ${theme.bold('Warnings:')} ${summary.warnings}  ${theme.bold('Ignored:')} ${summary.ignored}`,
    );
    return lines.join('\n');
  },
};

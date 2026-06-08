import type { CheckResult } from '../core/types.js';
import { locationSuffix, type Reporter } from './reporter.js';

function cell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/** Markdown report suitable for PR comments / job summaries. */
export const markdownReporter: Reporter = {
  format: 'markdown',
  render(result: CheckResult): string {
    const { violations, summary } = result;
    if (violations.length === 0) return '✅ No architecture violations found.';

    const lines: string[] = [
      '## Architecture violations',
      '',
      `**${summary.errors} error(s), ${summary.warnings} warning(s)** (${summary.ignored} baselined)`,
      '',
      '| Rule | Severity | File | Message |',
      '| --- | --- | --- | --- |',
    ];
    for (const v of violations) {
      lines.push(
        `| ${cell(v.rule)} | ${v.severity} | ${cell(v.file + locationSuffix(v.line, v.column))} | ${cell(v.message)} |`,
      );
    }
    return lines.join('\n');
  },
};

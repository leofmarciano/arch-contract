import type { CheckResult } from '../core/types.js';
import type { Reporter } from './reporter.js';

/** Escape an annotation message (data) per GitHub workflow-command rules. */
export function escapeData(s: string): string {
  return s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/** Escape an annotation property value (file/title), additionally escaping `:` and `,`. */
export function escapeProperty(s: string): string {
  return escapeData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

/** GitHub Actions workflow annotations: one `::error`/`::warning` line per violation. */
export const githubReporter: Reporter = {
  format: 'github',
  render(result: CheckResult): string {
    return result.violations
      .map((v) => {
        const cmd = v.severity === 'warning' ? 'warning' : 'error';
        const props = [`file=${escapeProperty(v.file)}`];
        if (v.line !== undefined) props.push(`line=${v.line}`);
        if (v.column !== undefined) props.push(`col=${v.column}`);
        props.push(`title=${escapeProperty(`${v.rule}`)}`);
        return `::${cmd} ${props.join(',')}::${escapeData(v.message)}`;
      })
      .join('\n');
  },
};

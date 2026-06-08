import type { CheckResult } from '../core/types.js';

export type ReportFormat = 'table' | 'json' | 'markdown' | 'github';

/** A pure, IO-free renderer: same input -> identical string. The CLI owns IO. */
export interface Reporter {
  format: ReportFormat;
  render(result: CheckResult): string;
}

export function locationSuffix(line?: number, column?: number): string {
  if (line === undefined) return '';
  return column === undefined ? `:${line}` : `:${line}:${column}`;
}

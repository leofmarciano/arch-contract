import type { CheckResult } from '../core/types.js';
import type { Theme } from './theme.js';

export type ReportFormat = 'table' | 'json' | 'markdown' | 'github';

/**
 * A pure, IO-free renderer: same input -> identical string. The CLI owns IO.
 * `theme` is optional and only consulted by the human `table` format; machine
 * formats (json/github/markdown) ignore it and stay byte-stable.
 */
export interface Reporter {
  format: ReportFormat;
  render(result: CheckResult, theme?: Theme): string;
}

export function locationSuffix(line?: number, column?: number): string {
  if (line === undefined) return '';
  return column === undefined ? `:${line}` : `:${line}:${column}`;
}

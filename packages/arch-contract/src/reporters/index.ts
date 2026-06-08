import { githubReporter } from './github-annotations-reporter.js';
import { jsonReporter } from './json-reporter.js';
import { markdownReporter } from './markdown-reporter.js';
import type { Reporter, ReportFormat } from './reporter.js';
import { tableReporter } from './table-reporter.js';

export type { Reporter, ReportFormat } from './reporter.js';

/** The MVP reporter set (sarif is intentionally excluded — post-MVP). */
export const reporters: Record<ReportFormat, Reporter> = {
  table: tableReporter,
  json: jsonReporter,
  markdown: markdownReporter,
  github: githubReporter,
};

export const REPORT_FORMATS = Object.keys(reporters) as ReportFormat[];

export function isReportFormat(value: string): value is ReportFormat {
  return value in reporters;
}

export class UnknownReporterError extends Error {
  constructor(format: string) {
    super(`Unknown report format "${format}". Available: ${REPORT_FORMATS.join(', ')}.`);
    this.name = 'UnknownReporterError';
  }
}

export function getReporter(format: string): Reporter {
  if (!isReportFormat(format)) throw new UnknownReporterError(format);
  return reporters[format];
}

export { tableReporter, jsonReporter, markdownReporter, githubReporter };
export { renderSarif } from './sarif-reporter.js';

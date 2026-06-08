import type { CheckResult } from '../core/types.js';
import type { Reporter } from './reporter.js';

/** Emit the `{ summary, violations[] }` shape — deterministic, 2-space indented, no timestamps. */
export const jsonReporter: Reporter = {
  format: 'json',
  render(result: CheckResult): string {
    return JSON.stringify(result, null, 2);
  },
};

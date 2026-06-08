import pc from 'picocolors';

import { PLAIN_THEME, type Theme } from '../reporters/theme.js';

/**
 * Build a {@link Theme}. When `enabled` is false this is the shared
 * {@link PLAIN_THEME} (every helper is the identity, plain ASCII markers), so
 * machine output and non-TTY/`NO_COLOR` contexts stay free of ANSI escapes.
 * Color is decided once (in `defaultDeps` and `main`) and threaded down as a
 * theme — call sites never re-check.
 */
export function createTheme(enabled: boolean): Theme {
  if (!enabled) return PLAIN_THEME;
  const c = pc.createColors(true);
  return {
    enabled: true,
    bold: (s) => c.bold(s),
    dim: (s) => c.dim(s),
    red: (s) => c.red(s),
    green: (s) => c.green(s),
    yellow: (s) => c.yellow(s),
    cyan: (s) => c.cyan(s),
    heading: (s) => c.bold(s),
    ok: (s) => c.green(s),
    err: (s) => c.red(s),
    warn: (s) => c.yellow(s),
    hint: (s) => c.dim(s),
    symbolOk: () => c.green('✓'),
    symbolErr: () => c.red('✗'),
  };
}

/** A shared color-off theme for plain output and tests. */
export const NO_COLOR_THEME: Theme = PLAIN_THEME;

/**
 * A terminal style theme. Lives in the reporters layer (a neutral home that the
 * CLI already imports) so the pure `table` reporter can take a theme as a type
 * without importing the CLI layer — keeping reporters cycle-free and ts-morph-free.
 *
 * Every method is a pure `string -> string`. When `enabled` is false the
 * implementation returns its input unchanged, so callers never branch on color:
 * the same code path yields plain output when color is off. See `createTheme`
 * in `src/cli/style.ts`.
 */
export interface Theme {
  /** Whether ANSI styling is active. False -> all helpers are the identity. */
  readonly enabled: boolean;

  // Raw styles.
  bold(s: string): string;
  dim(s: string): string;
  red(s: string): string;
  green(s: string): string;
  yellow(s: string): string;
  cyan(s: string): string;

  // Semantic styles (preferred at call sites).
  /** A section heading. */
  heading(s: string): string;
  /** Success / passing. */
  ok(s: string): string;
  /** Error / failure. */
  err(s: string): string;
  /** Warning. */
  warn(s: string): string;
  /** Secondary, de-emphasized text (paths, hints). */
  hint(s: string): string;

  /** Pass marker, e.g. a green `✓`. */
  symbolOk(): string;
  /** Fail marker, e.g. a red `✗`. */
  symbolErr(): string;
}

const identity = (s: string): string => s;

/**
 * A disabled theme: every helper is the identity and markers are plain ASCII.
 * Lives here (not in the CLI's `style.ts`) so the pure reporters can default to
 * it without importing the CLI layer. `createTheme(false)` returns this.
 */
export const PLAIN_THEME: Theme = {
  enabled: false,
  bold: identity,
  dim: identity,
  red: identity,
  green: identity,
  yellow: identity,
  cyan: identity,
  heading: identity,
  ok: identity,
  err: identity,
  warn: identity,
  hint: identity,
  symbolOk: () => '✓',
  symbolErr: () => '✗',
};

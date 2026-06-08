import path from 'node:path';

/** Convert any path to POSIX separators. Single chokepoint for cross-OS glob matching. */
export function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Resolve segments to an absolute POSIX path. */
export function resolvePosix(...segments: string[]): string {
  return toPosix(path.resolve(...segments));
}

/** Absolute -> POSIX path relative to `root`. */
export function relativePosix(root: string, abs: string): string {
  return toPosix(path.relative(root, abs));
}

/** Directory of a path, POSIX-normalized. */
export function dirnamePosix(p: string): string {
  return toPosix(path.dirname(p));
}

export function isDeclarationFile(p: string): boolean {
  return /\.d\.ts$/i.test(p);
}

/** Strip a TS/JS extension (.ts/.tsx/.d.ts/.js/.jsx/.mts/.cts/.mjs/.cjs). */
export function stripTsExt(p: string): string {
  return p.replace(/\.(d\.ts|m?tsx?|c?tsx?|m?jsx?|c?jsx?)$/i, '');
}

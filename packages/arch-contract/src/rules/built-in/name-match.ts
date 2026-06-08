import picomatch from 'picomatch';

const cache = new Map<string, (s: string) => boolean>();

/** Match an identifier against a pattern: exact when no wildcard, else glob (`*Repository`, `Prisma*`). */
export function matchName(name: string, pattern: string): boolean {
  if (!/[*?]/.test(pattern)) return name === pattern;
  let matcher = cache.get(pattern);
  if (!matcher) {
    matcher = picomatch(pattern, { dot: true });
    cache.set(pattern, matcher);
  }
  return matcher(name);
}

export function matchAnyName(name: string, patterns: string[]): boolean {
  return patterns.some((p) => matchName(name, p));
}

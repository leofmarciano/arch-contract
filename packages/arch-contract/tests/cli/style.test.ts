import { describe, expect, it } from 'vitest';

import { createTheme, NO_COLOR_THEME } from '../../src/cli/style.js';

describe('createTheme', () => {
  it('color OFF is the identity and uses plain markers', () => {
    const t = createTheme(false);
    expect(t.enabled).toBe(false);
    expect(t.red('x')).toBe('x');
    expect(t.bold('x')).toBe('x');
    expect(t.heading('x')).toBe('x');
    expect(t.symbolOk()).toBe('✓');
    expect(t.symbolErr()).toBe('✗');
    // no ANSI escape anywhere
    expect(t.err(t.warn(t.ok('x')))).not.toContain('\x1b[');
  });

  it('color ON wraps text in ANSI escapes', () => {
    const t = createTheme(true);
    expect(t.enabled).toBe(true);
    expect(t.red('x')).toContain('\x1b[');
    expect(t.red('x')).toContain('x');
    expect(t.symbolOk()).toContain('\x1b[');
  });

  it('NO_COLOR_THEME is a disabled theme', () => {
    expect(NO_COLOR_THEME.enabled).toBe(false);
    expect(NO_COLOR_THEME.dim('y')).toBe('y');
  });
});

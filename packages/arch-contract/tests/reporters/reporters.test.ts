import { describe, expect, it } from 'vitest';

import type { CheckResult } from '../../src/core/types.js';
import { createTheme } from '../../src/cli/style.js';
import { computeSummary } from '../../src/core/run-check.js';
import {
  getReporter,
  REPORT_FORMATS,
  renderSarif,
  reporters,
  UnknownReporterError,
} from '../../src/reporters/index.js';
import { escapeData } from '../../src/reporters/github-annotations-reporter.js';
import { createViolation } from '../../src/rules/violations.js';

function sample(): CheckResult {
  const violations = [
    createViolation({
      rule: 'layer-boundary',
      file: 'src/a.ts',
      line: 3,
      column: 5,
      target: 'src/b.ts',
      message: 'Layer "x" cannot depend on layer "y".',
      suggestion: 'Move it.',
    }),
    createViolation({
      rule: 'no-default',
      file: 'src/c.ts',
      severity: 'warning',
      message: 'No default | export allowed',
    }),
  ];
  return { summary: computeSummary(violations, 4), violations };
}

const empty: CheckResult = { summary: computeSummary([], 4), violations: [] };

describe('json reporter', () => {
  it('emits the {summary, violations} shape and round-trips', () => {
    const out = reporters.json.render(sample());
    const parsed = JSON.parse(out) as CheckResult;
    expect(parsed).toEqual(sample());
    expect(out).toContain('"summary"');
  });

  it('omits undefined optional fields', () => {
    const out = reporters.json.render(empty);
    expect(out).not.toContain('undefined');
  });
});

describe('table reporter', () => {
  it('lists violations grouped by rule', () => {
    const out = reporters.table.render(sample());
    expect(out).toContain('Architecture violations found: 2');
    expect(out).toContain('layer-boundary');
    expect(out).toContain('src/a.ts:3:5');
    expect(out).toContain('Errors: 1  Warnings: 1');
  });

  it('renders an all-clear for an empty result', () => {
    expect(reporters.table.render(empty)).toBe('No architecture violations found.');
  });

  it('is byte-identical with a disabled theme, and colorized with an enabled one', () => {
    // no theme === disabled theme === today's plain output
    expect(reporters.table.render(sample(), createTheme(false))).toBe(reporters.table.render(sample()));
    expect(reporters.table.render(empty, createTheme(false))).toBe('No architecture violations found.');
    // enabled theme injects ANSI but keeps the key substrings
    const colored = reporters.table.render(sample(), createTheme(true));
    expect(colored).toContain('\x1b[');
    expect(colored).toContain('Architecture violations found: 2');
  });
});

describe('markdown reporter', () => {
  it('renders a summary line and a table, escaping pipes', () => {
    const out = reporters.markdown.render(sample());
    expect(out).toContain('**1 error(s), 1 warning(s)**');
    expect(out).toContain('| Rule | Severity | File | Message |');
    expect(out).toContain('No default \\| export allowed');
  });

  it('renders an all-clear when empty', () => {
    expect(reporters.markdown.render(empty)).toContain('No architecture violations');
  });
});

describe('github reporter', () => {
  it('emits one annotation per violation with the right command', () => {
    const out = reporters.github.render(sample());
    const lines = out.split('\n');
    expect(lines[0]).toContain('::error file=src/a.ts,line=3,col=5,title=layer-boundary::');
    expect(lines[1]?.startsWith('::warning ')).toBe(true);
  });

  it('escapes newlines and percent signs in messages', () => {
    expect(escapeData('a\nb%c')).toBe('a%0Ab%25c');
  });

  it('emits an empty string for no violations', () => {
    expect(reporters.github.render(empty)).toBe('');
  });
});

describe('reporter registry', () => {
  it('returns a reporter for every valid format', () => {
    for (const f of REPORT_FORMATS) expect(getReporter(f).format).toBe(f);
  });

  it('throws UnknownReporterError for an unknown format', () => {
    expect(() => getReporter('xml')).toThrow(UnknownReporterError);
  });

  it('contains exactly the four MVP formats', () => {
    expect([...REPORT_FORMATS].sort()).toEqual(['github', 'json', 'markdown', 'table']);
  });
});

describe('sarif reporter (post-MVP, standalone)', () => {
  it('emits a valid SARIF 2.1.0 document mapping each violation to a result', () => {
    const doc = JSON.parse(renderSarif(sample()));
    expect(doc.version).toBe('2.1.0');
    expect(doc.runs[0].tool.driver.name).toBe('arch-contract');
    expect(doc.runs[0].results).toHaveLength(2);
    expect(doc.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(
      'src/a.ts',
    );
    expect(doc.runs[0].results[1].level).toBe('warning');
  });

  it('renders an empty results array for no violations', () => {
    expect(JSON.parse(renderSarif(empty)).runs[0].results).toEqual([]);
  });
});

describe('reporter contract', () => {
  it('every reporter renders a deterministic string', () => {
    for (const f of REPORT_FORMATS) {
      const r = getReporter(f);
      expect(typeof r.render(sample())).toBe('string');
      expect(r.render(sample())).toBe(r.render(sample()));
      expect(typeof r.render(empty)).toBe('string');
    }
  });
});

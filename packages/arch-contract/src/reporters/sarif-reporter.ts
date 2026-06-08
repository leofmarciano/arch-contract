import type { CheckResult } from '../core/types.js';

/**
 * SARIF 2.1.0 output. Marked post-MVP in the spec (section 11), so it is not in
 * the default reporter registry, but a minimal valid mapping is provided here
 * for tooling that wants it.
 */
export function renderSarif(result: CheckResult): string {
  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: { driver: { name: 'arch-contract', rules: [] } },
        results: result.violations.map((v) => ({
          ruleId: v.rule,
          level: v.severity === 'warning' ? 'warning' : 'error',
          message: { text: v.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: v.file },
                ...(v.line !== undefined
                  ? { region: { startLine: v.line, ...(v.column !== undefined ? { startColumn: v.column } : {}) } }
                  : {}),
              },
            },
          ],
        })),
      },
    ],
  };
  return JSON.stringify(sarif, null, 2);
}

import { describe, expect, it } from 'vitest';

import { presetNames, PRESETS } from '../../src/config/presets/index.js';
import { validateConfig } from '../../src/config/validate-config.js';

function resolve(name: string) {
  return validateConfig({
    raw: { version: 1, project: { name: 'demo' }, presets: [name] },
    configPath: '/proj/arch-contract.yaml',
    text: '',
  });
}

describe('every built-in preset resolves to a valid NormalizedConfig', () => {
  it('exposes exactly the 10 documented presets', () => {
    expect(presetNames()).toEqual(
      [
        'adonisjs',
        'clean-architecture',
        'elysiajs',
        'encore-ts',
        'hexagonal',
        'nest-js',
        'nestjs-clean',
        'nextjs',
        'node-service',
        'tanstack-starter',
      ].sort(),
    );
  });

  for (const name of [
    'clean-architecture',
    'hexagonal',
    'node-service',
    'nestjs-clean',
    'nest-js',
    'nextjs',
    'tanstack-starter',
    'adonisjs',
    'elysiajs',
    'encore-ts',
  ]) {
    it(`${name} resolves with zero semantic issues`, () => {
      const { config } = resolve(name);
      expect(config.layers.length).toBeGreaterThan(0);
      // every ruleset key + mayDependOn must reference a defined layer
      const layerNames = new Set(config.layers.map((l) => l.name));
      for (const [layer, entry] of Object.entries(config.ruleset)) {
        expect(layerNames.has(layer)).toBe(true);
        for (const dep of entry.mayDependOn) expect(layerNames.has(dep)).toBe(true);
      }
    });
  }

  it('every preset carries metadata used by the CLI', () => {
    for (const name of presetNames()) {
      const entry = PRESETS[name];
      expect(entry?.meta.name).toBe(name);
      expect(entry?.meta.oneLine.length).toBeGreaterThan(10);
    }
  });
});

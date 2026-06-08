import { defineConfig } from 'tsup';

const common = {
  format: ['esm'] as const,
  target: 'node22' as const,
  platform: 'node' as const,
  sourcemap: true,
  dts: true,
};

export default defineConfig([
  {
    ...common,
    entry: { index: 'src/index.ts' },
    clean: true,
  },
  {
    ...common,
    entry: { cli: 'src/cli/index.ts' },
    clean: false,
    banner: { js: '#!/usr/bin/env node' },
  },
]);

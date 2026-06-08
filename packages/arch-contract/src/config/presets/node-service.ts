import type { PresetFragment } from './types.js';
import {
  makeCleanArchBase,
  repositoryPortExpectations,
  useCaseExpectation,
} from './_clean-arch-base.js';

// Generic Node/TS service: pragmatic Clean Architecture with a framework-free
// shared/ kernel and optional vertical slices under src/modules/* (public-api
// boundary + module cycles).
const base = makeCleanArchBase({
  domain: ['src/domain/**', 'src/**/domain/**', 'src/**/entities/**'],
  application: ['src/application/**', 'src/use-cases/**', 'src/**/application/**', 'src/**/use-cases/**'],
  infrastructure: [
    'src/infrastructure/**',
    'src/infra/**',
    'src/**/infrastructure/**',
    'src/**/repositories/**',
    'src/**/adapters/**',
  ],
  presentation: [
    'src/presentation/**',
    'src/http/**',
    'src/controllers/**',
    'src/routes/**',
    'src/**/controllers/**',
    'src/**/http/**',
  ],
  shared: ['src/shared/**', 'src/common/**', 'src/lib/**'],
});

export const NODE_SERVICE: PresetFragment = {
  ...base,
  paths: { include: ['src'], exclude: ['**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'] },
  modules: { pattern: 'src/modules/*', publicApi: 'index.ts' },
  rules: [
    ...(base.rules ?? []),
    {
      name: 'cross-module-imports-go-through-public-api',
      type: 'public-api-boundary',
      except: { sameModule: true },
      severity: 'error',
    },
    { name: 'no-module-cycles', type: 'no-cycles', scope: 'module', severity: 'error' },
  ],
  expectations: [
    ...(base.expectations ?? []),
    useCaseExpectation(['src/**/use-cases/**/*.ts', 'src/**/application/**/*UseCase.ts']),
    ...repositoryPortExpectations(
      ['src/**/ports/**/*Repository*.ts', 'src/**/application/**/*RepositoryPort.ts'],
      ['src/**/infrastructure/**/*Repository.ts', 'src/**/repositories/**/*Repository.ts'],
    ),
  ],
};

import type { PresetFragment } from './types.js';
import {
  makeCleanArchBase,
  repositoryPortExpectations,
  useCaseExpectation,
} from './_clean-arch-base.js';

// Clean Architecture inside per-feature NestJS modules. Nest stays the framework
// (presentation + infrastructure DI), but the domain is kept pure — no @nestjs/*.
const base = makeCleanArchBase({
  domain: ['src/modules/*/domain/**', 'src/**/domain/**'],
  application: ['src/modules/*/application/**', 'src/**/application/**'],
  infrastructure: ['src/modules/*/infrastructure/**', 'src/**/infrastructure/**'],
  presentation: [
    'src/modules/*/presentation/**',
    'src/**/presentation/**',
    'src/**/*.controller.ts',
  ],
  shared: ['src/shared/**', 'src/common/**'],
});

export const NESTJS_CLEAN: PresetFragment = {
  ...base,
  paths: {
    include: ['src'],
    exclude: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.d.ts'],
  },
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
    useCaseExpectation([
      'src/**/application/**/*.use-case.ts',
      'src/**/application/**/*UseCase.ts',
    ]),
    ...repositoryPortExpectations(
      ['src/**/application/**/*RepositoryPort.ts', 'src/**/application/ports/**/*.ts'],
      ['src/**/infrastructure/**/*Repository.ts', 'src/**/infrastructure/**/*.repository.ts'],
    ),
    {
      name: 'use-cases-are-injectable',
      expect: { path: ['src/**/application/**/*.use-case.ts', 'src/**/application/**/*UseCase.ts'] },
      to: { haveDecorator: ['Injectable'] },
      ignoring: ['**/index.ts', '**/*.spec.ts', '**/*.test.ts'],
      severity: 'error',
    },
    {
      name: 'controllers-are-nest-controllers-that-do-not-touch-repositories',
      expect: { path: ['src/**/*.controller.ts'] },
      to: {
        be: ['class'],
        haveDecorator: ['Controller'],
        haveSuffix: ['Controller'],
        notInstantiate: ['*Repository', '*UseCase', 'PrismaClient'],
      },
      ignoring: ['**/*.spec.ts', '**/*.test.ts'],
      severity: 'error',
    },
  ],
};

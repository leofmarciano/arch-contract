import type { PresetFragment } from './types.js';
import {
  makeCleanArchBase,
  repositoryPortExpectations,
  useCaseExpectation,
} from './_clean-arch-base.js';

// Robert C. Martin's Clean Architecture: four concentric layers with the
// Dependency Rule (source dependencies point only inward).
const base = makeCleanArchBase({
  domain: ['src/domain/**', 'src/entities/**', 'src/value-objects/**', 'src/value_objects/**'],
  application: ['src/application/**', 'src/use-cases/**', 'src/usecases/**', 'src/ports/**'],
  infrastructure: ['src/infrastructure/**', 'src/infra/**', 'src/adapters/**', 'src/data/**'],
  presentation: [
    'src/presentation/**',
    'src/controllers/**',
    'src/http/**',
    'src/web/**',
    'src/interface/**',
  ],
});

export const CLEAN_ARCHITECTURE: PresetFragment = {
  ...base,
  paths: { include: ['src'], exclude: ['**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'] },
  expectations: [
    ...(base.expectations ?? []),
    useCaseExpectation([
      'src/application/use-cases/**/*.ts',
      'src/use-cases/**/*.ts',
      'src/usecases/**/*.ts',
    ]),
    ...repositoryPortExpectations(
      ['src/application/ports/**/*Repository*.ts', 'src/ports/**/*Repository*.ts'],
      ['src/infrastructure/repositories/**/*.ts', 'src/infra/repositories/**/*.ts'],
    ),
    {
      name: 'entities-are-classes',
      expect: { path: ['src/domain/entities/**/*.ts', 'src/entities/**/*.ts'] },
      to: { be: ['class'] },
      ignoring: ['**/index.ts', '**/*.spec.ts', '**/*.test.ts'],
      severity: 'error',
    },
    {
      // Entities cross the domain/application/infrastructure boundary (repos
      // persist them), but the presentation layer must use DTOs, not entities.
      name: 'entities-not-used-in-presentation',
      expect: { path: ['src/domain/entities/**/*.ts', 'src/entities/**/*.ts'] },
      to: {
        notBeUsedIn: ['src/presentation/**', 'src/controllers/**', 'src/http/**', 'src/web/**'],
      },
      ignoring: ['**/index.ts', '**/*.spec.ts', '**/*.test.ts'],
      severity: 'error',
    },
    {
      name: 'controllers-delegate-to-use-cases-not-repositories',
      expect: { path: ['src/presentation/controllers/**/*.ts', 'src/controllers/**/*.ts'] },
      to: { haveSuffix: ['Controller'], notInstantiate: ['*Repository', '*RepositoryImpl', 'PrismaClient'] },
      ignoring: ['**/index.ts', '**/*.spec.ts', '**/*.test.ts'],
      severity: 'error',
    },
  ],
};

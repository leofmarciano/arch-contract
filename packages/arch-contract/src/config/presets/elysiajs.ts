import type { PresetFragment } from './types.js';
import { DOMAIN_FORBIDDEN_PACKAGES, useCaseExpectation, repositoryPortExpectations } from './_clean-arch-base.js';

// ElysiaJS (Bun): "1 instance = 1 controller" presentation per feature module
// over a Clean Architecture core. Elysia is unopinionated about business logic,
// so the domain stays framework-free and modules expose a public API (index.ts).
export const ELYSIAJS: PresetFragment = {
  paths: { include: ['src'], exclude: ['**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'] },
  modules: { pattern: 'src/modules/*', publicApi: 'index.ts' },
  layers: [
    { name: 'main', match: ['src/index.ts', 'src/main.ts', 'src/server.ts'] },
    {
      name: 'presentation',
      match: [
        'src/modules/*/index.ts',
        'src/modules/*/routes/**',
        'src/modules/*/model.ts',
        'src/modules/*/*.controller.ts',
        'src/http/**',
      ],
    },
    { name: 'application', match: ['src/modules/*/application/**'] },
    { name: 'domain', match: ['src/modules/*/domain/**'] },
    { name: 'infrastructure', match: ['src/modules/*/infrastructure/**'] },
    { name: 'shared', match: ['src/shared/**'] },
  ],
  ruleset: {
    main: { mayDependOn: ['presentation', 'application', 'infrastructure', 'shared'] },
    // the per-feature module index.ts is the composition root (Elysia has no DI
    // container), so presentation may wire a concrete repository into a use-case.
    presentation: { mayDependOn: ['application', 'domain', 'infrastructure', 'shared'] },
    application: { mayDependOn: ['domain', 'shared'] },
    domain: { mayDependOn: [] },
    infrastructure: { mayDependOn: ['domain', 'application', 'shared'] },
    shared: { mayDependOn: [] },
  },
  rules: [
    { name: 'no-file-cycles', type: 'no-cycles', scope: 'file', severity: 'error' },
    { name: 'no-layer-cycles', type: 'no-cycles', scope: 'layer', severity: 'error' },
    {
      name: 'cross-module-imports-go-through-public-api',
      type: 'public-api-boundary',
      except: { sameModule: true },
      severity: 'error',
    },
  ],
  expectations: [
    {
      name: 'domain-is-framework-free',
      expect: { layer: 'domain' },
      to: { notDependOnPackages: DOMAIN_FORBIDDEN_PACKAGES },
      severity: 'error',
    },
    {
      name: 'domain-has-no-default-or-namespace-export',
      expect: { layer: 'domain' },
      to: { notHave: ['defaultExport', 'namespaceExport'] },
      severity: 'error',
    },
    {
      name: 'presentation-does-not-import-elysia-into-the-core',
      expect: { layer: 'application' },
      to: { notDependOnPackages: ['elysia'] },
      severity: 'error',
    },
    useCaseExpectation(['src/modules/*/application/**/*.use-case.ts', 'src/modules/*/application/**/*UseCase.ts']),
    ...repositoryPortExpectations(
      ['src/modules/*/application/ports/**/*.ts', 'src/modules/*/application/**/*RepositoryPort.ts'],
      ['src/modules/*/infrastructure/**/*Repository.ts', 'src/modules/*/infrastructure/**/*.repository.ts'],
    ),
  ],
};

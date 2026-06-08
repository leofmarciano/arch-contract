import type { PresetFragment } from './types.js';

// Vanilla, official NestJS layout (`nest g resource`, by-feature). NOT clean
// architecture — Nest is opinionated, so we follow its own conventions: feature
// modules are the boundary, controllers/services/modules carry their decorators,
// and dependency injection (never `new`) wires providers.
export const NEST_JS: PresetFragment = {
  paths: {
    include: ['src'],
    exclude: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.d.ts', 'test/**'],
  },
  modules: { pattern: 'src/*', publicApi: 'index.ts' },
  layers: [
    { name: 'app-bootstrap', match: ['src/main.ts', 'src/app.module.ts'] },
    { name: 'config', match: ['src/config/**'] },
    { name: 'common', match: ['src/common/**'] },
    { name: 'dtos', match: ['src/**/dto/**', 'src/**/dtos/**'] },
    { name: 'entities', match: ['src/**/entities/**', 'src/**/*.entity.ts'] },
    { name: 'modules', match: ['src/**/*.module.ts'] },
    { name: 'controllers', match: ['src/**/*.controller.ts', 'src/**/*.gateway.ts', 'src/**/*.resolver.ts'] },
    { name: 'providers', match: ['src/**/*.service.ts', 'src/**/*.repository.ts', 'src/**/*.provider.ts'] },
  ],
  ruleset: {
    'app-bootstrap': { mayDependOn: ['modules', 'config', 'common'] },
    config: { mayDependOn: [] },
    common: { mayDependOn: ['config'] },
    dtos: { mayDependOn: ['dtos', 'common'] },
    entities: { mayDependOn: ['entities', 'common'] },
    controllers: { mayDependOn: ['providers', 'dtos', 'entities', 'common', 'config'] },
    providers: { mayDependOn: ['providers', 'dtos', 'entities', 'common', 'config'] },
    modules: {
      mayDependOn: ['controllers', 'providers', 'dtos', 'entities', 'common', 'config', 'modules'],
    },
  },
  rules: [
    {
      name: 'feature-modules-are-boundaries',
      type: 'forbidden-import',
      from: { match: 'src/*/**' },
      to: { match: 'src/*/**' },
      except: { sameModule: true, publicApi: ['**/*.module.ts', 'src/common/**', 'src/config/**'] },
      severity: 'error',
    },
    { name: 'no-feature-module-cycles', type: 'no-cycles', scope: 'module', severity: 'error' },
    {
      name: 'controllers-must-not-touch-repositories',
      type: 'forbidden-import',
      from: { match: 'src/**/*.controller.ts' },
      to: { match: 'src/**/*.repository.ts' },
      severity: 'error',
    },
  ],
  expectations: [
    {
      name: 'controllers-are-decorated-classes',
      expect: { path: 'src/**/*.controller.ts' },
      to: { be: ['class'], haveDecorator: ['Controller'], haveSuffix: ['Controller'], notHave: ['defaultExport'] },
      ignoring: ['**/*.spec.ts'],
      severity: 'error',
    },
    {
      name: 'controllers-are-not-providers',
      expect: { path: 'src/**/*.controller.ts' },
      to: { notHaveDecorator: ['Injectable'] },
      ignoring: ['**/*.spec.ts'],
      severity: 'error',
    },
    {
      name: 'controllers-use-DI-not-new',
      expect: { path: 'src/**/*.controller.ts' },
      to: { notInstantiate: ['*Service', '*Repository', 'PrismaClient'] },
      ignoring: ['**/*.spec.ts'],
      severity: 'error',
    },
    {
      name: 'services-are-injectable-classes',
      expect: { path: 'src/**/*.service.ts' },
      to: { be: ['class'], haveDecorator: ['Injectable'], haveSuffix: ['Service'], notHave: ['defaultExport'] },
      ignoring: ['**/*.spec.ts'],
      severity: 'error',
    },
    {
      name: 'modules-are-decorated-classes',
      expect: { path: 'src/**/*.module.ts' },
      to: { be: ['class'], haveDecorator: ['Module'], haveSuffix: ['Module'], notHave: ['defaultExport'] },
      ignoring: ['**/*.spec.ts'],
      severity: 'error',
    },
    {
      name: 'dtos-are-classes',
      expect: { path: 'src/**/dto/**/*.ts' },
      to: { be: ['class'], haveSuffix: ['Dto'], notHave: ['defaultExport'] },
      ignoring: ['src/**/dto/index.ts'],
      severity: 'error',
    },
    {
      name: 'providers-do-not-use-console-or-exit',
      expect: { path: 'src/**/*.service.ts' },
      to: { notCall: ['console.log', 'console.error', 'process.exit'] },
      ignoring: ['**/*.spec.ts'],
      severity: 'error',
    },
    {
      name: 'providers-must-not-instantiate-injectables',
      expect: { path: 'src/**/*.service.ts' },
      to: { notInstantiate: ['*Service', '*Repository', 'PrismaClient'] },
      ignoring: ['**/*.spec.ts'],
      severity: 'error',
    },
    {
      name: 'guards-pipes-filters-interceptors-are-injectable',
      expect: { path: 'src/common/{guards,pipes,filters,interceptors}/**/*.ts' },
      to: { be: ['class'], haveDecorator: ['Injectable'], notHave: ['defaultExport'] },
      ignoring: ['src/common/**/index.ts', '**/*.spec.ts'],
      severity: 'error',
    },
    {
      name: 'entities-are-classes',
      expect: { path: 'src/**/*.entity.ts' },
      to: { be: ['class'], haveSuffix: ['Entity'], notHave: ['defaultExport'] },
      ignoring: ['**/*.spec.ts'],
      severity: 'warning',
    },
  ],
};

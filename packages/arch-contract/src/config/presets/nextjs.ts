import type { PresetFragment } from './types.js';
import { DOMAIN_FORBIDDEN_PACKAGES } from './_clean-arch-base.js';

// Next.js App Router: app/** is presentation (pages, route handlers, server
// actions, components); business logic lives in src/{domain,application,
// infrastructure} as Clean Architecture (Next is unopinionated about it).
const INFRA_PATHS = ['src/infrastructure/**', 'infrastructure/**', 'src/infra/**', 'infra/**', 'src/server/**', 'server/**'];
const ORM_PACKAGES = ['@prisma/client', '@prisma/client/*', 'prisma', 'drizzle-orm', 'drizzle-orm/*', 'mongoose', 'typeorm'];

export const NEXTJS: PresetFragment = {
  layers: [
    {
      name: 'presentation-routing',
      match: [
        'src/app/**/{page,layout,loading,error,global-error,not-found,template,default}.{ts,tsx,js,jsx}',
        'app/**/{page,layout,loading,error,global-error,not-found,template,default}.{ts,tsx,js,jsx}',
      ],
    },
    { name: 'route-handler', match: ['src/app/**/route.{ts,js}', 'app/**/route.{ts,js}'] },
    {
      name: 'server-action',
      match: [
        'src/app/**/_actions/**/*.{ts,tsx}',
        'app/**/_actions/**/*.{ts,tsx}',
        'src/app/**/*.action.{ts,tsx}',
        'app/**/*.action.{ts,tsx}',
        'src/server/actions/**/*.{ts,tsx}',
      ],
    },
    {
      name: 'presentation-components',
      match: [
        'src/app/**/_components/**/*.{ts,tsx}',
        'app/**/_components/**/*.{ts,tsx}',
        'src/components/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'src/app/**/*.{tsx,jsx}',
        'app/**/*.{tsx,jsx}',
      ],
    },
    { name: 'application', match: ['src/application/**/*.{ts,tsx}', 'src/use-cases/**/*.{ts,tsx}'] },
    { name: 'domain', match: ['src/domain/**/*.{ts,tsx}', 'src/core/**/*.{ts,tsx}'] },
    { name: 'infrastructure', match: INFRA_PATHS.map((p) => `${p}/*.{ts,tsx}`).concat(INFRA_PATHS) },
    // composition root: the DI container that wires concrete infra into use-cases
    { name: 'composition', match: ['src/composition/**/*.{ts,tsx}', 'src/lib/container.{ts,tsx}', 'src/lib/di/**/*.{ts,tsx}'] },
    { name: 'shared', match: ['src/lib/**/*.{ts,tsx}', 'src/utils/**/*.{ts,tsx}', 'src/types/**/*.{ts,tsx}'] },
  ],
  ruleset: {
    'presentation-routing': {
      mayDependOn: ['presentation-components', 'server-action', 'application', 'domain', 'composition', 'shared'],
    },
    'route-handler': { mayDependOn: ['application', 'domain', 'composition', 'shared'] },
    'server-action': { mayDependOn: ['application', 'domain', 'composition', 'shared'] },
    'presentation-components': {
      mayDependOn: ['presentation-components', 'server-action', 'domain', 'shared'],
    },
    application: { mayDependOn: ['domain', 'shared'] },
    domain: { mayDependOn: [] },
    infrastructure: { mayDependOn: ['domain', 'application', 'shared'] },
    composition: { mayDependOn: ['application', 'domain', 'infrastructure', 'shared'] },
    shared: { mayDependOn: [] },
  },
  rules: [{ name: 'no-file-cycles', type: 'no-cycles', scope: 'file', severity: 'error' }],
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
      name: 'application-is-framework-free',
      expect: { layer: 'application' },
      to: { notDependOnPackages: ['next', 'next/*', 'react', 'react-dom', ...ORM_PACKAGES] },
      severity: 'error',
    },
    {
      name: 'route-handlers-and-actions-do-not-import-the-orm-directly',
      expect: { path: ['src/app/**/route.{ts,js}', 'app/**/route.{ts,js}', 'src/app/**/_actions/**/*.{ts,tsx}', 'app/**/_actions/**/*.{ts,tsx}'] },
      to: { notDependOnPackages: ORM_PACKAGES, notDependOnPaths: INFRA_PATHS },
      severity: 'error',
    },
    {
      name: 'components-do-not-import-the-orm-or-infrastructure',
      expect: { layer: 'presentation-components' },
      to: { notDependOnPackages: ORM_PACKAGES, notDependOnPaths: INFRA_PATHS },
      ignoring: ['**/*.spec.ts', '**/*.test.ts'],
      severity: 'error',
    },
  ],
};

import type { RawExpectation, RawRule } from '../schema.js';
import type { PresetFragment } from './types.js';

/**
 * Internal builder shared by the clean-architecture-derived presets. NOT a public
 * preset (underscore prefix → excluded from the registry / `presets` listing).
 * It emits only the invariant skeleton (4 layers + inward-only ruleset + domain
 * purity + no-cycles); each preset composes it with framework-specific globs and
 * appends its own layers/rules/expectations.
 */

/** Packages a pure domain layer must never import (frameworks, ORMs, HTTP clients). */
export const DOMAIN_FORBIDDEN_PACKAGES = [
  '@nestjs/*',
  '@adonisjs/*',
  'encore.dev',
  'encore.dev/*',
  'express',
  'fastify',
  'koa',
  'elysia',
  'next',
  'next/*',
  '@tanstack/*',
  'react',
  'react-dom',
  '@prisma/client',
  '@prisma/client/*',
  'prisma',
  'typeorm',
  '@mikro-orm/*',
  'mongoose',
  'sequelize',
  'drizzle-orm',
  'drizzle-orm/*',
  'knex',
  'pg',
  'mysql2',
  'ioredis',
  'axios',
  'undici',
  'node-fetch',
];

export interface CleanArchOptions {
  domain: string[];
  application: string[];
  infrastructure: string[];
  presentation: string[];
  /** optional framework-free leaf kernel (utils/types) that every layer may use */
  shared?: string[];
  /** extra packages the domain must not import (on top of DOMAIN_FORBIDDEN_PACKAGES) */
  extraDomainForbiddenPackages?: string[];
}

/** The canonical clean-architecture skeleton: layers + inward-only ruleset + domain purity + no-cycles. */
export function makeCleanArchBase(o: CleanArchOptions): PresetFragment {
  const sharedDep = o.shared !== undefined ? ['shared'] : [];

  const layers = [
    ...(o.shared !== undefined ? [{ name: 'shared', match: o.shared }] : []),
    { name: 'domain', match: o.domain },
    { name: 'application', match: o.application },
    { name: 'infrastructure', match: o.infrastructure },
    { name: 'presentation', match: o.presentation },
  ];

  const ruleset: Record<string, { mayDependOn: string[] }> = {
    domain: { mayDependOn: [] },
    application: { mayDependOn: ['domain', ...sharedDep] },
    infrastructure: { mayDependOn: ['domain', 'application', ...sharedDep] },
    presentation: { mayDependOn: ['domain', 'application', ...sharedDep] },
    ...(o.shared !== undefined ? { shared: { mayDependOn: [] } } : {}),
  };

  const rules: RawRule[] = [
    { name: 'no-file-cycles', type: 'no-cycles', scope: 'file' },
    { name: 'no-layer-cycles', type: 'no-cycles', scope: 'layer' },
  ];

  const expectations: RawExpectation[] = [
    {
      name: 'domain-is-framework-free',
      expect: { layer: 'domain' },
      to: {
        notDependOnPackages: [
          ...DOMAIN_FORBIDDEN_PACKAGES,
          ...(o.extraDomainForbiddenPackages ?? []),
        ],
      },
      severity: 'error',
    },
    {
      name: 'domain-has-no-default-or-namespace-export',
      expect: { layer: 'domain' },
      to: { notHave: ['defaultExport', 'namespaceExport'] },
      severity: 'error',
    },
  ];

  return { layers, ruleset, rules, expectations };
}

const DEFAULT_IGNORING = ['**/index.ts', '**/*.spec.ts', '**/*.test.ts'];

/**
 * Use-cases are single-responsibility classes named `*UseCase` exposing
 * `execute()`. `appliesTo: class` scopes the checks to the class only, so a
 * co-located input/command DTO interface in the same file is ignored.
 */
export function useCaseExpectation(match: string | string[]): RawExpectation {
  return {
    name: 'use-cases-are-classes-with-execute',
    expect: { path: match },
    appliesTo: { kind: ['class'] },
    to: { haveSuffix: ['UseCase'], haveMethod: ['execute'] },
    ignoring: DEFAULT_IGNORING,
    severity: 'error',
  };
}

/** Ports are interfaces; concrete repositories (classes) implement a `*RepositoryPort`/`*Repository`. */
export function repositoryPortExpectations(
  portMatch: string | string[],
  repoMatch: string | string[],
): RawExpectation[] {
  return [
    {
      name: 'repository-ports-are-interfaces',
      expect: { path: portMatch },
      to: { be: ['interface', 'type'] },
      ignoring: DEFAULT_IGNORING,
      severity: 'error',
    },
    {
      name: 'concrete-repositories-implement-a-port',
      expect: { path: repoMatch },
      appliesTo: { kind: ['class'] },
      to: { implement: ['*RepositoryPort', '*Repository', '*Port'] },
      ignoring: DEFAULT_IGNORING,
      severity: 'error',
    },
  ];
}

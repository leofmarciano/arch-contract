import type { Selector, Severity, SymbolKind } from '../core/types.js';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun' | 'deno';

export interface NormalizedProject {
  name: string;
  language: 'typescript';
  packageManager: PackageManager;
  /** absolute POSIX path to tsconfig, or null */
  tsconfig: string | null;
}

export interface NormalizedLayer {
  name: string;
  /** glob patterns, relative to project root */
  match: string[];
}

export type RuleType =
  | 'forbidden-import'
  | 'allowed-dependency'
  | 'no-cycles'
  | 'public-api-boundary';

export interface RuleBase {
  name: string;
  severity: Severity;
}

export interface ForbiddenImportRule extends RuleBase {
  type: 'forbidden-import';
  from: Selector;
  to: Selector;
  except: { sameModule: boolean; publicApi: string[] };
}

export interface AllowedDependencyRule extends RuleBase {
  type: 'allowed-dependency';
  from: Selector;
  allow: Selector;
}

export interface NoCyclesRule extends RuleBase {
  type: 'no-cycles';
  scope: 'file' | 'layer' | 'module';
}

export interface PublicApiBoundaryRule extends RuleBase {
  type: 'public-api-boundary';
  except: { sameModule: boolean };
}

export type NormalizedRule =
  | ForbiddenImportRule
  | AllowedDependencyRule
  | NoCyclesRule
  | PublicApiBoundaryRule;

export type Clause =
  | { kind: 'be'; values: SymbolKind[] }
  | { kind: 'extend'; values: string[] }
  | { kind: 'implement'; values: string[] }
  | { kind: 'haveMethod'; values: string[] }
  | { kind: 'haveDecorator'; values: string[] }
  | { kind: 'notHaveDecorator'; values: string[] }
  | { kind: 'notCall'; values: string[] }
  | { kind: 'notInstantiate'; values: string[] }
  | { kind: 'haveSuffix'; values: string[] }
  | { kind: 'notHave'; values: Array<'defaultExport' | 'namespaceExport'> }
  | { kind: 'export'; mode: 'namedOnly' }
  | { kind: 'onlyBeUsedIn'; values: string[] }
  | { kind: 'notBeUsedIn'; values: string[] }
  | { kind: 'notDependOnPackages'; values: string[] }
  | { kind: 'notDependOnPaths'; values: string[] };

export type ClauseKind = Clause['kind'];

export interface NormalizedExpectation {
  name: string;
  selector: Selector;
  clauses: Clause[];
  ignoring: string[];
  severity: Severity;
  /**
   * Restrict declaration-level clauses (be/extend/implement/haveMethod/
   * haveDecorator/notHaveDecorator/haveSuffix) to declarations of these kinds.
   * E.g. `{ kind: ['class'] }` checks only classes, so a co-located input type
   * in a `*.use-case.ts` file is ignored.
   */
  appliesTo?: { kind: SymbolKind[] };
}

export type AgentOnFailure = 'fix-before-finish' | 'warn' | 'ignore';

export interface NormalizedAgent {
  enabled: boolean;
  validationCommand: string;
  /** target markdown files / globs, relative to project root */
  updateDocs: string[];
  markdownBlockId: string;
  instructions: string[];
  /** commands to run after a task */
  afterTask: string[];
  onFailure: AgentOnFailure;
  configChangePolicy: { requireHumanApproval: boolean };
}

export interface NormalizedBaseline {
  enabled: boolean;
  /** absolute POSIX path, or null when no baseline configured */
  path: string | null;
  createIfMissing: boolean;
}

export interface NormalizedModules {
  /** glob identifying a module root, with the module name as the last segment, e.g. `src/modules/*` */
  pattern: string;
  /** public-api/barrel filename, e.g. `index.ts` */
  publicApi: string;
}

export type UnassignedFilesPolicy = 'ignore' | 'warn' | 'error';

export interface NormalizedConfig {
  version: 1;
  project: NormalizedProject;
  paths: { include: string[]; exclude: string[] };
  layers: NormalizedLayer[];
  ruleset: Record<string, { mayDependOn: string[] }>;
  rules: NormalizedRule[];
  expectations: NormalizedExpectation[];
  agent: NormalizedAgent;
  baseline: NormalizedBaseline;
  modules: NormalizedModules;
  unassignedFiles: UnassignedFilesPolicy;
  /** absolute POSIX path of the config file */
  sourcePath: string;
  /** absolute POSIX project root (the directory containing the config file) */
  rootDir: string;
}

export const DEFAULT_MARKDOWN_BLOCK_ID = 'arch-contract-agent-contract';
export const DEFAULT_EXCLUDES = [
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.mock.ts',
  '**/__tests__/**',
  '**/node_modules/**',
  '**/dist/**',
];
export const DEFAULT_MODULE_PATTERN = 'src/modules/*';
export const DEFAULT_MODULE_PUBLIC_API = 'index.ts';

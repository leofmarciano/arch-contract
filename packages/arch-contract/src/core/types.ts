/**
 * Canonical, cross-subsystem type contract for arch-contract.
 *
 * This file is the single source of truth for the shapes shared between
 * config, parser/indices, the rule engine, reporters and baseline. Other
 * modules MUST import these types and never re-declare them, so the whole
 * pipeline agrees on one `Violation`, one `Selector`, one set of index facts.
 */

/** A diagnostic level. Default across the tool is `error`. */
export type Severity = 'error' | 'warning';

/** Kind of a top-level TypeScript declaration. */
export type SymbolKind =
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'function'
  | 'const'
  | 'unknown';

/**
 * Uniform target selector, consumed verbatim by both dependency rules
 * (`from`/`to`) and AST expectations (`expect`). No field renaming downstream.
 */
export type Selector =
  | { kind: 'glob'; patterns: string[] }
  | { kind: 'layer'; layer: string };

/**
 * The unified violation emitted by every rule (graph and AST alike) and
 * consumed by reporters and baseline. `file` is POSIX, relative to project root.
 */
export interface Violation {
  /** rule id or expectation name, e.g. `layer-boundary` or `controllers-must-be-classes` */
  rule: string;
  severity: Severity;
  /** POSIX path relative to project root */
  file: string;
  line?: number;
  column?: number;
  /** imported file (rel), package name, offending symbol — whatever the rule is about */
  target?: string;
  /** the offending declaration/symbol name, when applicable */
  symbol?: string;
  message: string;
  suggestion?: string;
  /** stable, human-readable composite key, e.g. `rule:src/a.ts:express` */
  fingerprint: string;
  /** ordered cycle members (rel POSIX) — only for `no-cycles` */
  cyclePath?: string[];
}

export interface Summary {
  errors: number;
  warnings: number;
  /** number of violations suppressed by the baseline */
  ignored: number;
  rulesEvaluated: number;
  passed: boolean;
}

export interface CheckResult {
  summary: Summary;
  violations: Violation[];
}

// --------------------------------------------------------------------------
// Parser / index record contracts (produced by the parser, read by rules).
// All `path`/`targetFile` values are ABSOLUTE POSIX; `relPath` is relative.
// --------------------------------------------------------------------------

export interface FileRecord {
  /** absolute POSIX path */
  path: string;
  /** POSIX path relative to project root */
  relPath: string;
  layer: string | null;
  module: string | null;
}

export type ImportKind = 'named' | 'default' | 'namespace' | 'side-effect';

export interface ImportRecord {
  /** raw module specifier, e.g. `./foo`, `@app/bar`, `lodash/fp` */
  specifier: string;
  /** absolute POSIX path of an intra-project target, else null */
  targetFile: string | null;
  isExternalPackage: boolean;
  /** bare package name, e.g. `lodash`, `@nestjs/common`, else null */
  packageName: string | null;
  /** named import identifiers (does not include default/namespace local names) */
  importedSymbols: string[];
  kinds: ImportKind[];
  isTypeOnly: boolean;
  line: number;
  column: number;
}

export interface ExportRecord {
  name: string;
  kind: SymbolKind;
  isDefaultExport: boolean;
  isReExport: boolean;
  /** for re-exports: absolute POSIX target file, else null */
  reExportedFrom: string | null;
}

export interface DecoratorRecord {
  name: string;
  line: number;
  column: number;
}

export interface MethodRecord {
  name: string;
  decorators: DecoratorRecord[];
  line: number;
  column: number;
}

export interface DeclarationRecord {
  /** declaration name; empty string for an anonymous default export */
  name: string;
  kind: SymbolKind;
  isExported: boolean;
  isDefaultExport: boolean;
  isAbstract: boolean;
  /** base class name (classes) or null */
  extendsName: string | null;
  /** implemented interface names (classes) */
  implementsNames: string[];
  decorators: DecoratorRecord[];
  methods: MethodRecord[];
  line: number;
  column: number;
}

export interface CallRecord {
  /** full dotted callee text, e.g. `console.log`, `process.exit` */
  calleeText: string;
  /** root identifier of the callee, e.g. `console` */
  rootIdentifier: string;
  line: number;
  column: number;
}

export interface NewRecord {
  /** instantiated class name, e.g. `PrismaClient`, `UserRepository` */
  className: string;
  line: number;
  column: number;
}

/** All AST facts extracted from a single source file. */
export interface FileFacts {
  file: FileRecord;
  imports: ImportRecord[];
  exports: ExportRecord[];
  declarations: DeclarationRecord[];
  calls: CallRecord[];
  news: NewRecord[];
}

/** A file that uses (imports) one or more exported symbols of another file. */
export interface UsageEntry {
  /** absolute POSIX path of the using file */
  userFile: string;
  importedSymbols: string[];
  line: number;
  column: number;
}

/**
 * The read model handed to the rule engine. Aggregates per-file facts plus
 * the derived indices (layer/module assignment and reverse usage). Built once.
 */
export interface AnalysisContext {
  /** absolute POSIX project root */
  rootDir: string;
  /** every analyzed file, in deterministic order */
  files: FileFacts[];
  /** lookup by absolute POSIX path */
  getFile(absPath: string): FileFacts | undefined;
  layerOf(absPath: string): string | null;
  moduleOf(absPath: string): string | null;
  /** files that import any exported symbol of `absPath` */
  getUsersOfFile(absPath: string): UsageEntry[];
  /** absolute POSIX -> relative POSIX */
  rel(absPath: string): string;
}

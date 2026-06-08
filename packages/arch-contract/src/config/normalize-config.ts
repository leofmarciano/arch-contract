import type { Selector, SymbolKind } from '../core/types.js';
import { dirnamePosix, resolvePosix, toPosix } from '../project/path-utils.js';
import {
  DEFAULT_EXCLUDES,
  DEFAULT_MARKDOWN_BLOCK_ID,
  DEFAULT_MODULE_PATTERN,
  DEFAULT_MODULE_PUBLIC_API,
  type AgentOnFailure,
  type Clause,
  type NormalizedConfig,
  type NormalizedExpectation,
  type NormalizedRule,
} from './model.js';
import type { RawAgent, RawConfig, RawExpectation, RawRule, RawTo } from './schema.js';

export function toStringArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? [...v] : [v];
}

function ruleSelector(sel: { match?: string | string[]; layer?: string }): Selector {
  if (sel.layer !== undefined) return { kind: 'layer', layer: sel.layer };
  return { kind: 'glob', patterns: toStringArray(sel.match) };
}

export function toSelector(expect: { path?: string | string[]; layer?: string }): Selector {
  if (expect.layer !== undefined) return { kind: 'layer', layer: expect.layer };
  return { kind: 'glob', patterns: toStringArray(expect.path) };
}

/** Expand the authoring `to` object into an ordered list of discriminated clauses. */
export function expandClauses(to: RawTo): Clause[] {
  const clauses: Clause[] = [];
  if (to.be !== undefined) {
    clauses.push({ kind: 'be', values: toStringArray(to.be) as SymbolKind[] });
  }
  if (to.extend !== undefined) clauses.push({ kind: 'extend', values: toStringArray(to.extend) });
  if (to.implement !== undefined) {
    clauses.push({ kind: 'implement', values: toStringArray(to.implement) });
  }
  if (to.haveMethod !== undefined) {
    clauses.push({ kind: 'haveMethod', values: toStringArray(to.haveMethod) });
  }
  if (to.haveDecorator !== undefined) {
    clauses.push({ kind: 'haveDecorator', values: toStringArray(to.haveDecorator) });
  }
  if (to.notHaveDecorator !== undefined) {
    clauses.push({ kind: 'notHaveDecorator', values: toStringArray(to.notHaveDecorator) });
  }
  if (to.notCall !== undefined) clauses.push({ kind: 'notCall', values: toStringArray(to.notCall) });
  if (to.notInstantiate !== undefined) {
    clauses.push({ kind: 'notInstantiate', values: toStringArray(to.notInstantiate) });
  }
  if (to.haveSuffix !== undefined) {
    clauses.push({ kind: 'haveSuffix', values: toStringArray(to.haveSuffix) });
  }
  if (to.notHave !== undefined) {
    clauses.push({
      kind: 'notHave',
      values: toStringArray(to.notHave) as Array<'defaultExport' | 'namespaceExport'>,
    });
  }
  if (to.export !== undefined) clauses.push({ kind: 'export', mode: to.export.mode });
  if (to.onlyBeUsedIn !== undefined) {
    clauses.push({ kind: 'onlyBeUsedIn', values: toStringArray(to.onlyBeUsedIn) });
  }
  if (to.notBeUsedIn !== undefined) {
    clauses.push({ kind: 'notBeUsedIn', values: toStringArray(to.notBeUsedIn) });
  }
  if (to.notDependOnPackages !== undefined) {
    clauses.push({ kind: 'notDependOnPackages', values: toStringArray(to.notDependOnPackages) });
  }
  if (to.notDependOnPaths !== undefined) {
    clauses.push({ kind: 'notDependOnPaths', values: toStringArray(to.notDependOnPaths) });
  }
  return clauses;
}

function normalizeRule(raw: RawRule): NormalizedRule {
  const severity = raw.severity ?? 'error';
  switch (raw.type) {
    case 'forbidden-import':
      return {
        name: raw.name,
        type: 'forbidden-import',
        severity,
        from: ruleSelector(raw.from),
        to: ruleSelector(raw.to),
        except: {
          sameModule: raw.except?.sameModule ?? false,
          publicApi: toStringArray(raw.except?.publicApi),
        },
      };
    case 'allowed-dependency':
      return {
        name: raw.name,
        type: 'allowed-dependency',
        severity,
        from: ruleSelector(raw.from),
        allow: ruleSelector(raw.allow),
      };
    case 'no-cycles':
      return {
        name: raw.name,
        type: 'no-cycles',
        severity,
        scope: raw.scope ?? 'file',
      };
    case 'public-api-boundary':
      return {
        name: raw.name,
        type: 'public-api-boundary',
        severity,
        except: { sameModule: raw.except?.sameModule ?? true },
      };
  }
}

function normalizeExpectation(raw: RawExpectation): NormalizedExpectation {
  return {
    name: raw.name,
    selector: toSelector(raw.expect),
    clauses: expandClauses(raw.to),
    ignoring: toStringArray(raw.ignoring),
    severity: raw.severity ?? 'error',
  };
}

function normalizeAgent(raw: RawAgent | undefined): NormalizedConfig['agent'] {
  const onFailureRaw = raw?.onFailure;
  const onFailure: AgentOnFailure =
    onFailureRaw === undefined
      ? 'fix-before-finish'
      : typeof onFailureRaw === 'string'
        ? onFailureRaw
        : onFailureRaw.behavior;
  return {
    enabled: raw?.enabled ?? false,
    validationCommand: raw?.validationCommand ?? 'arch-contract check',
    // updateDocs stay relative globs, resolved against rootDir at sync time
    updateDocs: toStringArray(raw?.updateDocs),
    markdownBlockId: raw?.markdownBlockId ?? DEFAULT_MARKDOWN_BLOCK_ID,
    instructions: toStringArray(raw?.instructions),
    afterTask: toStringArray(raw?.afterTask?.run),
    onFailure,
    configChangePolicy: {
      requireHumanApproval: raw?.configChangePolicy?.requireHumanApproval ?? true,
    },
  };
}

function normalizeBaseline(
  raw: RawConfig['baseline'],
  rootDir: string,
): NormalizedConfig['baseline'] {
  if (raw === undefined) return { enabled: false, path: null, createIfMissing: false };
  if (typeof raw === 'string') {
    return { enabled: true, path: resolvePosix(rootDir, raw), createIfMissing: false };
  }
  const path = raw.path !== undefined ? resolvePosix(rootDir, raw.path) : null;
  return { enabled: path !== null, path, createIfMissing: raw.createIfMissing ?? false };
}

export function normalizeConfig(raw: RawConfig, ctx: { configPath: string }): NormalizedConfig {
  const sourcePath = toPosix(ctx.configPath);
  const rootDir = dirnamePosix(sourcePath);

  const include = toStringArray(raw.paths?.include);
  const exclude = toStringArray(raw.paths?.exclude);

  const ruleset: Record<string, { mayDependOn: string[] }> = {};
  for (const [layer, entry] of Object.entries(raw.ruleset ?? {})) {
    ruleset[layer] = { mayDependOn: toStringArray(entry?.mayDependOn) };
  }

  return {
    version: 1,
    project: {
      name: raw.project.name,
      language: raw.project.language ?? 'typescript',
      packageManager: raw.project.packageManager ?? 'pnpm',
      tsconfig: raw.project.tsconfig !== undefined ? resolvePosix(rootDir, raw.project.tsconfig) : null,
    },
    paths: {
      include: include.length > 0 ? include : ['src'],
      exclude: exclude.length > 0 ? exclude : [...DEFAULT_EXCLUDES],
    },
    layers: raw.layers.map((l) => ({ name: l.name, match: toStringArray(l.match) })),
    ruleset,
    rules: (raw.rules ?? []).map(normalizeRule),
    expectations: (raw.expectations ?? []).map(normalizeExpectation),
    agent: normalizeAgent(raw.agent),
    baseline: normalizeBaseline(raw.baseline, rootDir),
    modules: {
      pattern: raw.modules?.pattern ?? DEFAULT_MODULE_PATTERN,
      publicApi: raw.modules?.publicApi ?? DEFAULT_MODULE_PUBLIC_API,
    },
    unassignedFiles: raw.unassignedFiles ?? 'ignore',
    sourcePath,
    rootDir,
  };
}

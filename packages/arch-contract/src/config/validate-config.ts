import type { Selector } from '../core/types.js';
import { discoverConfig, type DiscoveryOptions } from './discovery.js';
import { ConfigValidationError, type ConfigIssue } from './errors.js';
import { loadConfigFile, type LoadedConfigSource } from './load-config.js';
import type { NormalizedConfig } from './model.js';
import { normalizeConfig } from './normalize-config.js';
import { applyPresets } from './presets.js';
import { configSchema } from './schema.js';
import { dirnamePosix } from '../project/path-utils.js';

export interface LoadConfigResult {
  config: NormalizedConfig;
  sourcePath: string;
}

function zodPath(path: Array<string | number>): string {
  return path.map((p) => String(p)).join('.');
}

function findDuplicates(names: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const n of names) {
    if (seen.has(n)) dups.add(n);
    seen.add(n);
  }
  return [...dups];
}

function layerRefs(sel: Selector): string[] {
  return sel.kind === 'layer' ? [sel.layer] : [];
}

/** Cross-reference checks that the schema cannot express. Aggregates every issue. */
function semanticIssues(config: NormalizedConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const layerNames = new Set(config.layers.map((l) => l.name));
  const known = `Known layers: ${[...layerNames].join(', ') || '(none)'}`;

  for (const dup of findDuplicates(config.layers.map((l) => l.name))) {
    issues.push({ path: 'layers', message: `Duplicate layer name "${dup}".` });
  }
  for (const dup of findDuplicates(config.rules.map((r) => r.name))) {
    issues.push({ path: 'rules', message: `Duplicate rule name "${dup}".` });
  }
  for (const dup of findDuplicates(config.expectations.map((e) => e.name))) {
    issues.push({ path: 'expectations', message: `Duplicate expectation name "${dup}".` });
  }

  for (const layer of Object.keys(config.ruleset)) {
    if (!layerNames.has(layer)) {
      issues.push({ path: `ruleset.${layer}`, message: `Unknown layer "${layer}". ${known}` });
    }
    for (const dep of config.ruleset[layer]?.mayDependOn ?? []) {
      if (!layerNames.has(dep)) {
        issues.push({
          path: `ruleset.${layer}.mayDependOn`,
          message: `Unknown layer "${dep}". ${known}`,
        });
      }
    }
  }

  config.rules.forEach((rule, i) => {
    const refs: string[] = [];
    if (rule.type === 'forbidden-import') refs.push(...layerRefs(rule.from), ...layerRefs(rule.to));
    if (rule.type === 'allowed-dependency') {
      refs.push(...layerRefs(rule.from), ...layerRefs(rule.allow));
    }
    for (const ref of refs) {
      if (!layerNames.has(ref)) {
        issues.push({ path: `rules.${i}`, message: `Unknown layer "${ref}". ${known}` });
      }
    }
  });

  config.expectations.forEach((exp, i) => {
    if (exp.selector.kind === 'layer' && !layerNames.has(exp.selector.layer)) {
      issues.push({
        path: `expectations.${i}.expect.layer`,
        message: `Unknown layer "${exp.selector.layer}". ${known}`,
      });
    }
  });

  return issues;
}

/** Schema-validate, normalize, and semantically validate a loaded config source. */
export function validateConfig(source: LoadedConfigSource): LoadConfigResult {
  // External presets resolve relative to the user's config file directory (so
  // their node_modules / relative paths are found there, not in arch-contract's).
  const baseDir = dirnamePosix(source.configPath);
  const parsed = configSchema.safeParse(applyPresets(source.raw, baseDir));
  if (!parsed.success) {
    const issues: ConfigIssue[] = parsed.error.issues.map((i) => ({
      path: zodPath(i.path),
      message: i.message,
    }));
    throw new ConfigValidationError(source.configPath, issues);
  }

  const config = normalizeConfig(parsed.data, { configPath: source.configPath });

  const semantic = semanticIssues(config);
  if (semantic.length > 0) {
    throw new ConfigValidationError(source.configPath, semantic);
  }

  return { config, sourcePath: config.sourcePath };
}

/** Discover + load + validate end to end. */
export function loadAndValidate(opts: DiscoveryOptions = {}): LoadConfigResult {
  const { configPath } = discoverConfig(opts);
  const source = loadConfigFile(configPath);
  return validateConfig(source);
}

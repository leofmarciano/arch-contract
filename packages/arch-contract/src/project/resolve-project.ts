import type { Project } from 'ts-morph';

import type { NormalizedConfig, NormalizedLayer } from '../config/model.js';
import type { AnalysisContext, FileFacts } from '../core/types.js';
import { moduleOf } from '../graph/module-boundary.js';
import { createProject } from '../parser/create-program.js';
import { readExportOrigins } from '../parser/export-reader.js';
import { readSourceFile } from '../parser/source-file-reader.js';
import { buildUsageIndex } from '../parser/usage-index.js';
import { discoverFilesOnDisk, makeMatcher, matchesGlobs } from './file-discovery.js';
import { relativePosix, toPosix } from './path-utils.js';
import { resolveTsConfig } from './resolve-tsconfig.js';

/** First layer whose glob set matches the file (declaration order, first-match-wins). */
export function assignLayer(relPath: string, layers: NormalizedLayer[]): string | null {
  for (const layer of layers) {
    if (makeMatcher(layer.match)(relPath)) return layer.name;
  }
  return null;
}

/** Build the AnalysisContext from an already-populated ts-morph Project. */
export function buildAnalysisContext(project: Project, config: NormalizedConfig): AnalysisContext {
  const rootDir = config.rootDir;
  const facts: FileFacts[] = [];
  const byPath = new Map<string, FileFacts>();
  const exportOrigins = new Map<string, Map<string, string>>();

  for (const sf of project.getSourceFiles()) {
    const abs = toPosix(sf.getFilePath());
    const rel = relativePosix(rootDir, abs);
    if (!matchesGlobs(rel, config.paths.include, config.paths.exclude)) continue;
    const f = readSourceFile(sf, rootDir);
    f.file.layer = assignLayer(rel, config.layers);
    f.file.module = moduleOf(rel, config.modules.pattern);
    facts.push(f);
    byPath.set(abs, f);
    exportOrigins.set(abs, readExportOrigins(sf));
  }

  facts.sort((a, b) =>
    a.file.relPath < b.file.relPath ? -1 : a.file.relPath > b.file.relPath ? 1 : 0,
  );

  const usageIndex = buildUsageIndex(facts, exportOrigins);

  return {
    rootDir,
    files: facts,
    getFile: (abs) => byPath.get(toPosix(abs)),
    layerOf: (abs) => byPath.get(toPosix(abs))?.file.layer ?? null,
    moduleOf: (abs) => byPath.get(toPosix(abs))?.file.module ?? null,
    getUsersOfFile: (abs) => usageIndex.getUsersOfFile(toPosix(abs)),
    rel: (abs) => relativePosix(rootDir, toPosix(abs)),
  };
}

/** Real-run entry: create a Project from config (tsconfig-aware), add disk files, analyze. */
export function analyzeProject(config: NormalizedConfig): AnalysisContext {
  let compilerOptions = {};
  if (config.project.tsconfig !== null) {
    try {
      compilerOptions = resolveTsConfig(config.project.tsconfig).compilerOptions;
    } catch {
      compilerOptions = {};
    }
  }
  const project = createProject({ compilerOptions });
  const files = discoverFilesOnDisk(config.rootDir, config.paths.include, config.paths.exclude);
  for (const f of files) {
    try {
      project.addSourceFileAtPath(f);
    } catch {
      // unreadable/parse-error file — skip, do not abort the whole run
    }
  }
  return buildAnalysisContext(project, config);
}

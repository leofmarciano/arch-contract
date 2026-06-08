import { loadAndValidate } from '../../config/index.js';
import type { NormalizedConfig } from '../../config/model.js';
import type { CliDeps } from '../deps.js';
import { ExitCode } from '../exit-codes.js';
import { mapError } from '../map-error.js';

/** Render the allowed layer-dependency graph (from ruleset) as a mermaid flowchart. */
export function toMermaid(config: NormalizedConfig): string {
  const lines = ['graph TD'];
  const layers = Object.keys(config.ruleset).sort();
  for (const layer of layers) {
    const deps = config.ruleset[layer]?.mayDependOn ?? [];
    if (deps.length === 0) {
      lines.push(`  ${layer}`);
    } else {
      for (const dep of [...deps].sort()) lines.push(`  ${layer} --> ${dep}`);
    }
  }
  return lines.join('\n');
}

export interface GraphOptions {
  config?: string;
  format?: string;
}

export function runGraphCommand(opts: GraphOptions, deps: CliDeps): ExitCode {
  let config;
  try {
    ({ config } = loadAndValidate({
      cwd: deps.cwd,
      ...(opts.config !== undefined ? { explicitPath: opts.config } : {}),
    }));
  } catch (err) {
    return mapError(err, deps);
  }

  const format = opts.format ?? 'mermaid';
  if (format === 'stub') {
    deps.stdout.write(`Layers: ${config.layers.map((l) => l.name).join(', ')}\n`);
  } else {
    deps.stdout.write(`${toMermaid(config)}\n`);
  }
  return ExitCode.Ok;
}

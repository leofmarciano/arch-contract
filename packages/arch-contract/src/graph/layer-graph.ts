import type { AnalysisContext } from '../core/types.js';

export interface LayerGraph {
  layers: string[];
  /** layer -> set of layers it depends on (self-edges omitted) */
  edges: Map<string, Set<string>>;
}

/** Collapse the file dependency graph onto layers. */
export function buildLayerGraph(analysis: AnalysisContext): LayerGraph {
  const layers = new Set<string>();
  const edges = new Map<string, Set<string>>();

  for (const f of analysis.files) {
    const from = f.file.layer;
    if (from === null) continue;
    layers.add(from);
    if (!edges.has(from)) edges.set(from, new Set());
    for (const imp of f.imports) {
      if (imp.targetFile === null) continue;
      const to = analysis.layerOf(imp.targetFile);
      if (to === null || to === from) continue;
      layers.add(to);
      (edges.get(from) as Set<string>).add(to);
    }
  }

  return { layers: [...layers].sort(), edges };
}

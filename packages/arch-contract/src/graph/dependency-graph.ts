import type { AnalysisContext } from '../core/types.js';

export interface DependencyGraph {
  /** absolute POSIX node ids */
  nodes: string[];
  /** abs -> set of abs (intra-project edges only) */
  edges: Map<string, Set<string>>;
  outEdges(file: string): string[];
}

/** Build the file-level dependency graph: nodes are analyzed files, edges are resolved intra-project imports. */
export function buildDependencyGraph(analysis: AnalysisContext): DependencyGraph {
  const nodeSet = new Set(analysis.files.map((f) => f.file.path));
  const edges = new Map<string, Set<string>>();
  for (const node of nodeSet) edges.set(node, new Set());

  for (const f of analysis.files) {
    const from = f.file.path;
    const set = edges.get(from) as Set<string>;
    for (const imp of f.imports) {
      const target = imp.targetFile;
      if (target !== null && nodeSet.has(target)) set.add(target);
    }
  }

  return {
    nodes: [...nodeSet],
    edges,
    outEdges: (file) => [...(edges.get(file) ?? [])],
  };
}

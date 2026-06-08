import type { NoCyclesRule } from '../../config/model.js';
import { findCycles, type Graphlike } from '../../graph/cycle-detector.js';
import { createViolation } from '../violations.js';
import type { Rule, RuleContext } from '../rule-context.js';

/** Build the graph for the requested cycle scope. */
function scopeGraph(ctx: RuleContext, scope: 'file' | 'layer' | 'module'): {
  graph: Graphlike;
  label(id: string): string;
} {
  if (scope === 'file') {
    return { graph: ctx.graph, label: (id) => ctx.rel(id) };
  }
  const key = (abs: string): string | null =>
    scope === 'layer' ? ctx.layerOf(abs) : ctx.moduleOf(abs);
  const nodes = new Set<string>();
  const edges = new Map<string, Set<string>>();
  for (const f of ctx.analysis.files) {
    const from = key(f.file.path);
    if (from === null) continue;
    nodes.add(from);
    if (!edges.has(from)) edges.set(from, new Set());
    for (const target of ctx.graph.outEdges(f.file.path)) {
      const to = key(target);
      if (to === null || to === from) continue;
      nodes.add(to);
      (edges.get(from) as Set<string>).add(to);
    }
  }
  return { graph: { nodes: [...nodes], edges }, label: (id) => id };
}

export function noCyclesRule(cfg: NoCyclesRule): Rule {
  return {
    id: cfg.name,
    check(ctx: RuleContext) {
      const { graph, label } = scopeGraph(ctx, cfg.scope);
      const violations = [];
      for (const cycle of findCycles(graph)) {
        const members = cycle.map(label);
        const first = members[0] as string;
        violations.push(
          createViolation({
            rule: cfg.name,
            severity: cfg.severity,
            file: first,
            cyclePath: members,
            message: `Dependency cycle (${cfg.scope}): ${members.join(' -> ')} -> ${first}.`,
            suggestion: 'Break the cycle by introducing an interface or inverting a dependency.',
          }),
        );
      }
      return violations;
    },
  };
}

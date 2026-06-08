/**
 * Tarjan strongly-connected-components. Returns cycles: every SCC of size >= 2,
 * plus self-loops (size-1 components whose node points at itself). Each cycle's
 * members are sorted by id for deterministic, rotation-stable output.
 */
export interface Graphlike {
  nodes: string[];
  edges: Map<string, Set<string>>;
}

export function tarjanScc(graph: Graphlike): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  let counter = 0;

  // Iterative Tarjan to avoid stack overflow on large graphs.
  for (const start of graph.nodes) {
    if (index.has(start)) continue;
    const work: Array<{ node: string; iter: Iterator<string> }> = [
      { node: start, iter: (graph.edges.get(start) ?? new Set<string>()).values() },
    ];
    index.set(start, counter);
    low.set(start, counter);
    counter++;
    stack.push(start);
    onStack.add(start);

    while (work.length > 0) {
      const frame = work[work.length - 1] as { node: string; iter: Iterator<string> };
      const next = frame.iter.next();
      if (!next.done) {
        const w = next.value;
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter);
          counter++;
          stack.push(w);
          onStack.add(w);
          work.push({ node: w, iter: (graph.edges.get(w) ?? new Set<string>()).values() });
        } else if (onStack.has(w)) {
          low.set(frame.node, Math.min(low.get(frame.node) as number, index.get(w) as number));
        }
      } else {
        if ((low.get(frame.node) as number) === (index.get(frame.node) as number)) {
          const comp: string[] = [];
          for (;;) {
            const w = stack.pop() as string;
            onStack.delete(w);
            comp.push(w);
            if (w === frame.node) break;
          }
          components.push(comp);
        }
        work.pop();
        const parent = work[work.length - 1];
        if (parent) {
          low.set(
            parent.node,
            Math.min(low.get(parent.node) as number, low.get(frame.node) as number),
          );
        }
      }
    }
  }

  return components;
}

export function findCycles(graph: Graphlike): string[][] {
  const cycles: string[][] = [];
  for (const comp of tarjanScc(graph)) {
    if (comp.length >= 2) {
      cycles.push([...comp].sort());
    } else if (comp.length === 1) {
      const node = comp[0] as string;
      if (graph.edges.get(node)?.has(node)) cycles.push([node]);
    }
  }
  // Deterministic ordering of cycles by their first member.
  return cycles.sort((a, b) => ((a[0] as string) < (b[0] as string) ? -1 : 1));
}

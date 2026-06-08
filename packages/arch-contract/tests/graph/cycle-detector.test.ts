import { describe, expect, it } from 'vitest';

import { findCycles, tarjanScc, type Graphlike } from '../../src/graph/cycle-detector.js';

function graph(adj: Record<string, string[]>): Graphlike {
  return {
    nodes: Object.keys(adj),
    edges: new Map(Object.entries(adj).map(([k, v]) => [k, new Set(v)])),
  };
}

describe('findCycles', () => {
  it('finds no cycles in a DAG', () => {
    expect(findCycles(graph({ a: ['b'], b: ['c'], c: [] }))).toEqual([]);
  });

  it('detects a simple two-node cycle', () => {
    expect(findCycles(graph({ a: ['b'], b: ['a'] }))).toEqual([['a', 'b']]);
  });

  it('detects a three-node cycle with all members', () => {
    const cycles = findCycles(graph({ a: ['b'], b: ['c'], c: ['a'] }));
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(['a', 'b', 'c']);
  });

  it('detects two independent cycles', () => {
    const cycles = findCycles(graph({ a: ['b'], b: ['a'], x: ['y'], y: ['x'] }));
    expect(cycles).toHaveLength(2);
  });

  it('detects a self-loop as a length-1 cycle', () => {
    expect(findCycles(graph({ a: ['a'] }))).toEqual([['a']]);
  });

  it('does not report nodes that merely point into a cycle', () => {
    const cycles = findCycles(graph({ entry: ['a'], a: ['b'], b: ['a'] }));
    expect(cycles).toEqual([['a', 'b']]);
  });

  it('canonicalizes cycle member order regardless of traversal start', () => {
    const c1 = findCycles(graph({ a: ['b'], b: ['c'], c: ['a'] }))[0];
    const c2 = findCycles(graph({ c: ['a'], a: ['b'], b: ['c'] }))[0];
    expect(c1).toEqual(c2);
  });

  it('terminates on a large fan graph (smoke)', () => {
    const adj: Record<string, string[]> = { hub: [] };
    for (let i = 0; i < 500; i++) adj[`n${i}`] = ['hub'];
    expect(findCycles(graph(adj))).toEqual([]);
  });
});

describe('tarjanScc', () => {
  it('returns each node as its own component in a DAG', () => {
    const comps = tarjanScc(graph({ a: ['b'], b: [] }));
    expect(comps.flat().sort()).toEqual(['a', 'b']);
  });
});

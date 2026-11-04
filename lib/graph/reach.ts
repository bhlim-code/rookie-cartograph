import type { Edge } from '../parser/types.ts';

export const DEFAULT_DEPTH = 2;

export type AdjacencyGraph = {
  outgoing: Map<string, Set<string>>;
  incoming: Map<string, Set<string>>;
};

export function adjacency(edges: Edge[]): AdjacencyGraph {
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  for (const e of edges) {
    if (e.typeOnly) continue;
    const outSet = outgoing.get(e.source) ?? new Set();
    outSet.add(e.target);
    outgoing.set(e.source, outSet);

    const inSet = incoming.get(e.target) ?? new Set();
    inSet.add(e.source);
    incoming.set(e.target, inSet);
  }

  return { outgoing, incoming };
}

export type ReachResult = {
  steps: string[][];
  beyond: number;
};

export function reach(
  graph: AdjacencyGraph,
  from: string,
  direction: 'dependents' | 'dependencies',
  depth: number = DEFAULT_DEPTH
): ReachResult {
  const map = direction === 'dependents' ? graph.incoming : graph.outgoing;
  const visited = new Set<string>([from]);
  const steps: string[][] = [];
  let currentLevel = new Set<string>([from]);

  for (let d = 0; d < depth; d++) {
    const nextLevel = new Set<string>();
    for (const node of currentLevel) {
      for (const neighbor of map.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nextLevel.add(neighbor);
        }
      }
    }
    if (nextLevel.size === 0) {
      steps.push([]);
    } else {
      const sortedNext = [...nextLevel].sort();
      steps.push(sortedNext);
      currentLevel = nextLevel;
    }
  }

  // Count beyond depth
  let beyond = 0;
  let current = currentLevel;
  const visitedBeyond = new Set<string>(visited);
  while (current.size > 0) {
    const next = new Set<string>();
    for (const node of current) {
      for (const neighbor of map.get(node) ?? []) {
        if (!visitedBeyond.has(neighbor)) {
          visitedBeyond.add(neighbor);
          next.add(neighbor);
          beyond++;
        }
      }
    }
    current = next;
  }

  return { steps, beyond };
}

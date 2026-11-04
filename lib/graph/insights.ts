import type { Edge, ParsedFile } from '../parser/types.ts';

export type Cycle = {
  members: number;
  files: string[];
};

export type InsightsResult = {
  unimported: ParsedFile[];
  heavilyImported: {
    files: ParsedFile[];
    threshold: number;
  };
  cycles: Cycle[];
  long: ParsedFile[];
};

export function findInsights(
  files: ParsedFile[],
  edges: Edge[]
): InsightsResult {
  const unimported = files.filter(
    (f) => f.fanIn === 0 && f.reachedBy === null
  );

  const fanInThreshold = 5;
  const heavilyImportedFiles = files
    .filter((f) => f.fanIn >= fanInThreshold)
    .sort((a, b) => b.fanIn - a.fanIn);

  const long = [...files].sort((a, b) => b.lines - a.lines);

  // Simple cycle detection (SCC via Tarjan or simple DFS)
  const cycles = findCycles(files, edges);

  return {
    unimported,
    heavilyImported: {
      files: heavilyImportedFiles,
      threshold: fanInThreshold,
    },
    cycles,
    long,
  };
}

function findCycles(files: ParsedFile[], edges: Edge[]): Cycle[] {
  const adj = new Map<string, string[]>();
  for (const f of files) adj.set(f.path, []);
  for (const e of edges) {
    if (e.typeOnly) continue;
    const list = adj.get(e.source) ?? [];
    list.push(e.target);
    adj.set(e.source, list);
  }

  const cycles: Cycle[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    visited.add(node);
    stack.add(node);
    path.push(node);

    for (const neighbor of adj.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (stack.has(neighbor)) {
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycleFiles = path.slice(cycleStartIndex);
          if (cycleFiles.length > 1) {
            cycles.push({
              members: cycleFiles.length,
              files: cycleFiles,
            });
          }
        }
      }
    }

    path.pop();
    stack.delete(node);
  }

  for (const f of files) {
    if (!visited.has(f.path)) {
      dfs(f.path);
    }
  }

  return cycles;
}

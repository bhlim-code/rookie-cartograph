import type { Edge, ParsedFile } from '../parser/types.ts';
import type { FoldingResult } from './fold.ts';

export const ABOVE_HANDLE = '▲';
export const BELOW_HANDLE = '▼';
export const MAX_PANEL_ROWS = 12;

export type CanvasRow = {
  path: string;
  name: string;
  fanIn: number;
  fanOut: number;
  role: string | null;
};

export type CanvasObject =
  | {
      kind: 'node';
      id: string;
      dir: string;
      label: string;
      fileCount: number;
      fanIn: number;
      fanOut: number;
      height: number;
      width: number;
    }
  | {
      kind: 'panel';
      id: string;
      dir: string;
      label: string;
      fileCount: number;
      fanIn: number;
      fanOut: number;
      rows: CanvasRow[];
      scrolls: boolean;
      offset: number;
    };

export type CanvasEdge = {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  kind: string;
};

export type CanvasView = {
  objects: CanvasObject[];
  edges: CanvasEdge[];
};

export function groupId(dir: string): string {
  return dir === '.' ? 'root' : dir.replace(/[/]/g, '-');
}

export function buildView(
  files: ParsedFile[],
  edges: Edge[],
  folding: FoldingResult,
  expanded: Map<string, number>
): CanvasView {
  const fileToGroup = new Map<string, string>();
  for (const group of folding.groups) {
    const id = groupId(group.dir);
    for (const f of group.files) {
      fileToGroup.set(f.path, id);
    }
  }

  // Compute metrics per group
  const groupFiles = new Map<string, ParsedFile[]>();
  for (const group of folding.groups) {
    groupFiles.set(groupId(group.dir), group.files);
  }

  // Build objects
  const objects: CanvasObject[] = [];
  for (const group of folding.groups) {
    const id = groupId(group.dir);
    const gFiles = group.files;
    const fileCount = gFiles.length;

    // Fan-in/fan-out for the group or sum
    let fanIn = 0;
    let fanOut = 0;
    for (const f of gFiles) {
      fanIn += f.fanIn;
      fanOut += f.fanOut;
    }

    const label = shortLabel(group.dir);
    const isExpanded = expanded.has(id);

    if (isExpanded) {
      const offset = expanded.get(id) ?? 0;
      const sortedFiles = [...gFiles].sort((a, b) => b.fanIn - a.fanIn);
      const visibleFiles = sortedFiles.slice(
        offset,
        offset + MAX_PANEL_ROWS
      );
      const rows: CanvasRow[] = visibleFiles.map((f) => ({
        path: f.path,
        name: shortFileName(f.path),
        fanIn: f.fanIn,
        fanOut: f.fanOut,
        role: f.role,
      }));
      const scrolls = gFiles.length > MAX_PANEL_ROWS;

      objects.push({
        kind: 'panel',
        id,
        dir: group.dir,
        label,
        fileCount,
        fanIn,
        fanOut,
        rows,
        scrolls,
        offset,
      });
    } else {
      // height based on fanIn, width based on label length
      const height = Math.max(36, 24 + Math.min(60, fanIn * 4));
      const width = Math.max(100, label.length * 8 + 32);

      objects.push({
        kind: 'node',
        id,
        dir: group.dir,
        label,
        fileCount,
        fanIn,
        fanOut,
        height,
        width,
      });
    }
  }

  // Map edges
  const canvasEdges: CanvasEdge[] = [];
  const seenEdges = new Set<string>();

  for (const e of edges) {
    const srcGroup = fileToGroup.get(e.source);
    const tgtGroup = fileToGroup.get(e.target);
    if (!srcGroup || !tgtGroup) continue;

    const srcExpanded = expanded.has(srcGroup);
    const tgtExpanded = expanded.has(tgtGroup);

    const source = srcGroup;
    const target = tgtGroup;
    const sourceHandle = srcExpanded ? e.source : undefined;
    const targetHandle = tgtExpanded ? e.target : undefined;

    const edgeKey = `${source}:${sourceHandle ?? ''}→${target}:${targetHandle ?? ''}:${e.kind}`;
    if (seenEdges.has(edgeKey)) continue;
    seenEdges.add(edgeKey);

    canvasEdges.push({
      source,
      target,
      sourceHandle,
      targetHandle,
      kind: e.kind,
    });
  }

  return { objects, edges: canvasEdges };
}

function shortLabel(dir: string): string {
  if (dir === '.') return '.';
  const parts = dir.split('/');
  return parts[parts.length - 1] ?? dir;
}

function shortFileName(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? path : path.slice(slash + 1);
}

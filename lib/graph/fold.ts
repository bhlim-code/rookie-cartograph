import type { ParsedFile } from '../parser/types.ts';

export type FolderGroup = {
  dir: string;
  files: ParsedFile[];
};

export type FoldingResult = {
  groups: FolderGroup[];
  threshold: number;
};

export function foldDirectories(files: ParsedFile[]): FoldingResult {
  let threshold = 2;
  let groups = computeFold(files, threshold);

  while (groups.length > 24 && threshold < 10) {
    threshold++;
    groups = computeFold(files, threshold);
  }

  return { groups, threshold };
}

function computeFold(files: ParsedFile[], threshold: number): FolderGroup[] {
  const dirMap = new Map<string, ParsedFile[]>();
  for (const file of files) {
    const d = file.module;
    const list = dirMap.get(d) ?? [];
    list.push(file);
    dirMap.set(d, list);
  }

  let changed = true;
  const activeDirs = new Map<string, ParsedFile[]>(dirMap);

  while (changed) {
    changed = false;
    const dirs = [...activeDirs.keys()].sort((a, b) => {
      const depthA = a === '.' ? 0 : a.split('/').length;
      const depthB = b === '.' ? 0 : b.split('/').length;
      if (depthB !== depthA) return depthB - depthA;
      return b.length - a.length;
    });

    for (const dir of dirs) {
      if (dir === '.') continue;
      const currentFiles = activeDirs.get(dir);
      if (!currentFiles || currentFiles.length >= threshold) continue;

      // Merge into parent
      const parent = parentDir(dir);
      const parentFiles = activeDirs.get(parent) ?? [];
      parentFiles.push(...currentFiles);
      activeDirs.set(parent, parentFiles);
      activeDirs.delete(dir);
      changed = true;
    }
  }

  return [...activeDirs.entries()].map(([dir, fList]) => ({
    dir,
    files: fList,
  }));
}

function parentDir(dir: string): string {
  const slash = dir.lastIndexOf('/');
  return slash === -1 ? '.' : dir.slice(0, slash) || '.';
}

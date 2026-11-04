import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { Project } from 'ts-morph';
import {
  deserializeParseResult,
  serializeParseResult,
  validateParseResult,
} from '../lib/parser/contract.ts';
import { extractExports, extractImports } from '../lib/parser/extract.ts';
import { dedupeEdges, fanCounts } from '../lib/parser/graph.ts';
import { parseRepository } from '../lib/parser/index.ts';
import type { Edge, ParseResult } from '../lib/parser/types.ts';

// File helpers for the data-file contract tests. contract.ts stays free of
// filesystem imports, so reading and writing live here.
async function readParseResultFile(filePath: string): Promise<ParseResult> {
  return deserializeParseResult(await readFile(filePath, 'utf8'));
}

function writeParseResultFile(filePath: string, result: ParseResult): void {
  writeFileSync(filePath, serializeParseResult(result), 'utf8');
}

const roots: string[] = [];
after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cartograph-parser-'));
  roots.push(root);
  for (const [filePath, contents] of Object.entries(files)) {
    const absolute = path.join(root, filePath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  }
  return root;
}

function sourceOf(text: string, fileName = 'sample.ts') {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true, noLib: true, noResolve: true },
  });
  return project.createSourceFile(fileName, text);
}

describe('extraction', () => {
  test('plain imports, re-exports and literal dynamic imports become candidates', () => {
    const source = sourceOf(`
      import { a } from './a';
      import type { B } from './b';
      export { c } from './c';
      export * from './d';
      const name = './e';
      import(name);
      import('./e');
    `);
    const found = extractImports(source);
    assert.deepEqual(
      found.map((entry) => [entry.kind, entry.literal, entry.line]),
      [
        ['import', true, 2],
        ['import', true, 3],
        ['re-export', true, 4],
        ['re-export', true, 5],
        ['dynamic-import', false, 7],
        ['dynamic-import', true, 8],
      ]
    );
    assert.equal(found[1]?.typeOnly, true);
    assert.equal(found[4]?.literal, false);
  });

  test('exports are read from ESM and CommonJS syntax', () => {
    const source = sourceOf(`
      export const a = 1;
      export function b() {}
      export default class C {}
      export { d as e } from './d';
      module.exports = { f, g };
      exports.h = 1;
    `);
    assert.deepEqual(extractExports(source), [
      'a',
      'b',
      'default',
      'e',
      'f',
      'g',
      'h',
    ]);
  });

  test('an export assignment is one whole-module export, not a name guess', () => {
    const source = sourceOf(`
      const value = 1;
      module.exports = value;
    `);
    assert.deepEqual(extractExports(source), ['module.exports']);
  });
});

describe('graph arithmetic', () => {
  test('duplicates collapse before fan counts, across kinds', () => {
    const edges: Edge[] = [
      {
        source: 'a.ts',
        target: 'b.ts',
        kind: 'import',
        typeOnly: true,
        specifier: './b',
        line: 1,
      },
      {
        source: 'a.ts',
        target: 'b.ts',
        kind: 'import',
        typeOnly: false,
        specifier: './b',
        line: 2,
      },
      {
        source: 'a.ts',
        target: 'b.ts',
        kind: 're-export',
        typeOnly: false,
        specifier: './b',
        line: 3,
      },
      {
        source: 'c.ts',
        target: 'b.ts',
        kind: 'import',
        typeOnly: false,
        specifier: './b',
        line: 1,
      },
    ];
    const deduped = dedupeEdges(edges);
    assert.equal(deduped.length, 3);
    assert.equal(deduped.find((e) => e.kind === 'import')?.typeOnly, false);
    const counts = fanCounts(['a.ts', 'b.ts', 'c.ts'], edges);
    assert.deepEqual(counts.get('a.ts'), { fanIn: 0, fanOut: 1 });
    assert.deepEqual(counts.get('b.ts'), { fanIn: 2, fanOut: 0 });
    assert.deepEqual(counts.get('c.ts'), { fanIn: 0, fanOut: 1 });
  });
});

describe('parsing a repository', () => {
  const root = fixture({
    'package.json': JSON.stringify({ name: 'fixture' }),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        paths: { '@/*': ['src/*'] },
      },
    }),
    'src/index.ts': `
      import { add } from './math';
      import { helper } from '@/lib/helper';
      export { add as plus } from './math';
      export * from './barrel';
      const name = './math';
      import(name);
      import('./math');
    `,
    'src/math.ts':
      'export function add(a: number, b: number) { return a + b; }\n',
    'src/barrel/index.ts': `
      export { add } from '../math';
      export * from '../lib/helper';
    `,
    'src/lib/helper.ts': 'export const helper = 1;\n',
    'src/types.d.ts': 'declare const global: number;\n',
    'src/broken.ts': 'export const = ;\n',
    'src/binary.ts': 'const value = 1;\0\n',
  });
  let result: ParseResult;

  test('counts add up and every skip names a reason', () => {
    result = parseRepository(root);
    assert.equal(result.coverage.files.found, 7);
    assert.equal(result.coverage.files.parsed, 4);
    assert.equal(result.coverage.files.skipped, 3);
    assert.deepEqual(
      result.coverage.files.skippedFiles.map((f) => [f.path, f.reason]),
      [
        ['src/binary.ts', 'binary'],
        ['src/broken.ts', 'syntax-error'],
        ['src/types.d.ts', 'declaration-file'],
      ]
    );
    assert.ok(
      result.files.every((f) => f.module === path.posix.dirname(f.path))
    );
  });

  test('barrels and aliases resolve; literal dynamic imports are edges', () => {
    assert.equal(result.coverage.imports.byKind['re-export'].seen, 4);
    assert.equal(result.coverage.imports.byKind['re-export'].internal, 4);
    assert.equal(
      result.edges.some(
        (e) =>
          e.kind === 're-export' &&
          e.source === 'src/barrel/index.ts' &&
          e.target === 'src/math.ts'
      ),
      true
    );
    assert.equal(
      result.edges.some(
        (e) =>
          e.kind === 'import' &&
          e.source === 'src/index.ts' &&
          e.target === 'src/lib/helper.ts'
      ),
      true
    );
    assert.equal(
      result.edges.some(
        (e) =>
          e.kind === 'dynamic-import' &&
          e.source === 'src/index.ts' &&
          e.target === 'src/math.ts'
      ),
      true
    );
  });

  test('a computed dynamic import is unresolved with a reason, not dropped', () => {
    assert.equal(result.coverage.imports.unresolved.length, 1);
    assert.deepEqual(
      {
        from: result.coverage.imports.unresolved[0]?.from,
        specifier: result.coverage.imports.unresolved[0]?.specifier,
        reason: result.coverage.imports.unresolved[0]?.reason,
      },
      {
        from: 'src/index.ts',
        specifier: 'name',
        reason: 'non-literal-dynamic-import',
      }
    );
  });

  test('fan counts follow the deduped edges', () => {
    const index = result.files.find((f) => f.path === 'src/index.ts');
    const math = result.files.find((f) => f.path === 'src/math.ts');
    assert.equal(index?.fanOut, 3);
    assert.equal(math?.fanIn, 2);
  });

  test('a renamed target becomes exactly one unresolved import', () => {
    const copied = fixture({
      'src/index.ts': "import { helper } from './lib/helper';\n",
      'src/lib/helper.ts': 'export const helper = 1;\n',
      'src/lib/other.ts': 'export const other = 1;\n',
    });
    // Rename the imported file without touching its importer.
    renameSync(
      path.join(copied, 'src/lib/helper.ts'),
      path.join(copied, 'src/lib/renamed.ts')
    );
    const renamed = parseRepository(copied);
    assert.equal(renamed.coverage.imports.unresolved.length, 1);
    assert.equal(renamed.coverage.imports.unresolved[0]?.from, 'src/index.ts');
    assert.equal(
      renamed.coverage.imports.unresolved[0]?.reason,
      'file-not-found'
    );
    assert.match(
      renamed.coverage.imports.unresolved[0]?.detail ?? '',
      /src\/lib\/helper/
    );
  });
});

describe('the data-file contract', () => {
  const root = fixture({
    'src/index.ts': "import { x } from './x';\nexport const y = x;\n",
    'src/x.ts': 'export const x = 1;\n',
  });
  const result = parseRepository(root);

  test('a typed module and JSON round-trip without changing a value', async () => {
    for (const name of ['map.mts', 'map.json']) {
      const file = path.join(root, name);
      writeParseResultFile(file, result);
      const read = await readParseResultFile(file);
      assert.deepEqual(read, result);
    }
  });

  test('a dangling edge is rejected', async () => {
    const bad = structuredClone(result) as ParseResult;
    const edge = bad.edges[0];
    assert.ok(edge);
    edge.target = 'src/missing.ts';
    assert.throws(() => validateParseResult(bad), /not a parsed file/);
  });

  test('a fan count that disagrees with the edges is rejected', () => {
    const bad = structuredClone(result) as ParseResult;
    const file = bad.files.find((f) => f.path === 'src/x.ts');
    assert.ok(file);
    file.fanIn = 99;
    assert.throws(() => validateParseResult(bad), /fanIn/);
  });
});

import { Suspense } from 'react';
import analysisData from './analysis.json';
import { validateParseResult } from '@/lib/parser/contract';
import { foldDirectories } from '@/lib/graph/fold';
import { railCategories, railLabel } from '@/lib/roles';
import CanvasPreviewClient from '@/components/canvas-preview-client';

export const instant = false;

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className='p-6 text-xs text-fg-muted'>Loading preview...</div>}>
      <PreviewContent />
    </Suspense>
  );
}

function PreviewContent() {
  const result = validateParseResult(analysisData);

  const folding = foldDirectories(result.files);
  const rail = railCategories(
    result.projects.map((p) => p.adapter),
    result.files.map((f) => f.role)
  );

  return (
    <div className='flex h-screen w-screen overflow-hidden bg-canvas text-fg'>
      {/* Left Rail */}
      <aside className='w-56 shrink-0 border-r border-line bg-surface p-3 overflow-y-auto'>
        <div className='mb-3 font-mono text-xs font-semibold tracking-tight text-fg'>
          cartograph / preview
        </div>
        <div className='text-[0.6875rem] text-fg-muted mb-2 uppercase tracking-wider'>
          Categories ({rail.filter((c) => c.count > 0).length})
        </div>
        <ul className='space-y-1.5 text-xs'>
          {rail.map((c, i) => {
            const swatchClass =
              i % 4 === 0
                ? 'bg-kind-1'
                : i % 4 === 1
                  ? 'bg-kind-2'
                  : i % 4 === 2
                    ? 'bg-kind-3'
                    : 'bg-kind-4';
            return (
              <li key={c.key} className='flex items-center justify-between py-1'>
                <div className='flex items-center gap-2'>
                  <span className={`h-2.5 w-2.5 rounded-sm ${swatchClass}`} />
                  <span className={c.count === 0 ? 'text-fg-muted' : ''}>
                    {railLabel(c.key)}
                  </span>
                </div>
                <span className='font-mono text-fg-muted tabular-nums'>
                  {c.count}
                </span>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Middle Canvas */}
      <main className='flex-1 min-w-0 flex flex-col'>
        <CanvasPreviewClient
          files={result.files}
          edges={result.edges}
          folding={folding}
        />
      </main>

      {/* Right Detail Pane (Empty column as specified) */}
      <aside className='w-72 shrink-0 border-l border-line bg-surface p-4 flex flex-col'>
        <div className='text-xs font-medium text-fg-muted uppercase tracking-wider mb-2'>
          Detail
        </div>
        <div className='text-xs text-fg-muted italic'>
          No item selected.
        </div>
      </aside>
    </div>
  );
}

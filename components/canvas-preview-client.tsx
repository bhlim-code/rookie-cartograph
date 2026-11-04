'use client';

import { useState } from 'react';
import type { Edge, ParsedFile } from '@/lib/parser/types';
import { type FoldingResult } from '@/lib/graph/fold';
import {
  ABOVE_HANDLE,
  BELOW_HANDLE,
  buildView,
  MAX_PANEL_ROWS,
} from '@/lib/graph/view';

export default function CanvasPreviewClient({
  files,
  edges,
  folding,
}: {
  files: ParsedFile[];
  edges: Edge[];
  folding: FoldingResult;
}) {
  const [expanded, setExpanded] = useState<Map<string, number>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);

  const view = buildView(files, edges, folding, expanded);

  function toggleGroup(id: string) {
    const next = new Map(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.set(id, 0); // Open at top (refit / zoom out behavior)
    }
    setExpanded(next);
  }

  function scrollPanel(id: string, direction: 'up' | 'down', totalCount: number) {
    const next = new Map(expanded);
    const current = next.get(id) ?? 0;
    const step = MAX_PANEL_ROWS;
    let newOffset = direction === 'up' ? current - step : current + step;
    newOffset = Math.max(0, Math.min(newOffset, Math.max(0, totalCount - step)));
    next.set(id, newOffset);
    setExpanded(next);
  }

  // Determine connected set for dimming when an item is selected
  const connectedIds = new Set<string>();
  if (selected) {
    connectedIds.add(selected);
    for (const e of edges) {
      if (e.source === selected || e.target === selected) {
        connectedIds.add(e.source);
        connectedIds.add(e.target);
      }
    }
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Top Bar */}
      <header className='flex h-9 shrink-0 items-center gap-4 border-b border-line px-4 bg-surface text-xs'>
        <span className='font-medium'>Canvas Preview</span>
        <span className='text-fg-muted'>
          {folding.groups.length} nodes · {files.length} files · threshold {folding.threshold}
        </span>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className='ml-auto text-xs text-accent hover:underline'
          >
            Clear selection ({selected})
          </button>
        )}
      </header>

      {/* Canvas Area */}
      <div className='min-h-0 flex-1 overflow-auto p-8 bg-canvas flex flex-wrap gap-6 items-start content-start select-none'>
        {view.objects.map((obj) => {
          const isSelected = selected === obj.id || (obj.kind === 'panel' && obj.rows.some((r) => r.path === selected));
          const isDimmed = selected !== null && !isSelected && !connectedIds.has(obj.id) && (obj.kind !== 'panel' || !obj.rows.some((r) => connectedIds.has(r.path)));

          if (obj.kind === 'node') {
            return (
              <div
                key={obj.id}
                onClick={() => toggleGroup(obj.id)}
                className={`group cursor-pointer rounded border border-line bg-raised p-3 shadow-sm transition-all hover:border-accent ${
                  isSelected ? 'ring-2 ring-accent' : ''
                } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                style={{ width: `${Math.max(160, obj.width)}px` }}
              >
                <div className='flex items-center justify-between text-xs font-mono font-medium'>
                  <span className='truncate text-accent'>{obj.label}</span>
                  <span className='text-fg-muted text-[0.6875rem]'>{obj.fileCount} files</span>
                </div>
                <div className='mt-2 flex items-center justify-between text-[0.6875rem] font-mono text-fg-muted'>
                  <span className='text-incoming'>←{obj.fanIn}</span>
                  <span className='text-outgoing'>{obj.fanOut}→</span>
                </div>
              </div>
            );
          }

          // Panel (Expanded)
          const totalFilesInGroup = folding.groups.find((g) => g.dir === obj.dir)?.files.length ?? obj.rows.length;

          return (
            <div
              key={obj.id}
              className={`rounded border border-line bg-surface shadow-md w-80 transition-all ${
                isSelected ? 'ring-2 ring-accent' : ''
              } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
            >
              {/* Panel Header (Clicking closes it) */}
              <div
                onClick={() => toggleGroup(obj.id)}
                className='flex cursor-pointer items-center justify-between border-b border-line bg-raised px-3 py-2 text-xs font-mono font-medium hover:bg-line/50'
              >
                <div className='flex items-center gap-2 truncate'>
                  <span className='text-accent font-semibold'>{obj.label}</span>
                  <span className='text-fg-muted text-[0.6875rem]'>({obj.fileCount} files)</span>
                </div>
                <div className='flex items-center gap-2 text-[0.6875rem] font-mono text-fg-muted'>
                  <span className='text-incoming'>←{obj.fanIn}</span>
                  <span className='text-outgoing'>{obj.fanOut}→</span>
                </div>
              </div>

              {/* Above Handle */}
              {obj.scrolls && obj.offset > 0 && (
                <div
                  onClick={() => scrollPanel(obj.id, 'up', totalFilesInGroup)}
                  className='flex cursor-pointer items-center justify-center border-b border-line bg-canvas py-1 text-[0.6875rem] text-fg-muted hover:bg-raised'
                >
                  {ABOVE_HANDLE} More above
                </div>
              )}

              {/* Rows */}
              <div className='divide-y divide-line/40 max-h-72 overflow-y-auto'>
                {obj.rows.map((row) => {
                  const rowSelected = selected === row.path;
                  const rowDimmed = selected !== null && !rowSelected && !connectedIds.has(row.path);
                  return (
                    <div
                      key={row.path}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(row.path);
                      }}
                      className={`flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs font-mono transition-colors hover:bg-raised ${
                        rowSelected ? 'bg-accent/10 text-accent font-semibold' : ''
                      } ${rowDimmed ? 'opacity-30' : 'opacity-100'}`}
                    >
                      <span className='truncate pr-2' title={row.path}>
                        {row.name}
                      </span>
                      <div className='flex items-center gap-2 text-[0.6875rem] text-fg-muted shrink-0'>
                        <span className='text-incoming'>←{row.fanIn}</span>
                        <span className='text-outgoing'>{row.fanOut}→</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Below Handle */}
              {obj.scrolls && obj.offset + MAX_PANEL_ROWS < totalFilesInGroup && (
                <div
                  onClick={() => scrollPanel(obj.id, 'down', totalFilesInGroup)}
                  className='flex cursor-pointer items-center justify-center border-t border-line bg-canvas py-1 text-[0.6875rem] text-fg-muted hover:bg-raised'
                >
                  {BELOW_HANDLE} More below
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

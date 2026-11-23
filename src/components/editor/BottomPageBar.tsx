import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Play,
  Pause,
  Film,
  X,
  ArrowLeft,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import { ProjectPageRecord } from '../../types';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { ModalPortal } from '../ModalPortal';

interface BottomPageBarProps {
  pages: ProjectPageRecord[];
  currentPageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onReorderPages: (newPages: ProjectPageRecord[]) => void;
  hasMediaElements: boolean;
  isPlayingPreview: boolean;
  onTogglePlayPreview: () => void;
  onOpenTimelineEditor: () => void;
}

export const BottomPageBar: React.FC<BottomPageBarProps> = ({
  pages,
  currentPageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onReorderPages,
  hasMediaElements,
  isPlayingPreview,
  onTogglePlayPreview,
  onOpenTimelineEditor,
}) => {
  const [isTrayCollapsed, setIsTrayCollapsed] = useState(false);
  const [isViewAllDrawerOpen, setIsViewAllDrawerOpen] = useState(false);
  const { backdropProps, contentProps } = useModalBehavior(
    isViewAllDrawerOpen,
    () => setIsViewAllDrawerOpen(false)
  );

  const movePage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    const reordered = [...pages];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorderPages(reordered);
  };

  return (
    <>
      {/* Bottom Bar Container */}
      <div
        data-testid="editor-bottom-bar"
        className="border-t editor-chrome-bar backdrop-blur-2xl flex flex-col z-20 select-none"
      >
        {/* Bar Toolbar / Header */}
        <div className="h-9 px-4 flex items-center justify-between border-b border-white/[0.04] text-xs">
          {/* Bottom Left: Conditional Media Controls */}
          <div className="flex items-center gap-2">
            {hasMediaElements && (
              <div className="flex items-center gap-1.5 pr-3 border-r border-white/[0.08] animate-fadeIn">
                <button
                  onClick={onTogglePlayPreview}
                  className={`py-1 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                    isPlayingPreview
                      ? 'bg-amber-400/10 text-amber-300 border-amber-400/20'
                      : 'bg-white/[0.05] text-slate-200 hover:text-white border-white/[0.08]'
                  }`}
                  title={isPlayingPreview ? 'Pause animation playback' : 'Play motion preview'}
                >
                  {isPlayingPreview ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play Preview</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onOpenTimelineEditor}
                  className="py-1 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-medium border border-white/[0.06] flex items-center gap-1.5 transition-colors"
                  title="Open Video/Audio Timeline Drawer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Edit Timeline</span>
                </button>
              </div>
            )}

            <div className="text-[11px] font-mono text-slate-400">
              Page {Math.max(1, pages.findIndex((p) => p.id === currentPageId) + 1)} of {pages.length}
            </div>
          </div>

          {/* Center: Circular Toggle Button to collapse/expand page tray */}
          <button
            onClick={() => setIsTrayCollapsed(!isTrayCollapsed)}
            className="w-6 h-6 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/[0.08] flex items-center justify-center transition-transform"
            title={isTrayCollapsed ? 'Expand Page Tray' : 'Collapse Page Tray'}
          >
            {isTrayCollapsed ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Right: View All Pages & Add Page */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsViewAllDrawerOpen(true)}
              className="py-1 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[11px] font-medium border border-white/[0.06] flex items-center gap-1.5 transition-colors"
              title="Open full-screen drawer to organize artboards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>View All Pages</span>
            </button>

            <button
              onClick={onAddPage}
              className="py-1 px-2.5 rounded-lg bg-white text-[#08080a] hover:bg-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-all shadow-sm"
              title="Add a new blank artboard page"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Page</span>
            </button>
          </div>
        </div>

        {/* Carousel Tray */}
        {!isTrayCollapsed && (
          <div className="h-24 px-4 py-2 flex items-center gap-3 overflow-x-auto overflow-y-hidden scrollbar-none animate-fadeIn">
            {pages.map((p, idx) => {
              const isActive = p.id === currentPageId;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPage(p.id)}
                  className={`group relative shrink-0 h-20 w-32 rounded-xl border p-1.5 flex flex-col justify-between cursor-pointer transition-all ${
                    isActive
                      ? 'bg-white/[0.1] border-white ring-1 ring-white/30 shadow-lg scale-[1.02]'
                      : 'bg-black/45 border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Thumbnail / Artboard Mini Preview */}
                  <div className="flex-1 w-full rounded-lg bg-black/60 overflow-hidden flex items-center justify-center relative">
                    {p.thumbnail ? (
                      <img
                        src={p.thumbnail}
                        alt={p.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="font-mono text-slate-600 text-xs">{idx + 1}</span>
                    )}

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicatePage(p.id);
                        }}
                        className="p-1 rounded bg-white/20 hover:bg-white/40 text-white"
                        title="Duplicate Page"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {pages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePage(p.id);
                          }}
                          className="p-1 rounded bg-rose-500/30 hover:bg-rose-500/60 text-white"
                          title="Delete Page"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Page label */}
                  <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium px-0.5 pt-1">
                    <span className="truncate">{p.name || `Page ${idx + 1}`}</span>
                    <span className="font-mono text-slate-500">#{idx + 1}</span>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Card */}
            <button
              onClick={onAddPage}
              className="shrink-0 h-20 w-24 rounded-xl border border-dashed border-white/10 hover:border-white/30 bg-white/[0.01] hover:bg-white/[0.04] text-slate-400 hover:text-white flex flex-col items-center justify-center gap-1 transition-all"
              title="Add Page"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-medium">Add</span>
            </button>
          </div>
        )}
      </div>

      {/* "VIEW ALL PAGES" FULL-SCREEN RIGHT DRAWER */}
      {isViewAllDrawerOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn"
            {...backdropProps}
          >
          <div
            className="w-full max-w-md h-full editor-chrome-panel backdrop-blur-2xl border-l shadow-2xl flex flex-col animate-slideLeft select-none"
            {...contentProps}
          >
            {/* Drawer Header */}
            <div className="h-14 px-5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-slate-300" />
                <h3 className="text-sm font-semibold text-white">Artboard Pages ({pages.length})</h3>
              </div>
              <button
                onClick={() => setIsViewAllDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pages Grid */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-3.5 content-start">
              {pages.map((p, idx) => {
                const isActive = p.id === currentPageId;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectPage(p.id);
                      setIsViewAllDrawerOpen(false);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-white/[0.08] border-white ring-1 ring-white/20'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video w-full rounded-lg bg-black/70 overflow-hidden flex items-center justify-center relative border border-white/[0.04]">
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt={p.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="font-mono text-slate-600 text-sm">{idx + 1}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200 truncate">{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                    </div>

                    {/* Page Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            movePage(idx, 'left');
                          }}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                          title="Move page earlier"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            movePage(idx, 'right');
                          }}
                          disabled={idx === pages.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                          title="Move page later"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicatePage(p.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Duplicate"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {pages.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePage(p.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/[0.06] bg-white/[0.01]">
              <button
                onClick={() => {
                  onAddPage();
                  setIsViewAllDrawerOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-[#08080a] font-semibold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Blank Artboard</span>
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
};

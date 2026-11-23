import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  ChevronDown,
  Copy,
  FilePlus,
  Printer,
  Compass,
  Grid,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  MoveRight,
  Maximize,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface EditorTopBarProps {
  documentTitle: string;
  onUpdateTitle: (newTitle: string) => void;
  onNavigateHome: () => void;
  // File options
  onDuplicatePage: () => void;
  onMovePage: () => void;
  onStartNewFile: () => void;
  onPrint: () => void;
  showBleedMargins: boolean;
  onToggleBleedMargins: () => void;
  showRulersGuides: boolean;
  onToggleRulersGuides: () => void;
  onOpenPublishTemplate: () => void;
  // History
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Zoom & Canvas Sizing
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  canvasWidth: number;
  canvasHeight: number;
  onResizeCanvas: (newWidth: number, newHeight: number) => void;
  // Export
  onOpenExportModal: () => void;
  saveStatus?: 'saved' | 'saving' | 'syncing-drive';
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  documentTitle,
  onUpdateTitle,
  onNavigateHome,
  onDuplicatePage,
  onMovePage,
  onStartNewFile,
  onPrint,
  showBleedMargins,
  onToggleBleedMargins,
  showRulersGuides,
  onToggleRulersGuides,
  onOpenPublishTemplate,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  canvasWidth,
  canvasHeight,
  onResizeCanvas,
  onOpenExportModal,
  saveStatus = 'saved',
}) => {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(documentTitle);

  const fileMenuRef = useRef<HTMLDivElement | null>(null);
  const zoomMenuRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Resize canvas form state inside dropdown
  const [customWidth, setCustomWidth] = useState(canvasWidth);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  useEffect(() => {
    setTitleInput(documentTitle);
  }, [documentTitle]);

  useEffect(() => {
    setCustomWidth(canvasWidth);
  }, [canvasWidth]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setIsFileMenuOpen(false);
      }
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target as Node)) {
        setIsZoomMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onUpdateTitle(titleInput.trim());
    } else {
      setTitleInput(documentTitle);
    }
  };

  const handleCustomWidthChange = (newWidth: number) => {
    setCustomWidth(newWidth);
    if (lockAspectRatio && canvasWidth > 0) {
      const ratio = canvasHeight / canvasWidth;
      const newHeight = Math.round(newWidth * ratio);
      onResizeCanvas(newWidth, newHeight);
    } else {
      onResizeCanvas(newWidth, canvasHeight);
    }
  };

  const handlePresetScale = (multiplier: number) => {
    const nw = Math.round(canvasWidth * multiplier);
    const nh = Math.round(canvasHeight * multiplier);
    onResizeCanvas(nw, nh);
    setIsZoomMenuOpen(false);
  };

  return (
    <header
      data-testid="editor-topbar"
      className="h-14 editor-chrome-bar backdrop-blur-2xl border-b flex items-center justify-between px-4 z-40 select-none"
    >
      {/* 1. FAR LEFT: Document Title & File Options Glass Dropdown */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Title editing */}
        <div className="flex items-center gap-2 group">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleInput(documentTitle);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="py-1 px-2.5 rounded-lg bg-white/[0.08] border border-white/20 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-white/30 max-w-[200px]"
            />
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="py-1 px-2.5 rounded-lg hover:bg-white/[0.05] text-[#f8fafc] text-xs font-semibold tracking-tight cursor-pointer transition-colors truncate max-w-[180px] sm:max-w-[220px]"
              title="Click to rename document"
            >
              {documentTitle}
            </div>
          )}

          {/* Local Save Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.04]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                saveStatus === 'saved'
                  ? 'bg-emerald-400'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{saveStatus === 'saved' ? 'Saved' : 'Saving...'}</span>
          </div>
        </div>

        {/* File Options Dropdown */}
        <div className="relative" ref={fileMenuRef}>
          <button
            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              isFileMenuOpen
                ? 'bg-white/[0.08] text-white border-white/[0.12]'
                : 'bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.06] border-white/[0.06]'
            }`}
            title="File Actions & Canvas Settings"
          >
            <span>File</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isFileMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-60 py-1.5 rounded-xl bg-[#0d0e12]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl z-50 animate-fadeIn text-xs text-slate-300 space-y-0.5">
              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onDuplicatePage();
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/[0.06] hover:text-white flex items-center gap-2.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Duplicate Page</span>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onMovePage();
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/[0.06] hover:text-white flex items-center gap-2.5 transition-colors"
              >
                <MoveRight className="w-3.5 h-3.5 text-slate-400" />
                <span>Move / Reorder Pages</span>
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onStartNewFile();
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/[0.06] hover:text-white flex items-center gap-2.5 transition-colors"
              >
                <FilePlus className="w-3.5 h-3.5 text-slate-400" />
                <span>Start New File</span>
              </button>

              <div className="my-1 border-t border-white/[0.06]" />

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onToggleBleedMargins();
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/[0.06] hover:text-white flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  <span>Bleed & Margins</span>
                </div>
                {showBleedMargins && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onToggleRulersGuides();
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/[0.06] hover:text-white flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Grid className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rulers & Guides</span>
                </div>
                {showRulersGuides && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

              <button
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onPrint();
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/[0.06] hover:text-white flex items-center gap-2.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Print Document</span>
              </button>

              <div className="my-1 border-t border-white/[0.06]" />

              <button
                type="button"
                data-testid="topbar-share-template-btn"
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onOpenPublishTemplate();
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/[0.06] hover:text-white flex items-center gap-2.5 text-slate-200 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Share / Submit Template</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTER: Scribe Logo ONLY (Clicking navigates to Main/Home view) */}
      <button
        onClick={onNavigateHome}
        className="w-9 h-9 rounded-xl hover:bg-white/[0.06] transition-all flex items-center justify-center p-1.5 focus:outline-none"
        title="Return to Home Dashboard"
        aria-label="Scribe Home"
      >
        <img
          src="/assets/aistudio/scribe-logo-white_7951e577.png"
          alt="Scribe Emblem"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </button>

      {/* 3. RIGHT SIDE: Zoom/Size Dropdown, Undo/Redo, Export Action */}
      <div className="flex items-center gap-2">
        {/* Zoom & Canvas Size Dropdown */}
        <div className="relative" ref={zoomMenuRef}>
          <button
            onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors border ${
              isZoomMenuOpen
                ? 'bg-white/[0.08] text-white border-white/[0.12]'
                : 'bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.06] border-white/[0.06]'
            }`}
            title="Zoom & Canvas Size Settings"
          >
            <span>{Math.round(zoomLevel * 100)}%</span>
            <span className="text-slate-500 hidden md:inline">|</span>
            <span className="text-slate-400 text-[11px] hidden md:inline">
              {canvasWidth}×{canvasHeight}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isZoomMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-64 py-2 px-3 rounded-xl bg-[#0d0e12]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl z-50 animate-fadeIn text-xs text-slate-300 space-y-2.5">
              {/* Zoom controls */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="text-slate-400 font-medium">Zoom View</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={onZoomOut}
                    className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-300 hover:text-white"
                    title="Zoom Out (Ctrl -)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-white text-[11px] px-1">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={onZoomIn}
                    className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-300 hover:text-white"
                    title="Zoom In (Ctrl +)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onFitToScreen}
                    className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-300 hover:text-white ml-1"
                    title="Fit to Screen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Aspect Scaling Presets */}
              <div className="space-y-1.5">
                <span className="text-slate-400 font-medium text-[11px]">
                  Scale Canvas (Preserves Aspect Ratio)
                </span>
                <div className="grid grid-cols-4 gap-1 font-mono text-[11px]">
                  {[0.5, 1, 1.5, 2].map((m) => (
                    <button
                      key={m}
                      onClick={() => handlePresetScale(m)}
                      className="py-1 rounded bg-white/[0.03] hover:bg-white/[0.08] hover:text-white border border-white/[0.06] text-center"
                    >
                      {m}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Canvas Dimensions Form */}
              <div className="pt-1.5 border-t border-white/[0.06] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Custom Width (px)</span>
                  <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                    <input
                      type="checkbox"
                      checked={lockAspectRatio}
                      onChange={(e) => setLockAspectRatio(e.target.checked)}
                      className="rounded bg-black/40 border-white/20 text-white"
                    />
                    <span>Lock Ratio</span>
                  </label>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <input
                    type="number"
                    min="100"
                    max="8000"
                    value={customWidth}
                    onChange={(e) => handleCustomWidthChange(Number(e.target.value))}
                    className="w-full py-1 px-2 rounded bg-black/40 border border-white/[0.08] text-white text-[11px] focus:outline-none focus:border-white/20"
                  />
                  <span className="text-slate-500">×</span>
                  <span className="text-slate-400 py-1 px-2 rounded bg-white/[0.02] border border-white/[0.04]">
                    {canvasHeight}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Undo & Redo */}
        <div className="flex items-center border border-white/[0.06] rounded-lg bg-white/[0.03] overflow-hidden">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-white/[0.06]" />
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* "Export" Action Button */}
        <button
          onClick={onOpenExportModal}
          className="py-1.5 px-3.5 rounded-lg bg-white hover:bg-slate-200 text-[#08080a] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          title="Export artboard formats (.png, .svg, .jpg, .webp, .scribe, video)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};

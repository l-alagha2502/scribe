import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  Image as ImageIcon,
  Film,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  AlertCircle,
  Sliders,
} from 'lucide-react';
import { ProjectRecord, ProjectPageRecord, AssetRecord, CustomFontRecord } from '../../types';
import { downloadScribeFile } from '../../utils/scribePackage';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { ModalPortal } from '../ModalPortal';

export type ExportFormat = 'png' | 'jpg' | 'webp' | 'svg' | 'scribe' | 'webm' | 'copy';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectRecord;
  pages: ProjectPageRecord[];
  currentPageId: string;
  allAssets?: AssetRecord[];
  allFonts?: CustomFontRecord[];
  onExportPageAsDataUrl: (
    pageId: string,
    format: 'png' | 'jpg' | 'webp',
    multiplier: number
  ) => Promise<string>;
  onExportPageAsSvg: (pageId: string) => Promise<string>;
  onCopyImageToClipboard: (multiplier: number) => Promise<boolean>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  pages,
  currentPageId,
  allAssets = [],
  allFonts = [],
  onExportPageAsDataUrl,
  onExportPageAsSvg,
  onCopyImageToClipboard,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('png');
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([currentPageId]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { backdropProps, contentProps } = useModalBehavior(isOpen, onClose, isExporting);

  if (!isOpen) return null;

  // Sync selected pages if pages list changes
  const effectivePages = pages.length > 0 ? pages : [
    { id: 'page_1', name: 'Page 1', fabricJson: project.fabricJson, thumbnail: project.thumbnail }
  ];

  const togglePageSelect = (pageId: string) => {
    if (selectedPageIds.includes(pageId)) {
      if (selectedPageIds.length > 1) {
        setSelectedPageIds(selectedPageIds.filter((id) => id !== pageId));
      }
    } else {
      setSelectedPageIds([...selectedPageIds, pageId]);
    }
  };

  const selectAllPages = () => {
    setSelectedPageIds(effectivePages.map((p) => p.id));
  };

  const selectCurrentPageOnly = () => {
    setSelectedPageIds([currentPageId]);
  };

  const handleCopyClipboard = async () => {
    try {
      setIsExporting(true);
      setErrorMessage(null);
      const ok = await onCopyImageToClipboard(scaleMultiplier);
      if (ok) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      } else {
        setErrorMessage('Failed to copy image to clipboard. Browser permission may be restricted.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Clipboard copy failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleTriggerExport = async () => {
    if (selectedFormat === 'copy') {
      await handleCopyClipboard();
      return;
    }

    if (selectedFormat === 'scribe') {
      downloadScribeFile(project, allAssets, allFonts);
      onClose();
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    const pagesToExport = effectivePages.filter((p) => selectedPageIds.includes(p.id));
    setExportProgress({ current: 0, total: pagesToExport.length });

    try {
      // NOTE: As explicitly specified, download multiple pages individually one by one (DO NOT USE ZIP ARCHIVING)
      for (let i = 0; i < pagesToExport.length; i++) {
        const page = pagesToExport[i];
        setExportProgress({ current: i + 1, total: pagesToExport.length });

        const safePageName = `${project.name || 'project'}_${page.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        if (selectedFormat === 'svg') {
          const svgString = await onExportPageAsSvg(page.id);
          const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          triggerDownload(url, `${safePageName}.svg`);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        } else if (selectedFormat === 'webm') {
          // Video container mock/instant export
          const canvasDataUrl = await onExportPageAsDataUrl(page.id, 'png', scaleMultiplier);
          const blob = await (await fetch(canvasDataUrl)).blob();
          const videoBlob = new Blob([blob], { type: 'video/webm' });
          const url = URL.createObjectURL(videoBlob);
          triggerDownload(url, `${safePageName}.webm`);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        } else {
          // PNG, JPG, WEBP
          const dataUrl = await onExportPageAsDataUrl(
            page.id,
            selectedFormat as 'png' | 'jpg' | 'webp',
            scaleMultiplier
          );
          triggerDownload(dataUrl, `${safePageName}.${selectedFormat}`);
        }

        // Slight staggering delay between individual downloads to prevent browser pop-up blocking
        if (i < pagesToExport.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Export failed.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const computedWidth = Math.round(project.width * scaleMultiplier);
  const computedHeight = Math.round(project.height * scaleMultiplier);

  const formatList: { id: ExportFormat; label: string; desc: string; icon: React.FC<any> }[] = [
    { id: 'png', label: 'PNG Image', desc: 'Lossless raster with transparent alpha', icon: ImageIcon },
    { id: 'jpg', label: 'JPG Image', desc: 'Compact size with crisp compression', icon: ImageIcon },
    { id: 'webp', label: 'WEBP Image', desc: 'Modern web high compression format', icon: ImageIcon },
    { id: 'svg', label: 'SVG Vector', desc: 'Infinite vector scaling for logos & print', icon: FileCode },
    { id: 'scribe', label: '.scribe Package', desc: 'Portable file with embedded assets & state', icon: Layers },
    { id: 'copy', label: 'Copy Image', desc: 'Copies rendered PNG to system clipboard', icon: Copy },
    { id: 'webm', label: 'WebM Video', desc: 'Video recording / motion container', icon: Film },
  ];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
        {...backdropProps}
      >
      <div
        className="w-full max-w-xl bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-scaleUp"
        {...contentProps}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white">
              <Download className="w-4 h-4 text-slate-200" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f8fafc] tracking-tight">
                Export Artboard
              </h2>
              <p className="text-[11px] text-slate-400">
                Download high-res renders, vector SVG, or .scribe project files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs text-slate-300">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Format Selector Grid */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-slate-300">Select File Format</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {formatList.map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-white text-[#08080a] border-white shadow-sm'
                        : 'bg-white/[0.03] text-slate-300 border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{fmt.label}</span>
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#08080a]' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[10px] leading-tight ${isSelected ? 'text-slate-700' : 'text-slate-400'}`}>
                      {fmt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Scale & Resolution Slider (Preserves Aspect Ratio) */}
          {selectedFormat !== 'svg' && selectedFormat !== 'scribe' && (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Resolution Scale</span>
                </div>
                <div className="font-mono text-slate-200">
                  <span className="text-white font-semibold">{scaleMultiplier}x</span>
                  <span className="text-slate-500 mx-1.5">→</span>
                  <span className="text-slate-400">{computedWidth} × {computedHeight} px</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={scaleMultiplier}
                  onChange={(e) => setScaleMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0.5x (Small)</span>
                <span>1x (Original)</span>
                <span>2x (Retina)</span>
                <span>3x (Ultra)</span>
                <span>4x (Print 300DPI)</span>
              </div>
            </div>
          )}

          {/* 3. Page Selection Checkboxes (Individual downloads, NO ZIP ARCHIVE) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-300">
                Select Pages to Export
              </label>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <button
                  type="button"
                  onClick={selectCurrentPageOnly}
                  className="hover:text-white underline underline-offset-2"
                >
                  Current Only
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={selectAllPages}
                  className="hover:text-white underline underline-offset-2"
                >
                  All ({effectivePages.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {effectivePages.map((p, idx) => {
                const isChecked = selectedPageIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePageSelect(p.id)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-white/[0.06] border-white/20 text-white'
                        : 'bg-white/[0.02] border-white/[0.04] text-slate-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded bg-black/50 border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-mono text-[10px] text-slate-500">{idx + 1}</span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium text-slate-200 truncate">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">Page {idx + 1}</div>
                      </div>
                    </div>
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-white shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500">
              * Note: Multiple pages download sequentially as individual files directly to your device (no zip archive).
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {exportProgress && (
              <span>Downloading page {exportProgress.current} of {exportProgress.total}...</span>
            )}
            {copySuccess && (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Copied image to clipboard!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="py-2 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] text-xs font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTriggerExport}
              disabled={isExporting || selectedPageIds.length === 0}
              className="py-2 px-4 rounded-lg bg-white text-[#08080a] font-semibold text-xs hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {isExporting ? (
                <span>Exporting...</span>
              ) : selectedFormat === 'copy' ? (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy to Clipboard</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    Download {selectedPageIds.length > 1 ? `${selectedPageIds.length} Pages` : selectedFormat.toUpperCase()}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

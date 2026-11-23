import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Eraser,
  Sliders,
  Download,
  ArrowRight,
  FolderPlus,
  RefreshCw,
  Check,
} from 'lucide-react';
import {
  removeBackgroundCanvas,
  eraseAtPoint,
  enhanceImageCanvas,
  downloadDataUrl,
} from '../utils/imageTools';
import { saveAsset, saveProject } from '../utils/db';
import { AssetRecord, ProjectRecord } from '../types';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { ModalPortal } from './ModalPortal';

interface QuickImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInEditor: (project: ProjectRecord) => void;
  onAssetSaved?: () => void;
}

export const QuickImageModal: React.FC<QuickImageModalProps> = ({
  isOpen,
  onClose,
  onOpenInEditor,
  onAssetSaved,
}) => {
  const [activeTool, setActiveTool] = useState<'bg-remove' | 'eraser' | 'enhance'>('bg-remove');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('image.png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Background removal options
  const [tolerance, setTolerance] = useState(35);
  const [feather, setFeather] = useState(2);

  // Eraser options
  const [brushSize, setBrushSize] = useState(28);

  // Enhancer options
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(15);
  const [saturation, setSaturation] = useState(10);
  const [sharpen, setSharpen] = useState(true);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const isMouseDownRef = useRef(false);
  const eraserCleanupRef = useRef<(() => void) | null>(null);
  const { backdropProps, contentProps } = useModalBehavior(isOpen, onClose, isProcessing);

  useEffect(() => {
    return () => {
      eraserCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!imageSrc && isOpen) {
      setImageSrc('/assets/aistudio/scribe-logo-noir_53887179.png');
      setFileName('scribe_emblem.png');
    }
  }, [isOpen, imageSrc]);

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      originalImageRef.current = img;
      resetCanvasToOriginal();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const resetCanvasToOriginal = () => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setImageSrc(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyBgRemoval = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsProcessing(true);
    setTimeout(() => {
      resetCanvasToOriginal();
      const processed = removeBackgroundCanvas(canvas, tolerance, feather);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(processed, 0, 0);
      }
      setIsProcessing(false);
    }, 50);
  };

  const handleApplyEnhancements = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsProcessing(true);
    setTimeout(() => {
      resetCanvasToOriginal();
      const enhanced = enhanceImageCanvas(canvas, {
        brightness,
        contrast,
        saturation,
        vibrance: 10,
        sharpen,
      });
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(enhanced, 0, 0);
      }
      setIsProcessing(false);
    }, 50);
  };

  const handleEraseEvent = (e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    eraseAtPoint(canvas, x, y, brushSize);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'eraser') return;
    e.preventDefault();
    isMouseDownRef.current = true;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    handleEraseEvent(e);

    const stopErasing = () => {
      isMouseDownRef.current = false;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('pointerup', stopErasing);
      window.removeEventListener('pointercancel', stopErasing);
      window.removeEventListener('blur', stopErasing);
      eraserCleanupRef.current = null;
    };

    eraserCleanupRef.current?.();
    eraserCleanupRef.current = stopErasing;
    window.addEventListener('pointerup', stopErasing);
    window.addEventListener('pointercancel', stopErasing);
    window.addEventListener('blur', stopErasing);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'eraser' || !isMouseDownRef.current) return;
    handleEraseEvent(e);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    downloadDataUrl(dataUrl, `processed_${fileName}`);
  };

  const handleSaveToAssets = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const newAsset: AssetRecord = {
      id: `asset_${Date.now()}`,
      name: `Processed - ${fileName}`,
      type: 'image',
      url: dataUrl,
      size: Math.round(dataUrl.length * 0.75),
      dimensions: `${canvas.width} × ${canvas.height}`,
      createdAt: Date.now(),
      isFavorite: false,
      category: 'assets',
    };
    await saveAsset(newAsset);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    if (onAssetSaved) onAssetSaved();
  };

  const handleOpenInEditor = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    const project: ProjectRecord = {
      id: `proj_${Date.now()}`,
      name: `Design - ${fileName.replace(/\.[^/.]+$/, '')}`,
      width: canvas.width,
      height: canvas.height,
      unit: 'px',
      dpi: 72,
      fabricJson: JSON.stringify({
        version: '6.0.0',
        background: '#08080a',
        objects: [
          {
            type: 'image',
            left: 0,
            top: 0,
            width: canvas.width,
            height: canvas.height,
            src: dataUrl,
            selectable: true,
          },
        ],
      }),
      thumbnail: dataUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      type: 'graphic',
    };

    await saveProject(project);
    onOpenInEditor(project);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        aria-labelledby="quick-tools-title"
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
        {...backdropProps}
      >
      <div
        className="glass-panel rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/[0.1]"
        {...contentProps}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-slate-300" />
            <div>
              <h2 id="quick-tools-title" className="text-sm font-semibold text-white">
                Quick Image Utilities
              </h2>
              <p className="text-[11px] text-slate-400">
                100% Client-side background removal, inpainting & image enhancement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Canvas Preview Area */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="truncate max-w-xs">{fileName}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetCanvasToOriginal}
                  className="flex items-center gap-1 hover:text-white px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <label className="flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer px-2 py-1 rounded bg-white/[0.05] border border-white/[0.08]">
                  <Upload className="w-3 h-3" />
                  <span>Replace</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Interactive Preview Canvas */}
            <div className="canvas-checkerboard relative w-full h-[360px] rounded-xl border border-white/[0.08] flex items-center justify-center overflow-hidden">
              <canvas
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                className={`max-w-full max-h-full object-contain touch-none ${
                  activeTool === 'eraser' ? 'cursor-crosshair' : 'cursor-default'
                }`}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 text-white text-xs font-mono">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>

            {activeTool === 'eraser' && (
              <p className="text-[11px] text-slate-500 text-center">
                Click or drag across the image preview to erase objects with local patch synthesis.
              </p>
            )}
          </div>

          {/* Right Controls Panel */}
          <div className="flex flex-col gap-4 glass-panel-subtle p-4 rounded-xl">
            {/* Tool Tabs */}
            <div className="flex rounded-lg p-1 bg-white/[0.03] border border-white/[0.06]">
              <button
                onClick={() => setActiveTool('bg-remove')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                  activeTool === 'bg-remove'
                    ? 'bg-white text-[#08080a] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Remove BG
              </button>
              <button
                onClick={() => setActiveTool('eraser')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                  activeTool === 'eraser'
                    ? 'bg-white text-[#08080a] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Erase
              </button>
              <button
                onClick={() => setActiveTool('enhance')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                  activeTool === 'enhance'
                    ? 'bg-white text-[#08080a] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Enhance
              </button>
            </div>

            {/* Dynamic Tool Settings */}
            <div className="flex-1 space-y-4 pt-1">
              {activeTool === 'bg-remove' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                      <span>Perimeter Tolerance</span>
                      <span>{tolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                      <span>Edge Feathering</span>
                      <span>{feather}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={feather}
                      onChange={(e) => setFeather(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={handleApplyBgRemoval}
                    className="w-full py-2 px-3 rounded-lg bg-white/[0.08] hover:bg-white text-slate-200 hover:text-[#08080a] text-xs font-medium border border-white/[0.1] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Background Removal</span>
                  </button>
                </div>
              )}

              {activeTool === 'eraser' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                      <span>Brush Radius</span>
                      <span>{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] text-[11px] text-slate-400">
                    Click unwanted watermarks, objects, or artifacts in the preview to synthesize filler from surrounding pixels.
                  </div>
                </div>
              )}

              {activeTool === 'enhance' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                      <span>Contrast</span>
                      <span>{contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="60"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                      <span>Brightness</span>
                      <span>{brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                      <span>Saturation</span>
                      <span>{saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="60"
                      value={saturation}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={sharpen}
                      onChange={(e) => setSharpen(e.target.checked)}
                      className="rounded accent-white"
                    />
                    <span>Sharpening Filter</span>
                  </label>

                  <button
                    onClick={handleApplyEnhancements}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-white/[0.08] hover:bg-white text-slate-200 hover:text-[#08080a] text-xs font-medium border border-white/[0.1] transition-all"
                  >
                    Apply Enhancements
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Final Actions */}
            <div className="space-y-2 pt-3 border-t border-white/[0.06]">
              <button
                onClick={handleOpenInEditor}
                className="w-full py-2 px-3 rounded-lg bg-white text-[#08080a] hover:bg-slate-200 font-medium text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Open in Canvas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSaveToAssets}
                  className="py-1.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-medium border border-white/[0.06] transition-colors flex items-center justify-center gap-1.5"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Saved</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Save Asset</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="py-1.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-medium border border-white/[0.06] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

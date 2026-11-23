import React, { useState } from 'react';
import * as fabric from 'fabric';
import {
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Sliders,
  Scissors,
  Sparkles,
  Trash2,
  Copy,
  Lock,
  Unlock,
  MoveUp,
  MoveDown,
  Palette,
  Square,
  Circle,
  Eye,
  Filter,
  FlipHorizontal,
  FlipVertical,
  Crosshair,
} from 'lucide-react';
import {
  CURATED_FONT_CATALOG,
  BuiltInFontCategory,
  getFontFallbackStack,
} from '../../utils/fontCatalog';

interface FloatingContextToolbarProps {
  selectedObject: fabric.FabricObject | null;
  onUpdateProps: (props: Partial<any>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onToggleLock: () => void;
  onFlipX?: () => void;
  onFlipY?: () => void;
  onCenterAlign?: () => void;
  onTriggerBgRemoval?: () => void;
  onTriggerCrop?: () => void;
  availableFonts: string[];
}

export const FloatingContextToolbar: React.FC<FloatingContextToolbarProps> = ({
  selectedObject,
  onUpdateProps,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  onToggleLock,
  onFlipX,
  onFlipY,
  onCenterAlign,
  onTriggerBgRemoval,
  onTriggerCrop,
  availableFonts,
}) => {
  if (!selectedObject) return null;

  const isText =
    selectedObject instanceof fabric.Textbox ||
    selectedObject.type === 'textbox' ||
    selectedObject.type === 'text' ||
    selectedObject.type === 'i-text';

  const isImage =
    selectedObject instanceof fabric.FabricImage ||
    selectedObject.type === 'image';

  const isVectorIcon = Boolean((selectedObject as any).isVectorIcon);

  const isShape =
    isVectorIcon ||
    selectedObject instanceof fabric.Rect ||
    selectedObject instanceof fabric.Circle ||
    selectedObject instanceof fabric.Ellipse ||
    selectedObject instanceof fabric.Triangle ||
    selectedObject instanceof fabric.Polygon ||
    selectedObject instanceof fabric.Path ||
    selectedObject instanceof fabric.Line ||
    selectedObject.type === 'rect' ||
    selectedObject.type === 'circle' ||
    selectedObject.type === 'ellipse' ||
    selectedObject.type === 'triangle' ||
    selectedObject.type === 'polygon' ||
    selectedObject.type === 'polyline' ||
    selectedObject.type === 'path' ||
    selectedObject.type === 'line';

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [lockAspect, setLockAspect] = useState(true);

  // Read current properties from Fabric object
  const rawFill = isVectorIcon
    ? (selectedObject as any).iconFill
    : selectedObject.fill;
  const currentFill =
    typeof rawFill === 'string' && rawFill !== 'none' && rawFill !== 'transparent'
      ? rawFill
      : '#ffffff';
  const hasFill =
    rawFill !== 'none' && rawFill !== 'transparent' && rawFill !== '';

  const rawStroke = isVectorIcon
    ? (selectedObject as any).iconColor
    : selectedObject.stroke;
  const currentStroke =
    typeof rawStroke === 'string' && rawStroke !== 'none' && rawStroke !== 'transparent'
      ? rawStroke
      : '#ffffff';
  const currentStrokeWidth = isVectorIcon
    ? Number((selectedObject as any).iconStrokeWidth ?? 2)
    : selectedObject.strokeWidth || 0;
  const currentIconFillMode: 'none' | 'soft' | 'solid' = isVectorIcon
    ? ((selectedObject as any).iconFillMode || (hasFill ? 'solid' : 'none'))
    : hasFill
    ? 'solid'
    : 'none';
  const currentOpacity = selectedObject.opacity !== undefined ? selectedObject.opacity : 1;

  const renderedWidth = Math.max(
    1,
    Math.round((selectedObject.width || 100) * Math.abs(selectedObject.scaleX || 1))
  );
  const renderedHeight = Math.max(
    1,
    Math.round((selectedObject.height || 100) * Math.abs(selectedObject.scaleY || 1))
  );

  // Text specific
  const fontFamily = (selectedObject as any).fontFamily || 'Inter';
  const fontSize = (selectedObject as any).fontSize || 36;
  const fontWeight = (selectedObject as any).fontWeight || 'normal';
  const fontStyle = (selectedObject as any).fontStyle || 'normal';
  const underline = !!(selectedObject as any).underline;
  const textAlign = (selectedObject as any).textAlign || 'left';

  // Rect corner radius
  const rx = (selectedObject as any).rx || 0;

  const isLocked = !!selectedObject.lockMovementX;

  // Apply quick image filter
  const applyImageFilter = (filterType: 'none' | 'grayscale' | 'sepia' | 'invert' | 'blur') => {
    if (!isImage) return;
    const imgObj = selectedObject as fabric.FabricImage;
    imgObj.filters = [];
    if (filterType === 'grayscale') {
      imgObj.filters.push(new fabric.filters.Grayscale());
    } else if (filterType === 'sepia') {
      imgObj.filters.push(new fabric.filters.Sepia());
    } else if (filterType === 'invert') {
      imgObj.filters.push(new fabric.filters.Invert());
    } else if (filterType === 'blur') {
      imgObj.filters.push(new fabric.filters.Blur({ blur: 0.2 }));
    }
    imgObj.applyFilters();
    imgObj.canvas?.requestRenderAll();
    setShowFilterMenu(false);
  };

  return (
    <div
      data-testid="floating-context-toolbar"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-35 max-w-[calc(100%-24px)] overflow-x-auto no-scrollbar flex items-center gap-1 p-1.5 rounded-2xl editor-chrome-float backdrop-blur-2xl border shadow-2xl animate-fadeIn text-xs text-slate-300 whitespace-nowrap"
    >
      {/* 1. TEXT TOOLBAR */}
      {isText && (
        <>
          {/* Font Picker */}
          <select
            value={fontFamily}
            data-testid="floating-font-select"
            onChange={(e) => onUpdateProps({ fontFamily: e.target.value })}
            style={{ fontFamily: getFontFallbackStack(fontFamily) }}
            className="py-1 px-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs outline-none max-w-[140px]"
            title="Font Family"
          >
            {(() => {
              const builtInSet = new Set(CURATED_FONT_CATALOG.map((f) => f.family));
              const customOnly = availableFonts.filter((f) => !builtInSet.has(f));
              const categories: BuiltInFontCategory[] = [
                'Sans-Serif',
                'Display & Bold',
                'Serif',
                'Pixel, Retro & Mono',
                'Script & Expressive',
              ];
              return (
                <>
                  {customOnly.length > 0 && (
                    <optgroup label="Custom Fonts" className="bg-[#121318] text-slate-300">
                      {customOnly.map((f) => (
                        <option key={`custom-${f}`} value={f} className="bg-[#121318] text-white">
                          {f}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {categories.map((cat) => (
                    <optgroup key={cat} label={cat} className="bg-[#121318] text-slate-300">
                      {CURATED_FONT_CATALOG.filter((item) => item.category === cat).map((item) => (
                        <option
                          key={item.family}
                          value={item.family}
                          className="bg-[#121318] text-white"
                        >
                          {item.family}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </>
              );
            })()}
          </select>

          {/* Font Size */}
          <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5">
            <input
              type="number"
              min="8"
              max="300"
              value={fontSize}
              onChange={(e) => onUpdateProps({ fontSize: Number(e.target.value) })}
              className="w-10 bg-transparent text-white text-xs font-mono text-center outline-none"
              title="Font Size"
            />
            <span className="text-[10px] text-slate-500 font-mono">px</span>
          </div>

          {/* Color Picker */}
          <label className="w-6 h-6 rounded-lg border border-white/20 flex items-center justify-center cursor-pointer overflow-hidden p-0.5" title="Text Color">
            <input
              type="color"
              value={currentFill}
              onChange={(e) => onUpdateProps({ fill: e.target.value })}
              className="opacity-0 w-0 h-0 cursor-pointer"
            />
            <div className="w-full h-full rounded" style={{ backgroundColor: currentFill }} />
          </label>

          {/* Styles: Bold, Italic, Underline */}
          <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => onUpdateProps({ fontWeight: fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`p-1.5 hover:bg-white/[0.08] transition-colors ${fontWeight === 'bold' ? 'text-white bg-white/[0.1]' : 'text-slate-400'}`}
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateProps({ fontStyle: fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`p-1.5 hover:bg-white/[0.08] transition-colors ${fontStyle === 'italic' ? 'text-white bg-white/[0.1]' : 'text-slate-400'}`}
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateProps({ underline: !underline })}
              className={`p-1.5 hover:bg-white/[0.08] transition-colors ${underline ? 'text-white bg-white/[0.1]' : 'text-slate-400'}`}
              title="Underline"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => onUpdateProps({ textAlign: 'left' })}
              className={`p-1.5 hover:bg-white/[0.08] transition-colors ${textAlign === 'left' ? 'text-white bg-white/[0.1]' : 'text-slate-400'}`}
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateProps({ textAlign: 'center' })}
              className={`p-1.5 hover:bg-white/[0.08] transition-colors ${textAlign === 'center' ? 'text-white bg-white/[0.1]' : 'text-slate-400'}`}
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateProps({ textAlign: 'right' })}
              className={`p-1.5 hover:bg-white/[0.08] transition-colors ${textAlign === 'right' ? 'text-white bg-white/[0.1]' : 'text-slate-400'}`}
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}

      {/* 2. IMAGE TOOLBAR */}
      {isImage && (
        <>
          {onTriggerCrop && (
            <button
              onClick={onTriggerCrop}
              className="py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] flex items-center gap-1.5 transition-colors"
              title="Crop image frame"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Crop</span>
            </button>
          )}

          {onTriggerBgRemoval && (
            <button
              onClick={onTriggerBgRemoval}
              className="py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] flex items-center gap-1.5 transition-colors"
              title="Remove Background (Client-side Alpha Cutout)"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Remove BG</span>
            </button>
          )}

          {/* Quick Filter Menu */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] flex items-center gap-1.5 transition-colors"
              title="Quick Filters"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

            {showFilterMenu && (
              <div className="absolute top-full left-0 mt-1 w-32 py-1 rounded-xl bg-[#0d0e12]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl z-40 text-xs">
                {(['none', 'grayscale', 'sepia', 'invert', 'blur'] as const).map((flt) => (
                  <button
                    key={flt}
                    onClick={() => applyImageFilter(flt)}
                    className="w-full px-3 py-1.5 text-left capitalize text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    {flt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Opacity slider */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <span className="text-[10px] text-slate-400">Opacity</span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={currentOpacity}
              onChange={(e) => onUpdateProps({ opacity: parseFloat(e.target.value) })}
              className="w-14 accent-white cursor-pointer"
            />
          </div>
        </>
      )}

      {/* 3. SHAPE & VECTOR ICON TOOLBAR */}
      {isShape && (
        <>
          {/* Fill Color */}
          <div className="flex items-center gap-1 py-1 px-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] shrink-0">
            {isVectorIcon && !hasFill ? (
              <button
                type="button"
                data-testid="toolbar-icon-fill-enable"
                onClick={() => onUpdateProps({ iconFillMode: 'solid' })}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-300 hover:text-white cursor-pointer"
                title="Fill icon using icon color"
              >
                <div
                  className="w-3.5 h-3.5 rounded border border-white/20 shrink-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)',
                  }}
                />
                <span>Fill</span>
              </button>
            ) : (
              <>
                <label className="flex items-center gap-1 cursor-pointer" title={`Fill Color (${hasFill ? currentFill : 'None'})`}>
                  <div
                    className="w-3.5 h-3.5 rounded border border-white/20 shrink-0"
                    style={{
                      backgroundColor: hasFill ? currentFill : 'transparent',
                      opacity: isVectorIcon && currentIconFillMode === 'soft' ? 0.5 : 1,
                      backgroundImage: !hasFill
                        ? 'linear-gradient(45deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)'
                        : undefined,
                    }}
                  />
                  <span className="text-[10px] font-mono text-slate-300">
                    {hasFill ? currentFill : 'None'}
                  </span>
                  <input
                    type="color"
                    value={currentFill}
                    onChange={(e) => onUpdateProps({ fill: e.target.value })}
                    className="opacity-0 w-0 h-0"
                  />
                </label>
                {isVectorIcon && hasFill && (
                  <button
                    type="button"
                    data-testid="toolbar-icon-fill-mode-toggle"
                    onClick={() =>
                      onUpdateProps({
                        iconFillMode: currentIconFillMode === 'soft' ? 'solid' : 'soft',
                      })
                    }
                    className="text-[9px] text-slate-300 hover:text-white px-1 rounded bg-white/[0.08] capitalize"
                    title="Toggle Soft / Solid fill"
                  >
                    {currentIconFillMode}
                  </button>
                )}
                {hasFill && (
                  <button
                    type="button"
                    onClick={() =>
                      isVectorIcon
                        ? onUpdateProps({ iconFillMode: 'none' })
                        : onUpdateProps({ fill: 'transparent' })
                    }
                    className="text-[9px] text-slate-400 hover:text-white px-1 rounded bg-white/[0.05]"
                    title="Clear fill"
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>

          {/* Stroke Width & Color */}
          <div className="flex items-center gap-1 py-1 px-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] shrink-0">
            <span className="text-[10px] text-slate-400">Stroke</span>
            <input
              type="number"
              min="0"
              max="40"
              step={isVectorIcon ? 0.5 : 1}
              value={currentStrokeWidth}
              aria-label="Stroke width"
              onChange={(e) => onUpdateProps({ strokeWidth: Number(e.target.value) })}
              className="w-7 bg-transparent text-white font-mono text-center outline-none tabular-nums"
            />
            <label className="w-3.5 h-3.5 rounded border border-white/20 cursor-pointer overflow-hidden shrink-0" title="Stroke Color">
              <input
                type="color"
                value={currentStroke}
                onChange={(e) => onUpdateProps({ stroke: e.target.value })}
                className="opacity-0 w-0 h-0"
              />
              <div className="w-full h-full" style={{ backgroundColor: currentStroke }} />
            </label>
          </div>

          {/* Width / Height & Aspect Lock Controls */}
          <div className="flex items-center gap-0.5 py-1 px-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] shrink-0">
            <span className="text-[10px] text-slate-400">W</span>
            <input
              type="number"
              min="4"
              max="4000"
              value={renderedWidth}
              aria-label="Width"
              onChange={(e) => {
                const targetW = Math.max(4, Number(e.target.value) || 4);
                const baseW = Math.max(1, selectedObject.width || 100);
                const nextScaleX = targetW / baseW;
                if (lockAspect && renderedWidth > 0) {
                  const ratio = nextScaleX / Math.max(0.001, Math.abs(selectedObject.scaleX || 1));
                  onUpdateProps({
                    scaleX: (selectedObject.scaleX < 0 ? -1 : 1) * nextScaleX,
                    scaleY: (selectedObject.scaleY || 1) * ratio,
                  });
                } else {
                  onUpdateProps({ scaleX: (selectedObject.scaleX < 0 ? -1 : 1) * nextScaleX });
                }
              }}
              className="w-9 bg-transparent text-white font-mono text-center outline-none tabular-nums"
            />
            <span className="text-[10px] text-slate-400">H</span>
            <input
              type="number"
              min="4"
              max="4000"
              value={renderedHeight}
              aria-label="Height"
              onChange={(e) => {
                const targetH = Math.max(4, Number(e.target.value) || 4);
                const baseH = Math.max(1, selectedObject.height || 100);
                const nextScaleY = targetH / baseH;
                if (lockAspect && renderedHeight > 0) {
                  const ratio = nextScaleY / Math.max(0.001, Math.abs(selectedObject.scaleY || 1));
                  onUpdateProps({
                    scaleX: (selectedObject.scaleX || 1) * ratio,
                    scaleY: (selectedObject.scaleY < 0 ? -1 : 1) * nextScaleY,
                  });
                } else {
                  onUpdateProps({ scaleY: (selectedObject.scaleY < 0 ? -1 : 1) * nextScaleY });
                }
              }}
              className="w-9 bg-transparent text-white font-mono text-center outline-none tabular-nums"
            />
            <button
              type="button"
              onClick={() => setLockAspect((v) => !v)}
              className={`p-0.5 rounded transition-colors ${
                lockAspect ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              title={lockAspect ? 'Aspect Ratio Locked' : 'Free Aspect Ratio'}
            >
              {lockAspect ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
          </div>

          {/* Corner Radius (for Rect shapes) */}
          {(selectedObject instanceof fabric.Rect || selectedObject.type === 'rect') && (
            <div className="flex items-center gap-0.5 py-1 px-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] shrink-0">
              <span className="text-[10px] text-slate-400">Radius</span>
              <input
                type="number"
                min="0"
                max="100"
                value={rx}
                aria-label="Corner Radius"
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  onUpdateProps({ rx: val, ry: val });
                }}
                className="w-7 bg-transparent text-white font-mono text-center outline-none tabular-nums"
              />
            </div>
          )}

          {/* Opacity */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] shrink-0">
            <span className="text-[10px] text-slate-400">Opacity</span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={currentOpacity}
              onChange={(e) => onUpdateProps({ opacity: parseFloat(e.target.value) })}
              className="w-10 accent-white cursor-pointer"
            />
          </div>
        </>
      )}

      {/* GLOBAL ACTIONS (Duplicate, Align, Flip, Layer Depth, Lock, Delete) */}
      <div className="w-[1px] h-5 bg-white/[0.08] mx-0.5" />

      {onCenterAlign && (
        <button
          onClick={onCenterAlign}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
          title="Center on Canvas"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      )}

      {onFlipX && (
        <button
          onClick={onFlipX}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
          title="Flip Horizontal"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
        </button>
      )}

      {onFlipY && (
        <button
          onClick={onFlipY}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
          title="Flip Vertical"
        >
          <FlipVertical className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        onClick={onDuplicate}
        className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
        title="Duplicate Layer (Ctrl+D)"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={onBringForward}
        className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
        title="Bring Forward"
      >
        <MoveUp className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={onSendBackward}
        className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
        title="Send Backward"
      >
        <MoveDown className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={onToggleLock}
        className={`p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors ${isLocked ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
        title={isLocked ? 'Unlock Object' : 'Lock Object Position'}
      >
        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
      </button>

      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
        title="Delete Selected (Backspace / Delete)"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

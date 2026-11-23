import React, { useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  ArrowLeft,
  X,
  FlipHorizontal2,
  FlipVertical2,
  Palette,
  RotateCcw,
} from 'lucide-react';
import {
  AlignmentAnchor9,
  computeNinePointAlignmentDelta,
  alignFabricObjectOnCanvas,
  detectActiveAlignmentAnchor,
  isAxisInverted,
  toggleFabricObjectAxisFlip,
} from '../../utils/transformMath';

export type { AlignmentAnchor9 };
export {
  computeNinePointAlignmentDelta,
  alignFabricObjectOnCanvas,
  detectActiveAlignmentAnchor,
  isAxisInverted,
  toggleFabricObjectAxisFlip,
};

interface MatrixPositionItem {
  id: AlignmentAnchor9;
  label: string;
  shortLabel: string;
  row: 0 | 1 | 2;
  col: 0 | 1 | 2;
}

const ALIGNMENT_MATRIX_9: MatrixPositionItem[] = [
  { id: 'top-left', label: 'Top-Left', shortLabel: 'Top Left', row: 0, col: 0 },
  { id: 'top-center', label: 'Top-Center', shortLabel: 'Top', row: 0, col: 1 },
  { id: 'top-right', label: 'Top-Right', shortLabel: 'Top Right', row: 0, col: 2 },
  { id: 'middle-left', label: 'Middle-Left', shortLabel: 'Left', row: 1, col: 0 },
  { id: 'center', label: 'Center', shortLabel: 'Center', row: 1, col: 1 },
  { id: 'middle-right', label: 'Middle-Right', shortLabel: 'Right', row: 1, col: 2 },
  { id: 'bottom-left', label: 'Bottom-Left', shortLabel: 'Bot Left', row: 2, col: 0 },
  { id: 'bottom-center', label: 'Bottom-Center', shortLabel: 'Bottom', row: 2, col: 1 },
  { id: 'bottom-right', label: 'Bottom-Right', shortLabel: 'Bot Right', row: 2, col: 2 },
];

const AnchorMatrixDotIcon: React.FC<{
  row: 0 | 1 | 2;
  col: 0 | 1 | 2;
  active: boolean;
}> = ({ row, col, active }) => (
  <span
    aria-hidden="true"
    className={`w-6 h-6 rounded-lg border grid grid-cols-3 grid-rows-3 gap-[2px] p-1 ${
      active
        ? 'bg-black/10 border-black/15'
        : 'bg-black/30 border-white/[0.08]'
    }`}
  >
    {[0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => {
        const isTarget = r === row && c === col;
        return (
          <span
            key={`${r}-${c}`}
            className={`rounded-[1.5px] transition-colors ${
              isTarget
                ? active
                  ? 'bg-[#08080a]'
                  : 'bg-white'
                : active
                ? 'bg-black/20'
                : 'bg-white/15'
            }`}
          />
        );
      })
    )}
  </span>
);

export interface ImageInvertTransformSubViewProps {
  selectedObject: fabric.FabricObject;
  canvasWidth?: number;
  canvasHeight?: number;
  isInvertedColor?: boolean;
  onToggleInvertColors?: () => void;
  onUpdateSelectedProps: (props: Partial<any>) => void;
  onCommitCanvasChange?: () => void;
  onFlipX?: () => void;
  onFlipY?: () => void;
  onBack: () => void;
  onClose?: () => void;
  onFeedback?: (msg: string) => void;
  showHeader?: boolean;
}

export const ImageInvertTransformSubView: React.FC<
  ImageInvertTransformSubViewProps
> = ({
  selectedObject,
  canvasWidth,
  canvasHeight,
  isInvertedColor = false,
  onToggleInvertColors,
  onUpdateSelectedProps,
  onCommitCanvasChange,
  onFlipX,
  onFlipY,
  onBack,
  onClose,
  onFeedback,
  showHeader = true,
}) => {
  const resolveArtboardSize = useCallback(() => {
    const canvas = selectedObject.canvas;
    const artW =
      canvasWidth ||
      (canvas ? Math.round(canvas.getWidth() / (canvas.getZoom() || 1)) : 1200);
    const artH =
      canvasHeight ||
      (canvas ? Math.round(canvas.getHeight() / (canvas.getZoom() || 1)) : 630);
    return { artW, artH };
  }, [canvasHeight, canvasWidth, selectedObject]);

  const readObjectSnapshot = useCallback(() => {
    const { artW, artH } = resolveArtboardSize();
    selectedObject.setCoords();
    const bbox = selectedObject.getBoundingRect();
    return {
      flipX: isAxisInverted(selectedObject, 'x'),
      flipY: isAxisInverted(selectedObject, 'y'),
      left: Math.round(selectedObject.left || 0),
      top: Math.round(selectedObject.top || 0),
      width: Math.round(
        (selectedObject.width || 0) * Math.abs(selectedObject.scaleX || 1)
      ),
      angle: Math.round(selectedObject.angle || 0),
      activeAnchor: detectActiveAlignmentAnchor(bbox, artW, artH),
    };
  }, [resolveArtboardSize, selectedObject]);

  const [snapshot, setSnapshot] = useState(readObjectSnapshot);

  const syncSnapshot = useCallback(() => {
    setSnapshot(readObjectSnapshot());
  }, [readObjectSnapshot]);

  useEffect(() => {
    syncSnapshot();
    const canvas = selectedObject.canvas;
    if (!canvas) return;

    const handleModified = () => syncSnapshot();
    canvas.on('object:modified', handleModified);
    canvas.on('object:moving', handleModified);
    canvas.on('object:scaling', handleModified);
    canvas.on('object:rotating', handleModified);
    return () => {
      canvas.off('object:modified', handleModified);
      canvas.off('object:moving', handleModified);
      canvas.off('object:scaling', handleModified);
      canvas.off('object:rotating', handleModified);
    };
  }, [selectedObject, syncSnapshot]);

  const handleToggleFlip = (axis: 'x' | 'y') => {
    if (axis === 'x' && onFlipX) {
      if ((selectedObject.scaleX ?? 1) < 0) {
        toggleFabricObjectAxisFlip(selectedObject, 'x');
        selectedObject.canvas?.requestRenderAll();
        onCommitCanvasChange?.();
      } else {
        onFlipX();
      }
    } else if (axis === 'y' && onFlipY) {
      if ((selectedObject.scaleY ?? 1) < 0) {
        toggleFabricObjectAxisFlip(selectedObject, 'y');
        selectedObject.canvas?.requestRenderAll();
        onCommitCanvasChange?.();
      } else {
        onFlipY();
      }
    } else {
      toggleFabricObjectAxisFlip(selectedObject, axis);
      selectedObject.canvas?.requestRenderAll();
      onCommitCanvasChange?.();
    }

    syncSnapshot();
    onFeedback?.(
      axis === 'x' ? 'Flipped horizontally' : 'Flipped vertically'
    );
  };

  const handleResetFlips = () => {
    selectedObject.set({
      flipX: false,
      flipY: false,
      scaleX: Math.abs(selectedObject.scaleX ?? 1),
      scaleY: Math.abs(selectedObject.scaleY ?? 1),
    });
    selectedObject.setCoords();
    selectedObject.canvas?.requestRenderAll();
    onCommitCanvasChange?.();
    syncSnapshot();
    onFeedback?.('Axis flips reset');
  };

  const handleSnapPosition = (anchor: AlignmentAnchor9, label: string) => {
    const { artW, artH } = resolveArtboardSize();
    alignFabricObjectOnCanvas(selectedObject, artW, artH, anchor);
    selectedObject.canvas?.requestRenderAll();
    onCommitCanvasChange?.();
    syncSnapshot();
    onFeedback?.(`Snapped to ${label}`);
  };

  const { artW, artH } = resolveArtboardSize();

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">
      {showHeader && (
        <header className="h-12 px-2.5 border-b border-white/[0.08] grid grid-cols-[36px_1fr_36px] items-center shrink-0 bg-white/[0.02] backdrop-blur-2xl">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Image Edits"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-xs font-semibold text-white tracking-tight text-center truncate px-1">
            Invert / Transform
          </h3>
          <button
            type="button"
            onClick={() => (onClose ? onClose() : onBack())}
            aria-label="Close Invert / Transform"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors justify-self-end"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
        {/* 1. Axis Flipping Controls */}
        <section className="space-y-2.5" aria-label="Axis Flipping Controls">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-300">
              Axis Flipping
            </span>
            {(snapshot.flipX || snapshot.flipY) && (
              <button
                type="button"
                onClick={handleResetFlips}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                title="Reset flips"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={snapshot.flipX}
              onClick={() => handleToggleFlip('x')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1.5 transition-all ${
                snapshot.flipX
                  ? 'bg-white text-[#08080a] border-white shadow-sm'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.2] text-slate-200'
              }`}
            >
              <FlipHorizontal2 className="w-4 h-4" />
              <span className="font-semibold leading-tight">
                Flip Horizontal
              </span>
              <span
                className={`text-[10px] leading-none ${
                  snapshot.flipX ? 'text-slate-600 font-semibold' : 'text-slate-400'
                }`}
              >
                {snapshot.flipX ? 'X-Axis · Inverted' : 'X-Axis'}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={snapshot.flipY}
              onClick={() => handleToggleFlip('y')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1.5 transition-all ${
                snapshot.flipY
                  ? 'bg-white text-[#08080a] border-white shadow-sm'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.2] text-slate-200'
              }`}
            >
              <FlipVertical2 className="w-4 h-4" />
              <span className="font-semibold leading-tight">
                Flip Vertical
              </span>
              <span
                className={`text-[10px] leading-none ${
                  snapshot.flipY ? 'text-slate-600 font-semibold' : 'text-slate-400'
                }`}
              >
                {snapshot.flipY ? 'Y-Axis · Inverted' : 'Y-Axis'}
              </span>
            </button>
          </div>
        </section>

        {/* 2. Quick-Position 3x3 Alignment Matrix */}
        <section
          className="space-y-2.5 pt-3 border-t border-white/[0.06]"
          aria-label="Position on Page"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-300">
              Position on Page
            </span>
            <span className="text-[10px] font-mono tabular-nums text-slate-400">
              {artW}×{artH}px
            </span>
          </div>

          <div
            role="group"
            aria-label="3x3 alignment grid"
            className="grid grid-cols-3 gap-1.5 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.08]"
          >
            {ALIGNMENT_MATRIX_9.map((pos) => {
              const isSnapped = snapshot.activeAnchor === pos.id;
              return (
                <button
                  key={pos.id}
                  type="button"
                  aria-label={pos.label}
                  aria-pressed={isSnapped}
                  title={`Snap to ${pos.label}`}
                  onClick={() => handleSnapPosition(pos.id, pos.label)}
                  className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    isSnapped
                      ? 'bg-white text-[#08080a] border-white shadow-sm'
                      : 'bg-white/[0.035] hover:bg-white/[0.09] border-white/[0.06] hover:border-white/[0.2] text-slate-200'
                  }`}
                >
                  <AnchorMatrixDotIcon
                    row={pos.row}
                    col={pos.col}
                    active={isSnapped}
                  />
                  <span className="text-[10px] font-medium leading-none truncate max-w-full">
                    {pos.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Position & Rotation Fine Inputs + Invert Colors */}
        <section className="space-y-3 pt-3 border-t border-white/[0.06]">
          <span className="text-[11px] font-medium text-slate-300">
            Coordinates &amp; Invert
          </span>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <label className="space-y-1">
              <span className="text-slate-400 text-[10px] font-sans">X (px)</span>
              <input
                type="number"
                value={snapshot.left}
                onChange={(e) => {
                  onUpdateSelectedProps({ left: Number(e.target.value) });
                  syncSnapshot();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-black/40 border border-white/[0.08] text-white tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 text-[10px] font-sans">Y (px)</span>
              <input
                type="number"
                value={snapshot.top}
                onChange={(e) => {
                  onUpdateSelectedProps({ top: Number(e.target.value) });
                  syncSnapshot();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-black/40 border border-white/[0.08] text-white tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 text-[10px] font-sans">
                Width (px)
              </span>
              <input
                type="number"
                value={snapshot.width}
                onChange={(e) => {
                  const nw = Math.max(1, Number(e.target.value));
                  const orig = selectedObject.width || 1;
                  const sign = (selectedObject.scaleX ?? 1) < 0 ? -1 : 1;
                  onUpdateSelectedProps({ scaleX: sign * (nw / orig) });
                  syncSnapshot();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-black/40 border border-white/[0.08] text-white tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 text-[10px] font-sans">
                Angle (°)
              </span>
              <input
                type="number"
                value={snapshot.angle}
                onChange={(e) => {
                  onUpdateSelectedProps({ angle: Number(e.target.value) });
                  syncSnapshot();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-black/40 border border-white/[0.08] text-white tabular-nums"
              />
            </label>
          </div>

          {onToggleInvertColors && (
            <button
              type="button"
              aria-pressed={isInvertedColor}
              onClick={onToggleInvertColors}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                isInvertedColor
                  ? 'bg-white text-[#08080a] border-white shadow-sm'
                  : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Invert Colors</span>
            </button>
          )}
        </section>
      </div>
    </div>
  );
};

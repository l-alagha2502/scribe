import React, { useState, useEffect, useMemo } from 'react';
import * as fabric from 'fabric';
import {
  ArrowLeft,
  X,
  Sparkles,
  Play,
  Droplet,
  Move,
  Image as ImageIcon,
  PanelLeftClose,
} from 'lucide-react';
import { useImageEffects } from '../../utils/imageEffectsEngine';
import { useObjectAnimation } from '../../utils/animationEngine';
import { ImageEffectsSubView } from './ImageEffectsSubView';
import { ImageAnimationsSubView } from './ImageAnimationsSubView';
import { ImageInvertTransformSubView } from './ImageInvertTransformSubView';
import { IconFillMode } from '../../utils/vectorIcons';

export type ShapeEditSubViewId = 'effects' | 'animation' | 'opacity' | 'position';

export interface ShapeEditsPanelProps {
  selectedObject: fabric.FabricObject;
  objectRevision?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  onUpdateSelectedProps: (props: Partial<any>) => void;
  onCommitCanvasChange?: () => void;
  onSetColorAsBackground?: (color: string) => void;
  onFlipX?: () => void;
  onFlipY?: () => void;
  onClose?: () => void;
  onCollapsePanel?: () => void;
}

const SHAPE_SWATCHES = [
  '#ffffff',
  '#08080a',
  '#6366f1',
  '#06b6d4',
  '#10b981',
  '#f43f5e',
  '#f59e0b',
];

export const ShapeEditsPanel: React.FC<ShapeEditsPanelProps> = ({
  selectedObject,
  objectRevision = 0,
  canvasWidth = 1200,
  canvasHeight = 630,
  onUpdateSelectedProps,
  onCommitCanvasChange,
  onSetColorAsBackground,
  onFlipX,
  onFlipY,
  onClose,
  onCollapsePanel,
}) => {
  const [activeSubView, setActiveSubView] = useState<ShapeEditSubViewId | null>(null);
  const [opacityPct, setOpacityPct] = useState<number>(100);

  useEffect(() => {
    setActiveSubView(null);
  }, [selectedObject]);

  const {
    activeEffectId,
    effectIntensity,
    selectEffect,
    updateIntensity,
    resetEffect,
  } = useImageEffects({
    selectedObject,
    onCommitCanvasChange,
    onElementOpacitySynced: setOpacityPct,
  });

  const {
    slots: animationSlots,
    replayKey: animationReplayKey,
    playbackStatus: animationPlaybackStatus,
    selectPreset: selectAnimationPreset,
    updateTiming: updateAnimationTiming,
    replayAnimation,
    clearSingleAnimation,
    clearAllAnimations,
  } = useObjectAnimation({
    selectedObject,
    onCommitCanvasChange,
  });

  const shapeState = useMemo(() => {
    const obj = selectedObject as any;
    const isVectorIcon = Boolean(obj.isVectorIcon);
    const isRect = selectedObject instanceof fabric.Rect || selectedObject.type === 'rect';
    const isLine = selectedObject instanceof fabric.Line || selectedObject.type === 'line' || Boolean(obj.isLineDivider);

    const rawFill = isVectorIcon ? obj.iconFill : selectedObject.fill;
    const hasFill =
      typeof rawFill === 'string' &&
      rawFill !== '' &&
      rawFill !== 'none' &&
      rawFill !== 'transparent';
    const fillHex = hasFill && rawFill.startsWith('#') ? rawFill : '#ffffff';

    const iconFillMode: IconFillMode = isVectorIcon
      ? obj.iconFillMode || (hasFill ? 'solid' : 'none')
      : 'none';

    const rawStroke = isVectorIcon ? obj.iconColor : selectedObject.stroke;
    const hasStroke =
      typeof rawStroke === 'string' &&
      rawStroke !== '' &&
      rawStroke !== 'none' &&
      rawStroke !== 'transparent';
    const strokeHex = hasStroke && rawStroke.startsWith('#') ? rawStroke : '#ffffff';
    const strokeWidth = isVectorIcon
      ? Number(obj.iconStrokeWidth ?? 2)
      : Number(selectedObject.strokeWidth || 0);

    const rx = isRect ? Math.round(Number(obj.rx || 0)) : 0;
    const liveOpacity = Math.round((selectedObject.opacity ?? 1) * 100);

    return {
      isVectorIcon,
      isRect,
      isLine,
      hasFill,
      fillHex,
      iconFillMode,
      hasStroke,
      strokeHex,
      strokeWidth,
      rx,
      liveOpacity,
    };
  }, [selectedObject, objectRevision]);

  useEffect(() => {
    setOpacityPct(shapeState.liveOpacity);
  }, [shapeState.liveOpacity]);

  if (activeSubView === 'effects') {
    return (
      <ImageEffectsSubView
        activeEffectId={activeEffectId}
        intensity={effectIntensity}
        isImage={false}
        title="Effects"
        showHeader
        onSelectEffect={(effectId, nextInt) => selectEffect(effectId, nextInt)}
        onChangeIntensity={(nextInt) => updateIntensity(nextInt)}
        onCommitIntensity={() => onCommitCanvasChange?.()}
        onResetEffect={() => resetEffect()}
        onBack={() => setActiveSubView(null)}
        onClose={() => (onClose ? onClose() : setActiveSubView(null))}
      />
    );
  }

  if (activeSubView === 'animation') {
    return (
      <ImageAnimationsSubView
        selectedObject={selectedObject}
        slots={animationSlots}
        replayKey={animationReplayKey}
        playbackStatus={animationPlaybackStatus}
        onSelectPreset={selectAnimationPreset}
        onUpdateTiming={updateAnimationTiming}
        onReplay={replayAnimation}
        onClearSlot={clearSingleAnimation}
        onClearAll={clearAllAnimations}
        onBack={() => setActiveSubView(null)}
        onClose={() => (onClose ? onClose() : setActiveSubView(null))}
        showHeader
      />
    );
  }

  if (activeSubView === 'position') {
    return (
      <ImageInvertTransformSubView
        selectedObject={selectedObject}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        onUpdateSelectedProps={onUpdateSelectedProps}
        onCommitCanvasChange={onCommitCanvasChange}
        onFlipX={onFlipX}
        onFlipY={onFlipY}
        onBack={() => setActiveSubView(null)}
        onClose={() => (onClose ? onClose() : setActiveSubView(null))}
        showHeader
      />
    );
  }

  if (activeSubView === 'opacity') {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-transparent" data-testid="shape-opacity-subview">
        <header className="h-12 px-2.5 border-b border-white/[0.08] grid grid-cols-[36px_1fr_36px] items-center shrink-0 bg-white/[0.02] backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => setActiveSubView(null)}
            aria-label="Back to Edit"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-xs font-semibold text-white tracking-tight text-center truncate px-1">
            Opacity
          </h3>
          <button
            type="button"
            onClick={() => (onClose ? onClose() : setActiveSubView(null))}
            aria-label="Close Opacity"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors justify-self-end"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-medium">Transparency</span>
              <span className="font-mono tabular-nums text-white font-semibold">{opacityPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={opacityPct}
              aria-label="Shape Opacity"
              data-testid="shape-opacity-slider"
              onDoubleClick={() => {
                setOpacityPct(100);
                onUpdateSelectedProps({ opacity: 1 });
                onCommitCanvasChange?.();
              }}
              onChange={(e) => {
                const next = Number(e.target.value);
                setOpacityPct(next);
                onUpdateSelectedProps({ opacity: next / 100 });
              }}
              onPointerUp={() => onCommitCanvasChange?.()}
              className="w-full accent-white cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[100, 75, 50, 25].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  setOpacityPct(pct);
                  onUpdateSelectedProps({ opacity: pct / 100 });
                  onCommitCanvasChange?.();
                }}
                className={`py-2 rounded-xl border text-xs font-mono tabular-nums transition-colors ${
                  opacityPct === pct
                    ? 'bg-white text-[#08080a] border-white font-semibold'
                    : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent" data-testid="shape-edits-panel">
      <header className="h-12 px-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02] backdrop-blur-2xl">
        <h3 className="text-xs font-semibold text-white tracking-tight whitespace-nowrap">
          Edit
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400">
            {shapeState.isVectorIcon ? 'Icon' : shapeState.isLine ? 'Line' : 'Shape'}
          </span>
          {onCollapsePanel && (
            <button
              type="button"
              data-testid="left-panel-collapse-btn"
              onClick={onCollapsePanel}
              aria-label="Collapse left panel"
              title="Collapse panel"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs text-slate-300">
        {/* Top Feature Cards */}
        <section className="grid grid-cols-2 gap-1.5" aria-label="Shape feature tools">
          <button
            type="button"
            data-testid="shape-feature-effects"
            onClick={() => setActiveSubView('effects')}
            className={`rounded-xl border p-2.5 flex items-center gap-2 transition-colors ${
              activeEffectId !== 'none'
                ? 'bg-white/[0.09] border-white/25 text-white'
                : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-medium">Effects</span>
          </button>

          <button
            type="button"
            data-testid="shape-feature-animation"
            onClick={() => setActiveSubView('animation')}
            className={`rounded-xl border p-2.5 flex items-center gap-2 transition-colors ${
              animationSlots.in || animationSlots.out || animationSlots.passive
                ? 'bg-white/[0.09] border-white/25 text-white'
                : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
            }`}
          >
            <Play className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-medium">Animation</span>
          </button>

          <button
            type="button"
            data-testid="shape-feature-opacity"
            onClick={() => setActiveSubView('opacity')}
            className="rounded-xl border p-2.5 flex items-center justify-between gap-2 bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Droplet className="w-4 h-4 shrink-0" />
              <span className="text-[11px] font-medium">Opacity</span>
            </span>
            <span className="text-[10px] font-mono tabular-nums text-slate-400">
              {opacityPct}%
            </span>
          </button>

          <button
            type="button"
            data-testid="shape-feature-position"
            onClick={() => setActiveSubView('position')}
            className="rounded-xl border p-2.5 flex items-center gap-2 bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200 transition-colors"
          >
            <Move className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-medium">Position</span>
          </button>
        </section>

        {/* Fill Color & Vector Icon Fill Mode */}
        {!shapeState.isLine && (
          <section className="p-3 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-slate-300">Fill</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400 uppercase">
                  {shapeState.hasFill ? shapeState.fillHex : 'None'}
                </span>
                {shapeState.hasFill && (
                  <button
                    type="button"
                    data-testid="shape-fill-clear"
                    onClick={() => {
                      if (shapeState.isVectorIcon) {
                        onUpdateSelectedProps({ iconFillMode: 'none' });
                      } else {
                        onUpdateSelectedProps({ fill: 'transparent' });
                      }
                      onCommitCanvasChange?.();
                    }}
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/[0.06]"
                  >
                    None
                  </button>
                )}
              </div>
            </div>

            {shapeState.isVectorIcon && (
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                {(['none', 'soft', 'solid'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onUpdateSelectedProps({ iconFillMode: mode });
                      onCommitCanvasChange?.();
                    }}
                    className={`py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${
                      shapeState.iconFillMode === mode
                        ? 'bg-white text-[#08080a] font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap">
              {SHAPE_SWATCHES.map((col) => (
                <button
                  key={col}
                  type="button"
                  data-testid={`shape-fill-swatch-${col.replace('#', '')}`}
                  onClick={() => {
                    onUpdateSelectedProps({ fill: col });
                    onCommitCanvasChange?.();
                  }}
                  className={`w-6 h-6 rounded-lg border transition-transform ${
                    shapeState.hasFill && shapeState.fillHex.toLowerCase() === col
                      ? 'scale-110 border-white ring-2 ring-white/25'
                      : 'border-white/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: col }}
                  title={col}
                />
              ))}
              <label
                className="w-7 h-6 rounded-lg border border-white/25 cursor-pointer flex items-center justify-center bg-white/[0.05]"
                title="Custom fill color"
              >
                <input
                  type="color"
                  data-testid="shape-fill-color-input"
                  value={shapeState.fillHex}
                  onChange={(e) => onUpdateSelectedProps({ fill: e.target.value })}
                  onBlur={() => onCommitCanvasChange?.()}
                  className="sr-only"
                />
                <span
                  className="w-4 h-4 rounded border border-white/20"
                  style={{ backgroundColor: shapeState.fillHex }}
                />
              </label>
            </div>
          </section>
        )}

        {/* Outline / Stroke */}
        <section className="p-3 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-300">
              {shapeState.isLine ? 'Line Color & Weight' : 'Outline / Stroke'}
            </span>
            <span className="font-mono tabular-nums text-white font-semibold">
              {shapeState.strokeWidth}px
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={40}
            step={shapeState.isVectorIcon ? 0.5 : 1}
            value={shapeState.strokeWidth}
            aria-label="Shape Stroke Width"
            data-testid="shape-stroke-width-slider"
            onChange={(e) => {
              const nextW = Number(e.target.value);
              onUpdateSelectedProps({
                strokeWidth: nextW,
                stroke: nextW > 0 && !shapeState.hasStroke ? '#ffffff' : shapeState.strokeHex,
              });
            }}
            onPointerUp={() => onCommitCanvasChange?.()}
            className="w-full accent-white cursor-pointer"
          />

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {SHAPE_SWATCHES.map((col) => (
              <button
                key={col}
                type="button"
                data-testid={`shape-stroke-swatch-${col.replace('#', '')}`}
                onClick={() => {
                  onUpdateSelectedProps({
                    stroke: col,
                    strokeWidth: Math.max(2, shapeState.strokeWidth || 2),
                  });
                  onCommitCanvasChange?.();
                }}
                className={`w-6 h-6 rounded-lg border transition-transform ${
                  shapeState.hasStroke && shapeState.strokeHex.toLowerCase() === col
                    ? 'scale-110 border-white ring-2 ring-white/25'
                    : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: col }}
                title={col}
              />
            ))}
            <label
              className="w-7 h-6 rounded-lg border border-white/25 cursor-pointer flex items-center justify-center bg-white/[0.05]"
              title="Custom stroke color"
            >
              <input
                type="color"
                data-testid="shape-stroke-color-input"
                value={shapeState.strokeHex}
                onChange={(e) =>
                  onUpdateSelectedProps({
                    stroke: e.target.value,
                    strokeWidth: Math.max(2, shapeState.strokeWidth || 2),
                  })
                }
                onBlur={() => onCommitCanvasChange?.()}
                className="sr-only"
              />
              <span
                className="w-4 h-4 rounded border border-white/20"
                style={{ backgroundColor: shapeState.strokeHex }}
              />
            </label>
          </div>
        </section>

        {/* Corner Radius (Rectangles) */}
        {shapeState.isRect && (
          <section className="p-3 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-slate-300">Corner Radius</span>
              <span className="font-mono tabular-nums text-white font-semibold">
                {shapeState.rx}px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={shapeState.rx}
              aria-label="Shape Corner Radius"
              data-testid="shape-radius-slider"
              onChange={(e) => {
                const r = Number(e.target.value);
                onUpdateSelectedProps({ rx: r, ry: r });
              }}
              onPointerUp={() => onCommitCanvasChange?.()}
              className="w-full accent-white cursor-pointer"
            />
          </section>
        )}

        {/* Set Background Helper */}
        {onSetColorAsBackground && (shapeState.hasFill || shapeState.hasStroke) && (
          <button
            type="button"
            onClick={() =>
              onSetColorAsBackground(
                shapeState.hasFill ? shapeState.fillHex : shapeState.strokeHex
              )
            }
            className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Apply Color to Background</span>
          </button>
        )}
      </div>
    </div>
  );
};

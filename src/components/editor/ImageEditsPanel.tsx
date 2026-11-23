import React, { useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  ArrowLeft,
  X,
  Sparkles,
  Play,
  Image as ImageIcon,
  SlidersHorizontal,
  FlipHorizontal,
  ScanLine,
  Check,
  PanelLeftClose,
} from 'lucide-react';
import { ImageEffectsSubView } from './ImageEffectsSubView';
import { ImageInvertTransformSubView } from './ImageInvertTransformSubView';
import { ImageFiltersSubView } from './ImageFiltersSubView';
import { ImageAnimationsSubView } from './ImageAnimationsSubView';
import {
  DEFAULT_FILTER_SLIDERS,
  useImageEffects,
  computeSmoothEdgeClipRadii,
  computeCoverBackgroundTransform,
} from '../../utils/imageEffectsEngine';
import { useObjectAnimation } from '../../utils/animationEngine';

export type ImageEditToolId =
  | 'effects'
  | 'animation'
  | 'filters'
  | 'invert-transform'
  | 'smooth-edges';

interface GridToolItem {
  id: ImageEditToolId | 'set-background';
  label: string;
  icon: React.FC<{ className?: string }>;
}

const IMAGE_EDIT_GRID_ITEMS: GridToolItem[] = [
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'animation', label: 'Animation', icon: Play },
  { id: 'set-background', label: 'Set Background', icon: ImageIcon },
  { id: 'filters', label: 'Filters', icon: SlidersHorizontal },
  { id: 'invert-transform', label: 'Invert / Transform', icon: FlipHorizontal },
  { id: 'smooth-edges', label: 'Smooth Edges', icon: ScanLine },
];

const TOOL_TITLES: Record<ImageEditToolId, string> = {
  effects: 'Image Effects',
  animation: 'Animation',
  filters: 'Filters',
  'invert-transform': 'Invert / Transform',
  'smooth-edges': 'Smooth Edges',
};

export interface ImageEditsPanelProps {
  selectedObject: fabric.FabricObject | null;
  canvasWidth?: number;
  canvasHeight?: number;
  onUpdateSelectedProps: (props: Partial<any>) => void;
  onCommitCanvasChange?: () => void;
  onSetImageAsBackground?: (imgObj: fabric.FabricImage) => void | Promise<void>;
  onSetColorAsBackground?: (color: string) => void;
  onFlipX?: () => void;
  onFlipY?: () => void;
  onClose?: () => void;
  onCollapsePanel?: () => void;
}

export const ImageEditsPanel: React.FC<ImageEditsPanelProps> = ({
  selectedObject,
  canvasWidth,
  canvasHeight,
  onUpdateSelectedProps,
  onCommitCanvasChange,
  onSetImageAsBackground,
  onSetColorAsBackground,
  onFlipX,
  onFlipY,
  onClose,
  onCollapsePanel,
}) => {
  const [activeTool, setActiveTool] = useState<ImageEditToolId | null>(null);
  const [edgeRadius, setEdgeRadius] = useState<number>(0);
  const [elementOpacity, setElementOpacity] = useState<number>(100);
  const [elementStrokeWidth, setElementStrokeWidth] = useState<number>(0);
  const [feedbackNote, setFeedbackNote] = useState<string | null>(null);

  const {
    isImage,
    activeEffectId,
    setActiveEffectId,
    effectIntensity,
    setEffectIntensity,
    filters,
    sliders,
    setSliders,
    rebuildImageFilters,
    selectEffect,
    updateIntensity,
    resetEffect,
    updateFilterSliders,
    resetFilter,
    resetAllFilters,
  } = useImageEffects({
    selectedObject,
    onCommitCanvasChange,
    onElementOpacitySynced: setElementOpacity,
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

  // Sync non-effect sub-view controls whenever selected object changes
  useEffect(() => {
    setFeedbackNote(null);
    if (!selectedObject) {
      setActiveTool(null);
      setEdgeRadius(0);
      setElementOpacity(100);
      setElementStrokeWidth(0);
      return;
    }

    setElementOpacity(Math.round((selectedObject.opacity ?? 1) * 100));
    setElementStrokeWidth(Math.round(selectedObject.strokeWidth || 0));

    if (selectedObject instanceof fabric.Rect || selectedObject.type === 'rect') {
      setEdgeRadius(Math.min(100, Math.round((selectedObject as any).rx || 0)));
    } else if (typeof (selectedObject as any).__scribeEdgeRadius === 'number') {
      setEdgeRadius(Math.max(0, Math.min(100, Math.round((selectedObject as any).__scribeEdgeRadius))));
    } else {
      const clip = selectedObject.clipPath as fabric.Rect | undefined;
      const sx = Math.abs(selectedObject.scaleX || 1);
      setEdgeRadius(
        clip && typeof clip.rx === 'number'
          ? Math.min(100, Math.round(clip.rx * sx))
          : 0
      );
    }
  }, [selectedObject]);

  const showNote = (msg: string) => {
    setFeedbackNote(msg);
    setTimeout(() => setFeedbackNote(null), 2000);
  };

  const commitChange = useCallback(() => {
    selectedObject?.canvas?.requestRenderAll();
    onCommitCanvasChange?.();
  }, [onCommitCanvasChange, selectedObject]);

  if (!selectedObject) {
    return null;
  }

  const activeObj = selectedObject;
  const imgObj = activeObj as fabric.FabricImage;

  // --- Tool Handlers ---

  const handleSetAsBackground = async () => {
    if (isImage && activeObj instanceof fabric.FabricImage) {
      if (onSetImageAsBackground) {
        await onSetImageAsBackground(activeObj);
        return;
      }

      const canvas = activeObj.canvas;
      if (!canvas) return;
      const artW = canvasWidth || canvas.getWidth() / (canvas.getZoom() || 1);
      const artH = canvasHeight || canvas.getHeight() / (canvas.getZoom() || 1);

      const bgClone = await activeObj.clone();
      const { scale, left, top } = computeCoverBackgroundTransform(
        bgClone.width || 1,
        bgClone.height || 1,
        artW,
        artH
      );
      bgClone.set({
        originX: 'center',
        originY: 'center',
        left,
        top,
        scaleX: scale,
        scaleY: scale,
        angle: 0,
        clipPath: undefined,
        selectable: false,
        evented: false,
      });
      canvas.backgroundImage = bgClone;
      canvas.remove(activeObj);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      onCommitCanvasChange?.();
      return;
    }

    // Non-image element: apply element fill/stroke color as artboard background
    const candidateColor =
      typeof activeObj.fill === 'string' && activeObj.fill !== 'transparent'
        ? activeObj.fill
        : typeof activeObj.stroke === 'string'
        ? activeObj.stroke
        : null;

    if (candidateColor && onSetColorAsBackground) {
      onSetColorAsBackground(candidateColor);
      showNote('Applied color to background');
    } else if (candidateColor && activeObj.canvas) {
      activeObj.canvas.backgroundColor = candidateColor;
      activeObj.canvas.requestRenderAll();
      onCommitCanvasChange?.();
      showNote('Applied color to background');
    } else {
      showNote('Select an image or solid color object');
    }
  };

  const handleSmoothEdgesChange = (radius: number, commit: boolean = false) => {
    const objW = activeObj.width || 200;
    const objH = activeObj.height || 200;
    const { visualRadius, rx, ry } = computeSmoothEdgeClipRadii(
      radius,
      objW,
      objH,
      activeObj.scaleX || 1,
      activeObj.scaleY || 1
    );
    setEdgeRadius(visualRadius);
    (activeObj as any).__scribeEdgeRadius = visualRadius;

    if (activeObj instanceof fabric.Rect || activeObj.type === 'rect') {
      activeObj.set({ rx: Math.min(objW / 2, visualRadius), ry: Math.min(objH / 2, visualRadius) });
      activeObj.canvas?.requestRenderAll();
      if (commit) onCommitCanvasChange?.();
      return;
    }

    if (visualRadius <= 0) {
      activeObj.set({ clipPath: undefined, dirty: true });
    } else if (activeObj.clipPath instanceof fabric.Rect) {
      activeObj.clipPath.set({
        width: objW,
        height: objH,
        rx,
        ry,
        originX: 'center',
        originY: 'center',
      });
      activeObj.set('dirty', true);
    } else {
      activeObj.set(
        'clipPath',
        new fabric.Rect({
          width: objW,
          height: objH,
          rx,
          ry,
          originX: 'center',
          originY: 'center',
        })
      );
    }

    activeObj.canvas?.requestRenderAll();
    if (commit) {
      onCommitCanvasChange?.();
    }
  };

  // --- Sub-View Renderer ---

  const renderSubView = () => {
    switch (activeTool) {

      case 'smooth-edges':
        return (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Corner Radius</span>
                <span className="text-[10px] text-slate-400">0px – 100px</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={edgeRadius}
                  aria-label="Corner Radius"
                  onChange={(e) => handleSmoothEdgesChange(Number(e.target.value), false)}
                  onPointerUp={() => onCommitCanvasChange?.()}
                  onKeyUp={() => onCommitCanvasChange?.()}
                  className="flex-1 accent-white cursor-pointer"
                />
                <span
                  data-testid="smooth-edges-value"
                  className="text-xs font-mono tabular-nums text-white font-semibold w-11 text-right shrink-0"
                >
                  {edgeRadius}px
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Sharp (0px)', value: 0 },
                { label: 'Subtle (16px)', value: 16 },
                { label: 'Smooth (36px)', value: 36 },
                { label: 'Round (100px)', value: 100 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSmoothEdgesChange(preset.value, true)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                    edgeRadius === preset.value
                      ? 'bg-white text-[#08080a] border-white'
                      : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (activeTool === 'effects') {
    return (
      <ImageEffectsSubView
        activeEffectId={activeEffectId}
        intensity={effectIntensity}
        isImage={isImage}
        showHeader
        onSelectEffect={(effectId, nextInt) => selectEffect(effectId, nextInt)}
        onChangeIntensity={(nextInt) => updateIntensity(nextInt)}
        onCommitIntensity={() => onCommitCanvasChange?.()}
        onResetEffect={() => resetEffect()}
        onBack={() => setActiveTool(null)}
        onClose={() => (onClose ? onClose() : setActiveTool(null))}
      />
    );
  }

  if (activeTool === 'animation') {
    return (
      <ImageAnimationsSubView
        selectedObject={activeObj}
        slots={animationSlots}
        replayKey={animationReplayKey}
        playbackStatus={animationPlaybackStatus}
        onSelectPreset={selectAnimationPreset}
        onUpdateTiming={updateAnimationTiming}
        onReplay={replayAnimation}
        onClearSlot={clearSingleAnimation}
        onClearAll={clearAllAnimations}
        onBack={() => setActiveTool(null)}
        onClose={() => (onClose ? onClose() : setActiveTool(null))}
        showHeader
      />
    );
  }

  if (activeTool === 'invert-transform') {
    const isInverted = isImage
      ? activeEffectId === 'invert-colors' ||
        (imgObj.filters || []).some((f) => f instanceof fabric.filters.Invert)
      : activeEffectId === 'invert-colors';
    return (
      <ImageInvertTransformSubView
        selectedObject={activeObj}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        isInvertedColor={isInverted}
        onToggleInvertColors={() => {
          const nextEffect = isInverted ? 'none' : 'invert-colors';
          setActiveEffectId(nextEffect);
          setEffectIntensity(100);
          rebuildImageFilters(nextEffect, 100, sliders);
          showNote(nextEffect === 'invert-colors' ? 'Colors inverted' : 'Invert cleared');
        }}
        onUpdateSelectedProps={onUpdateSelectedProps}
        onCommitCanvasChange={onCommitCanvasChange}
        onFlipX={onFlipX}
        onFlipY={onFlipY}
        onBack={() => setActiveTool(null)}
        onClose={() => (onClose ? onClose() : setActiveTool(null))}
        onFeedback={showNote}
        showHeader
      />
    );
  }

  if (activeTool === 'filters') {
    return (
      <ImageFiltersSubView
        filters={filters}
        isImage={isImage}
        elementOpacity={elementOpacity}
        elementStrokeWidth={elementStrokeWidth}
        onUpdateSliders={(patch, opts) => updateFilterSliders(patch, opts)}
        onResetFilter={(key) => resetFilter(key)}
        onCommitCanvasChange={onCommitCanvasChange}
        onResetAllFilters={() => {
          resetAllFilters();
          showNote('Filters reset');
        }}
        onChangeElementOpacity={(val) => {
          setElementOpacity(val);
          onUpdateSelectedProps({ opacity: val / 100 });
        }}
        onChangeElementStrokeWidth={(w) => {
          setElementStrokeWidth(w);
          onUpdateSelectedProps({
            strokeWidth: w,
            stroke: w > 0 && !activeObj.stroke ? '#ffffff' : activeObj.stroke,
          });
        }}
        onResetNonImageFilters={() => {
          setElementOpacity(100);
          setElementStrokeWidth(0);
          setSliders(DEFAULT_FILTER_SLIDERS);
          onUpdateSelectedProps({ opacity: 1, strokeWidth: 0, shadow: null });
          showNote('Filters reset');
        }}
        onBack={() => setActiveTool(null)}
        onClose={() => (onClose ? onClose() : setActiveTool(null))}
        showHeader
      />
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">
      {/* Fixed Top Header Bar */}
      {activeTool === null ? (
        <header className="h-12 px-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02] backdrop-blur-2xl">
          <h3 className="text-xs font-semibold text-white tracking-tight whitespace-nowrap">
            {isImage ? 'Image Edits' : 'Edit Asset'}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono uppercase text-slate-400">
              {activeObj.type || 'object'}
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
      ) : (
        <header className="h-12 px-2.5 border-b border-white/[0.08] grid grid-cols-[36px_1fr_36px] items-center shrink-0 bg-white/[0.02] backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => setActiveTool(null)}
            aria-label="Back to Edit Asset"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-xs font-semibold text-white tracking-tight text-center truncate px-1">
            {TOOL_TITLES[activeTool]}
          </h3>
          <button
            type="button"
            onClick={() => (onClose ? onClose() : setActiveTool(null))}
            aria-label="Close sub-view"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors justify-self-end"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
      )}

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 text-xs text-slate-300">
        {activeTool === null ? (
          <div
            className="grid grid-cols-2 gap-2.5"
            aria-label="Asset editing tools"
          >
            {IMAGE_EDIT_GRID_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'set-background') {
                      handleSetAsBackground();
                    } else {
                      setActiveTool(item.id);
                    }
                  }}
                  className="group aspect-square rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.22] backdrop-blur-xl p-3 flex flex-col items-center justify-center gap-2.5 text-center transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] group-hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-slate-200 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-white leading-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {renderSubView()}

            {feedbackNote && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-[11px]">
                <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>{feedbackNote}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

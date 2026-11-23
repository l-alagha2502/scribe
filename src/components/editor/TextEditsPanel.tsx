import React, { useState, useEffect, useMemo } from 'react';
import * as fabric from 'fabric';
import {
  ArrowLeft,
  X,
  Sparkles,
  Play,
  SquareDashed,
  LayoutPanelLeft,
  Droplet,
  Move,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  MoveVertical,
  Search,
  ChevronRight,
  RotateCcw,
  PanelLeftClose,
} from 'lucide-react';
import { CustomFontRecord } from '../../types';
import {
  CURATED_FONT_CATALOG,
  FONT_FILTER_CATEGORIES,
  FontFilterCategory,
  cancelHoverFontLoad,
  getFontFallbackStack,
  loadFontOnDemand,
  scheduleHoverFontLoad,
  subscribeFontLoaded,
} from '../../utils/fontCatalog';
import { useImageEffects } from '../../utils/imageEffectsEngine';
import { useObjectAnimation } from '../../utils/animationEngine';
import {
  TextOutlineConfig,
  applyTextOutline,
  cycleTextAlignment,
  cycleTextCapitalization,
  fitTextBoxWidthToContent,
  getTextCaseMode,
  isTextBulleted,
  readTextOutlineState,
  toggleBulletedListText,
} from '../../utils/textEditHelpers';
import { ImageEffectsSubView } from './ImageEffectsSubView';
import { ImageAnimationsSubView } from './ImageAnimationsSubView';
import { ImageInvertTransformSubView } from './ImageInvertTransformSubView';
import { TextOutlineSubView } from './TextOutlineSubView';
import { TextLayoutSubView } from './TextLayoutSubView';

export type TextEditSubViewId =
  | 'effects'
  | 'animation'
  | 'outline'
  | 'text-layout'
  | 'opacity'
  | 'position'
  | 'font';

export interface TextEditsPanelProps {
  selectedObject: fabric.FabricObject;
  objectRevision?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  customFonts?: CustomFontRecord[];
  onUpdateSelectedProps: (props: Partial<any>) => void;
  onCommitCanvasChange?: () => void;
  onFlipX?: () => void;
  onFlipY?: () => void;
  onClose?: () => void;
  onCollapsePanel?: () => void;
}

const DynamicAlignSvg: React.FC<{ align: 'left' | 'center' | 'right' }> = ({ align }) => {
  const lines =
    align === 'center'
      ? [
          { x: 2, w: 12 },
          { x: 4, w: 8 },
          { x: 2, w: 12 },
          { x: 5, w: 6 },
        ]
      : align === 'right'
      ? [
          { x: 2, w: 12 },
          { x: 6, w: 8 },
          { x: 2, w: 12 },
          { x: 8, w: 6 },
        ]
      : [
          { x: 2, w: 12 },
          { x: 2, w: 8 },
          { x: 2, w: 12 },
          { x: 2, w: 6 },
        ];

  return (
    <svg
      viewBox="0 0 16 16"
      className="w-3.5 h-3.5"
      fill="none"
      aria-hidden="true"
      data-testid="text-align-dynamic-svg"
      data-align={align}
    >
      {lines.map((line, i) => (
        <rect
          key={i}
          x={line.x}
          y={2.5 + i * 3}
          width={line.w}
          height={1.6}
          rx={0.8}
          fill="currentColor"
        />
      ))}
    </svg>
  );
};

export const TextEditsPanel: React.FC<TextEditsPanelProps> = ({
  selectedObject,
  objectRevision = 0,
  canvasWidth = 1200,
  canvasHeight = 630,
  customFonts = [],
  onUpdateSelectedProps,
  onCommitCanvasChange,
  onFlipX,
  onFlipY,
  onClose,
  onCollapsePanel,
}) => {
  const [activeSubView, setActiveSubView] = useState<TextEditSubViewId | null>(null);
  const [isSpacingOpen, setIsSpacingOpen] = useState<boolean>(false);
  const [opacityPct, setOpacityPct] = useState<number>(100);
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [fontCategory, setFontCategory] = useState<FontFilterCategory>('All');
  const [, setFontRevision] = useState(0);

  // Reset sub-view when switching between distinct objects
  useEffect(() => {
    setActiveSubView(null);
  }, [selectedObject]);

  useEffect(() => {
    const unsub = subscribeFontLoaded(() => setFontRevision((v) => v + 1));
    return () => {
      unsub();
      cancelHoverFontLoad();
    };
  }, []);

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

  // Live synced text state derived from Fabric object (+ objectRevision tick)
  const textState = useMemo(() => {
    const obj = selectedObject as any;
    const rawFill = typeof obj.fill === 'string' && obj.fill.startsWith('#') ? obj.fill : '#ffffff';
    const fontFamily = String(obj.fontFamily || 'Inter');
    const fontSize = Math.max(6, Math.round(Number(obj.fontSize || 36)));
    const isBold = obj.fontWeight === 'bold' || Number(obj.fontWeight) >= 700;
    const isItalic = obj.fontStyle === 'italic';
    const isUnderline = Boolean(obj.underline);
    const isStrikethrough = Boolean(obj.linethrough);
    const rawAlign = String(obj.textAlign || 'left').toLowerCase();
    const align: 'left' | 'center' | 'right' =
      rawAlign === 'center' ? 'center' : rawAlign === 'right' ? 'right' : 'left';
    const textStr = String(obj.text || '');
    const bulleted = isTextBulleted(textStr);
    const caseMode = getTextCaseMode(selectedObject);
    const lineHeight = Number(obj.lineHeight ?? 1.16);
    const charSpacing = Number(obj.charSpacing ?? 0);
    const paragraphSpacing = Number(obj.paragraphSpacing ?? 0);
    const width = Math.round(Number(obj.width || 320));
    const height = Math.round(Number(obj.height || 60));
    const splitByGrapheme = Boolean(obj.splitByGrapheme);
    const outline = readTextOutlineState(selectedObject);
    const liveOpacity = Math.round((selectedObject.opacity ?? 1) * 100);

    return {
      fill: rawFill,
      fontFamily,
      fontSize,
      isBold,
      isItalic,
      isUnderline,
      isStrikethrough,
      align,
      textStr,
      bulleted,
      caseMode,
      lineHeight,
      charSpacing,
      paragraphSpacing,
      width,
      height,
      splitByGrapheme,
      outline,
      liveOpacity,
    };
  }, [selectedObject, objectRevision]);

  useEffect(() => {
    setOpacityPct(textState.liveOpacity);
  }, [textState.liveOpacity]);

  const visibleFontCategories = useMemo(
    () =>
      FONT_FILTER_CATEGORIES.filter(
        (cat) => cat !== 'Custom' || customFonts.length > 0
      ),
    [customFonts.length]
  );

  const filteredFonts = useMemo(() => {
    const q = fontSearchQuery.trim().toLowerCase();
    const customItems = customFonts.map((cf) => ({
      family: cf.name,
      category: 'Custom' as const,
      fallbackStack: `'${cf.name}', 'Inter', sans-serif`,
      tags: [cf.name.toLowerCase(), 'custom', 'uploaded'],
      isCustom: true,
    }));
    const curatedItems = CURATED_FONT_CATALOG.map((item) => ({
      family: item.family,
      category: item.category,
      fallbackStack: item.fallbackStack,
      tags: item.tags,
      isCustom: false,
    }));

    return [...customItems, ...curatedItems].filter((item) => {
      if (fontCategory !== 'All' && item.category !== fontCategory) return false;
      if (!q) return true;
      return (
        item.family.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q))
      );
    });
  }, [customFonts, fontCategory, fontSearchQuery]);

  // --- Sub-Views ---

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

  if (activeSubView === 'outline') {
    return (
      <TextOutlineSubView
        config={textState.outline}
        onChange={(nextConfig: TextOutlineConfig, commit?: boolean) => {
          applyTextOutline(selectedObject, nextConfig);
          selectedObject.canvas?.requestRenderAll();
          onUpdateSelectedProps({});
          if (commit) onCommitCanvasChange?.();
        }}
        onCommit={() => onCommitCanvasChange?.()}
        onReset={() => {
          applyTextOutline(selectedObject, {
            enabled: false,
            color: '#000000',
            width: 0,
            type: 'solid',
          });
          selectedObject.canvas?.requestRenderAll();
          onUpdateSelectedProps({});
          onCommitCanvasChange?.();
        }}
        onBack={() => setActiveSubView(null)}
        onClose={() => (onClose ? onClose() : setActiveSubView(null))}
      />
    );
  }

  if (activeSubView === 'text-layout') {
    return (
      <TextLayoutSubView
        width={textState.width}
        height={textState.height}
        canvasWidth={canvasWidth}
        splitByGrapheme={textState.splitByGrapheme}
        onChangeWidth={(nextW, commit) => {
          selectedObject.set({ width: nextW });
          if (typeof (selectedObject as any).initDimensions === 'function') {
            (selectedObject as any).initDimensions();
          }
          selectedObject.setCoords();
          selectedObject.canvas?.requestRenderAll();
          onUpdateSelectedProps({ width: nextW });
          if (commit) onCommitCanvasChange?.();
        }}
        onCommit={() => onCommitCanvasChange?.()}
        onToggleSplitByGrapheme={(nextSplit) => {
          onUpdateSelectedProps({ splitByGrapheme: nextSplit });
          if (typeof (selectedObject as any).initDimensions === 'function') {
            (selectedObject as any).initDimensions();
          }
          selectedObject.canvas?.requestRenderAll();
          onCommitCanvasChange?.();
        }}
        onAutoFitWidth={() => {
          const nextW = fitTextBoxWidthToContent(selectedObject, canvasWidth);
          selectedObject.canvas?.requestRenderAll();
          onUpdateSelectedProps({ width: nextW });
          onCommitCanvasChange?.();
        }}
        onBack={() => setActiveSubView(null)}
        onClose={() => (onClose ? onClose() : setActiveSubView(null))}
      />
    );
  }

  if (activeSubView === 'opacity') {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-transparent" data-testid="text-opacity-subview">
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
              <span
                data-testid="text-opacity-value"
                className="font-mono tabular-nums text-white font-semibold"
              >
                {opacityPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={opacityPct}
              aria-label="Text Opacity"
              data-testid="text-opacity-slider"
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
              onKeyUp={() => onCommitCanvasChange?.()}
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

  if (activeSubView === 'font') {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-transparent" data-testid="text-font-subview">
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
            Font Family
          </h3>
          <button
            type="button"
            onClick={() => (onClose ? onClose() : setActiveSubView(null))}
            aria-label="Close Font Picker"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors justify-self-end"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs text-slate-300">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={fontSearchQuery}
              data-testid="edit-font-search-input"
              onChange={(e) => setFontSearchQuery(e.target.value)}
              placeholder={`Search ${CURATED_FONT_CATALOG.length + customFonts.length} fonts...`}
              className="w-full py-2 pl-8 pr-8 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-white/25"
            />
            {fontSearchQuery && (
              <button
                type="button"
                onClick={() => setFontSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 text-[10px] no-scrollbar">
            {visibleFontCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFontCategory(cat)}
                className={`px-2.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors ${
                  fontCategory === cat
                    ? 'bg-white text-[#08080a] font-semibold'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            {filteredFonts.map((font) => {
              const isActive =
                textState.fontFamily.toLowerCase() === font.family.toLowerCase();
              const slug = font.family.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              return (
                <button
                  key={`${font.isCustom ? 'custom' : 'curated'}-${font.family}`}
                  type="button"
                  data-testid={`edit-font-option-${slug}`}
                  onMouseEnter={() => {
                    if (!font.isCustom) scheduleHoverFontLoad(font.family);
                  }}
                  onMouseLeave={() => {
                    if (!font.isCustom) cancelHoverFontLoad(font.family);
                  }}
                  onClick={() => {
                    if (!font.isCustom) void loadFontOnDemand(font.family);
                    onUpdateSelectedProps({ fontFamily: font.family });
                    onCommitCanvasChange?.();
                  }}
                  className={`w-full px-2.5 py-2 rounded-lg border text-left flex items-center justify-between gap-2 transition-colors ${
                    isActive
                      ? 'bg-white/[0.12] border-white/30 text-white'
                      : 'bg-white/[0.025] hover:bg-white/[0.06] border-white/[0.06] text-slate-200 hover:text-white'
                  }`}
                >
                  <span
                    className="text-sm truncate"
                    style={{ fontFamily: font.fallbackStack }}
                  >
                    {font.family}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {font.isCustom ? 'Custom' : font.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- Main Text Edit Root View (Exact Ordered Layout) ---

  const featureCards: {
    id: TextEditSubViewId;
    label: string;
    icon: React.FC<{ className?: string }>;
    meta?: string;
    active?: boolean;
  }[] = [
    {
      id: 'effects',
      label: 'Effects',
      icon: Sparkles,
      active: activeEffectId !== 'none',
    },
    {
      id: 'animation',
      label: 'Animation',
      icon: Play,
      active: Boolean(animationSlots.in || animationSlots.out || animationSlots.passive),
    },
    {
      id: 'outline',
      label: 'Outline',
      icon: SquareDashed,
      active: textState.outline.enabled,
    },
    {
      id: 'text-layout',
      label: 'Text Layout',
      icon: LayoutPanelLeft,
    },
    {
      id: 'opacity',
      label: 'Opacity',
      icon: Droplet,
      meta: `${opacityPct}%`,
      active: opacityPct < 100,
    },
    {
      id: 'position',
      label: 'Position',
      icon: Move,
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent" data-testid="text-edits-panel">
      {/* Static Header */}
      <header className="h-12 px-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02] backdrop-blur-2xl">
        <h3 className="text-xs font-semibold text-white tracking-tight whitespace-nowrap">
          Edit
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400">Text</span>
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
        {/* 1. TOP FEATURE BOXES (6 Cards: Effects, Animation, Outline, Text Layout, Opacity, Position) */}
        <section
          aria-label="Text feature tools"
          data-testid="text-top-feature-cards"
          className="grid grid-cols-3 gap-1.5"
        >
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                data-testid={`text-feature-card-${card.id}`}
                onClick={() => setActiveSubView(card.id)}
                className={`group rounded-xl border p-2 flex flex-col items-center justify-center gap-1.5 text-center transition-all min-h-[64px] ${
                  card.active
                    ? 'bg-white/[0.09] border-white/25 text-white'
                    : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.2] text-slate-200 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 text-slate-200 group-hover:text-white shrink-0" />
                <span className="text-[11px] font-medium leading-tight whitespace-nowrap">
                  {card.label}
                </span>
                {card.meta && (
                  <span className="text-[9px] font-mono tabular-nums text-slate-400 leading-none">
                    {card.meta}
                  </span>
                )}
              </button>
            );
          })}
        </section>

        {/* 2. FONT (Vertical Rectangle) + COLOR & SIZE ROW */}
        <section
          aria-label="Font, Color and Size"
          data-testid="text-font-color-size-row"
          className="grid grid-cols-[1.1fr_1fr] gap-2 items-stretch pt-2 border-t border-white/[0.06]"
        >
          {/* Vertical Rectangle Font Control */}
          <button
            type="button"
            data-testid="text-font-card"
            onClick={() => setActiveSubView('font')}
            className="rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/25 p-2.5 flex flex-col justify-between text-left min-h-[96px] transition-colors group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-medium text-slate-400">Font</span>
              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <div
              className="text-2xl leading-none text-white py-1 truncate"
              style={{ fontFamily: getFontFallbackStack(textState.fontFamily) }}
            >
              Aa
            </div>
            <div className="text-[11px] font-semibold text-slate-200 truncate w-full">
              {textState.fontFamily}
            </div>
          </button>

          {/* Color & Size Stacked Next to Vertical Font Rectangle */}
          <div className="flex flex-col gap-2 min-w-0">
            {/* Text Color Card */}
            <label
              data-testid="text-color-card"
              className="flex-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/25 px-2.5 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors"
            >
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 leading-tight">Color</div>
                <div className="text-[11px] font-mono text-white uppercase truncate mt-0.5">
                  {textState.fill}
                </div>
              </div>
              <div
                className="w-6 h-6 rounded-lg border border-white/25 shrink-0"
                style={{ backgroundColor: textState.fill }}
              />
              <input
                type="color"
                data-testid="text-color-input"
                value={textState.fill}
                onChange={(e) => onUpdateSelectedProps({ fill: e.target.value })}
                onBlur={() => onCommitCanvasChange?.()}
                className="sr-only"
              />
            </label>

            {/* Font Size Card */}
            <div
              data-testid="text-size-card"
              className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] px-2 py-1.5 flex items-center justify-between gap-1"
            >
              <button
                type="button"
                aria-label="Decrease font size"
                data-testid="text-size-dec"
                onClick={() => {
                  const next = Math.max(6, textState.fontSize - 2);
                  onUpdateSelectedProps({ fontSize: next });
                  onCommitCanvasChange?.();
                }}
                className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white flex items-center justify-center text-xs font-semibold shrink-0"
              >
                -
              </button>
              <div className="flex items-baseline gap-0.5 min-w-0">
                <input
                  type="number"
                  min={6}
                  max={400}
                  value={textState.fontSize}
                  aria-label="Font size"
                  data-testid="text-size-input"
                  onChange={(e) => {
                    const next = Math.max(6, Math.min(400, Number(e.target.value) || 6));
                    onUpdateSelectedProps({ fontSize: next });
                  }}
                  onBlur={() => onCommitCanvasChange?.()}
                  className="w-10 bg-transparent text-white text-xs font-mono tabular-nums font-semibold text-center outline-none"
                />
                <span className="text-[9px] text-slate-500 font-mono">px</span>
              </div>
              <button
                type="button"
                aria-label="Increase font size"
                data-testid="text-size-inc"
                onClick={() => {
                  const next = Math.min(400, textState.fontSize + 2);
                  onUpdateSelectedProps({ fontSize: next });
                  onCommitCanvasChange?.();
                }}
                className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white flex items-center justify-center text-xs font-semibold shrink-0"
              >
                +
              </button>
            </div>
          </div>
        </section>

        {/* 3. COMPACT FORMATTING ROW (Very Small Boxes) */}
        <section
          aria-label="Compact text formatting"
          data-testid="text-compact-formatting-row"
          className="space-y-2.5 pt-2 border-t border-white/[0.06]"
        >
          <div className="grid grid-cols-8 gap-1">
            {/* Bold */}
            <button
              type="button"
              data-testid="text-format-bold"
              aria-pressed={textState.isBold}
              title="Bold"
              onClick={() => {
                onUpdateSelectedProps({
                  fontWeight: textState.isBold ? 'normal' : 'bold',
                });
                onCommitCanvasChange?.();
              }}
              className={`h-8 rounded-lg border flex items-center justify-center transition-colors ${
                textState.isBold
                  ? 'bg-white text-[#08080a] border-white'
                  : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Italic */}
            <button
              type="button"
              data-testid="text-format-italic"
              aria-pressed={textState.isItalic}
              title="Italic"
              onClick={() => {
                onUpdateSelectedProps({
                  fontStyle: textState.isItalic ? 'normal' : 'italic',
                });
                onCommitCanvasChange?.();
              }}
              className={`h-8 rounded-lg border flex items-center justify-center transition-colors ${
                textState.isItalic
                  ? 'bg-white text-[#08080a] border-white'
                  : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            {/* Underline */}
            <button
              type="button"
              data-testid="text-format-underline"
              aria-pressed={textState.isUnderline}
              title="Underline"
              onClick={() => {
                onUpdateSelectedProps({ underline: !textState.isUnderline });
                onCommitCanvasChange?.();
              }}
              className={`h-8 rounded-lg border flex items-center justify-center transition-colors ${
                textState.isUnderline
                  ? 'bg-white text-[#08080a] border-white'
                  : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            {/* Strikethrough */}
            <button
              type="button"
              data-testid="text-format-strikethrough"
              aria-pressed={textState.isStrikethrough}
              title="Strikethrough"
              onClick={() => {
                onUpdateSelectedProps({ linethrough: !textState.isStrikethrough });
                onCommitCanvasChange?.();
              }}
              className={`h-8 rounded-lg border flex items-center justify-center transition-colors ${
                textState.isStrikethrough
                  ? 'bg-white text-[#08080a] border-white'
                  : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            {/* Dynamic Align Cycler (Left -> Center -> Right) */}
            <button
              type="button"
              data-testid="text-format-align"
              data-align={textState.align}
              title={`Align: ${textState.align} (click to cycle)`}
              aria-label={`Align ${textState.align}`}
              onClick={() => {
                const nextAlign = cycleTextAlignment(textState.align);
                onUpdateSelectedProps({ textAlign: nextAlign });
                onCommitCanvasChange?.();
              }}
              className="h-8 rounded-lg border bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200 hover:text-white flex items-center justify-center transition-colors"
            >
              <DynamicAlignSvg align={textState.align} />
            </button>

            {/* Bullets */}
            <button
              type="button"
              data-testid="text-format-bullets"
              aria-pressed={textState.bulleted}
              title="Bulleted List"
              onClick={() => {
                const { nextText } = toggleBulletedListText(textState.textStr);
                onUpdateSelectedProps({ text: nextText });
                if (typeof (selectedObject as any).initDimensions === 'function') {
                  (selectedObject as any).initDimensions();
                }
                selectedObject.canvas?.requestRenderAll();
                onCommitCanvasChange?.();
              }}
              className={`h-8 rounded-lg border flex items-center justify-center transition-colors ${
                textState.bulleted
                  ? 'bg-white text-[#08080a] border-white'
                  : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>

            {/* Capitalize */}
            <button
              type="button"
              data-testid="text-format-capitalize"
              data-case-mode={textState.caseMode}
              aria-pressed={textState.caseMode !== 'normal'}
              title={`Capitalize: ${textState.caseMode}`}
              onClick={() => {
                const { nextText } = cycleTextCapitalization(selectedObject);
                onUpdateSelectedProps({ text: nextText });
                if (typeof (selectedObject as any).initDimensions === 'function') {
                  (selectedObject as any).initDimensions();
                }
                selectedObject.canvas?.requestRenderAll();
                onCommitCanvasChange?.();
              }}
              className={`h-8 rounded-lg border flex items-center justify-center text-[10px] font-semibold tracking-tight transition-colors ${
                textState.caseMode !== 'normal'
                  ? 'bg-white text-[#08080a] border-white'
                  : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              {textState.caseMode === 'uppercase'
                ? 'AA'
                : textState.caseMode === 'lowercase'
                ? 'aa'
                : 'Aa'}
            </button>

            {/* Spacing Toggle */}
            <button
              type="button"
              data-testid="text-format-spacing"
              aria-expanded={isSpacingOpen}
              title="Line, Letter & Paragraph Spacing"
              onClick={() => setIsSpacingOpen((v) => !v)}
              className={`h-8 rounded-lg border flex items-center justify-center transition-colors ${
                isSpacingOpen
                  ? 'bg-white text-[#08080a] border-white'
                  : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <MoveVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Expandable Spacing Controls (Line Spacing, Letter Spacing, Paragraph Spacing) */}
          {isSpacingOpen && (
            <div
              data-testid="text-spacing-panel"
              className="p-3 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white">Spacing</span>
                <button
                  type="button"
                  data-testid="text-spacing-reset-btn"
                  onClick={() => {
                    onUpdateSelectedProps({
                      lineHeight: 1.16,
                      charSpacing: 0,
                      paragraphSpacing: 0,
                    });
                    onCommitCanvasChange?.();
                  }}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Line Spacing */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">Line Spacing</span>
                  <span className="font-mono tabular-nums text-white">
                    {textState.lineHeight.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.6}
                    max={3.0}
                    step={0.02}
                    value={textState.lineHeight}
                    aria-label="Line Spacing"
                    data-testid="text-line-spacing-slider"
                    onDoubleClick={() => {
                      onUpdateSelectedProps({ lineHeight: 1.16 });
                      onCommitCanvasChange?.();
                    }}
                    onChange={(e) =>
                      onUpdateSelectedProps({ lineHeight: Number(e.target.value) })
                    }
                    onPointerUp={() => onCommitCanvasChange?.()}
                    className="flex-1 accent-white cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0.6}
                    max={3.0}
                    step={0.05}
                    value={Number(textState.lineHeight.toFixed(2))}
                    aria-label="Line Spacing value"
                    onChange={(e) =>
                      onUpdateSelectedProps({
                        lineHeight: Math.max(0.6, Math.min(3, Number(e.target.value) || 1.16)),
                      })
                    }
                    onBlur={() => onCommitCanvasChange?.()}
                    className="w-14 py-1 px-1.5 rounded-lg bg-black/40 border border-white/[0.08] text-white text-[11px] font-mono tabular-nums text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Letter Spacing */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">Letter Spacing</span>
                  <span className="font-mono tabular-nums text-white">
                    {Math.round(textState.charSpacing)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-100}
                    max={800}
                    step={10}
                    value={textState.charSpacing}
                    aria-label="Letter Spacing"
                    data-testid="text-letter-spacing-slider"
                    onDoubleClick={() => {
                      onUpdateSelectedProps({ charSpacing: 0 });
                      onCommitCanvasChange?.();
                    }}
                    onChange={(e) =>
                      onUpdateSelectedProps({ charSpacing: Number(e.target.value) })
                    }
                    onPointerUp={() => onCommitCanvasChange?.()}
                    className="flex-1 accent-white cursor-pointer"
                  />
                  <input
                    type="number"
                    min={-100}
                    max={800}
                    step={10}
                    value={Math.round(textState.charSpacing)}
                    aria-label="Letter Spacing value"
                    onChange={(e) =>
                      onUpdateSelectedProps({
                        charSpacing: Math.max(-100, Math.min(800, Number(e.target.value) || 0)),
                      })
                    }
                    onBlur={() => onCommitCanvasChange?.()}
                    className="w-14 py-1 px-1.5 rounded-lg bg-black/40 border border-white/[0.08] text-white text-[11px] font-mono tabular-nums text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Paragraph Spacing */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">Paragraph Spacing</span>
                  <span className="font-mono tabular-nums text-white">
                    {Math.round(textState.paragraphSpacing)}px
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={2}
                    value={textState.paragraphSpacing}
                    aria-label="Paragraph Spacing"
                    data-testid="text-paragraph-spacing-slider"
                    onDoubleClick={() => {
                      onUpdateSelectedProps({ paragraphSpacing: 0 });
                      onCommitCanvasChange?.();
                    }}
                    onChange={(e) =>
                      onUpdateSelectedProps({ paragraphSpacing: Number(e.target.value) })
                    }
                    onPointerUp={() => onCommitCanvasChange?.()}
                    className="flex-1 accent-white cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0}
                    max={120}
                    step={2}
                    value={Math.round(textState.paragraphSpacing)}
                    aria-label="Paragraph Spacing value"
                    onChange={(e) =>
                      onUpdateSelectedProps({
                        paragraphSpacing: Math.max(0, Math.min(120, Number(e.target.value) || 0)),
                      })
                    }
                    onBlur={() => onCommitCanvasChange?.()}
                    className="w-14 py-1 px-1.5 rounded-lg bg-black/40 border border-white/[0.08] text-white text-[11px] font-mono tabular-nums text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import * as fabric from 'fabric';
import {
  ArrowLeft,
  X,
  Palette,
  Maximize2,
  Grid as GridIcon,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Check,
  Minus,
  PanelLeftClose,
} from 'lucide-react';
import { BrandRecord } from '../../types';

export interface CanvasGradientStop {
  id: string;
  color: string;
  position: number; // 0 to 100
}

export interface CanvasBackgroundState {
  mode: 'solid' | 'gradient';
  solidColor: string;
  gradientType: 'linear' | 'radial';
  gradientAngle: number;
  stops: CanvasGradientStop[];
}

export type GridAxisMode = 'both' | 'vertical' | 'horizontal';

export interface CanvasGridConfig {
  visible: boolean;
  includeInExport: boolean;
  axisMode: GridAxisMode;
  rows: number;
  columns: number;
  color: string;
  opacity: number; // 0.05 to 1
}

export const DEFAULT_CANVAS_GRID_CONFIG: CanvasGridConfig = {
  visible: false,
  includeInExport: false,
  axisMode: 'both',
  rows: 4,
  columns: 4,
  color: '#6366f1',
  opacity: 0.45,
};

export type InspectSubView = 'color' | 'resize' | 'grid' | null;

export interface CanvasInspectPanelProps {
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  canvasBgImageUrl?: string | null;
  brands?: BrandRecord[];
  gridConfig: CanvasGridConfig;
  onChangeGridConfig: (next: CanvasGridConfig) => void;
  onChangeCanvasBackground: (
    fill: string | fabric.Gradient<'linear'> | fabric.Gradient<'radial'>,
    solidFallbackHex: string
  ) => void;
  onClearCanvasBgImage?: () => void;
  onResizeCanvas: (width: number, height: number) => void;
  onClose?: () => void;
  onCollapsePanel?: () => void;
  initialSubView?: InspectSubView;
}

const SOLID_SWATCHES = [
  '#08080a',
  '#121318',
  '#1e2029',
  '#ffffff',
  '#f8fafc',
  '#e2e8f0',
  '#6366f1',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
];

const STANDARD_PALETTES: { name: string; colors: string[] }[] = [
  {
    name: 'Studio Monochrome',
    colors: ['#08080a', '#14151a', '#27272a', '#71717a', '#f4f4f5'],
  },
  {
    name: 'Editorial Warm',
    colors: ['#1c1917', '#44403c', '#d6d3d1', '#f5f0eb', '#ea580c'],
  },
  {
    name: 'Cobalt & Mist',
    colors: ['#0f172a', '#1e3a8a', '#3b82f6', '#bae6fd', '#f8fafc'],
  },
  {
    name: 'Emerald Slate',
    colors: ['#06241d', '#065f46', '#10b981', '#a7f3d0', '#ecfdf5'],
  },
];

const GRADIENT_PRESETS: {
  name: string;
  type: 'linear' | 'radial';
  angle: number;
  stops: { color: string; position: number }[];
}[] = [
  {
    name: 'Obsidian Glow',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#08080a', position: 0 },
      { color: '#1e1b4b', position: 100 },
    ],
  },
  {
    name: 'Aurora Dusk',
    type: 'linear',
    angle: 120,
    stops: [
      { color: '#4f46e5', position: 0 },
      { color: '#ec4899', position: 52 },
      { color: '#f59e0b', position: 100 },
    ],
  },
  {
    name: 'Nordic Sky',
    type: 'linear',
    angle: 150,
    stops: [
      { color: '#0f172a', position: 0 },
      { color: '#0284c7', position: 100 },
    ],
  },
  {
    name: 'Radial Halo',
    type: 'radial',
    angle: 0,
    stops: [
      { color: '#312e81', position: 0 },
      { color: '#09090b', position: 100 },
    ],
  },
  {
    name: 'Warm Paper',
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#fffbeb', position: 0 },
      { color: '#fde68a', position: 100 },
    ],
  },
  {
    name: 'Emerald Radial',
    type: 'radial',
    angle: 0,
    stops: [
      { color: '#059669', position: 0 },
      { color: '#064e3b', position: 55 },
      { color: '#070a09', position: 100 },
    ],
  },
];

const RESIZE_PRESETS: Record<
  'Square' | 'Portrait' | 'Landscape',
  { label: string; width: number; height: number }[]
> = {
  Square: [
    { label: 'Instagram Square', width: 1080, height: 1080 },
    { label: 'Display Square Ad', width: 250, height: 250 },
    { label: 'Album Artwork', width: 2048, height: 2048 },
    { label: 'Avatar / Icon', width: 512, height: 512 },
  ],
  Portrait: [
    { label: 'Story / Reel / TikTok', width: 1080, height: 1920 },
    { label: 'Instagram Portrait', width: 1080, height: 1350 },
    { label: 'Pinterest Pin', width: 1000, height: 1500 },
    { label: 'A4 Print (300 DPI)', width: 2480, height: 3508 },
    { label: 'US Letter Print', width: 2550, height: 3300 },
  ],
  Landscape: [
    { label: 'Full HD 16:9', width: 1920, height: 1080 },
    { label: 'Facebook / Link Post', width: 1200, height: 630 },
    { label: 'YouTube Thumbnail', width: 1280, height: 720 },
    { label: 'Twitter / X Post', width: 1200, height: 675 },
    { label: 'LinkedIn Banner', width: 1584, height: 396 },
  ],
};

const GRID_COLOR_SWATCHES = ['#6366f1', '#ffffff', '#000000', '#06b6d4', '#f43f5e', '#f59e0b'];

export function getOrientationLabel(width: number, height: number): 'Portrait' | 'Landscape' | 'Square' {
  if (width === height) return 'Square';
  return height > width ? 'Portrait' : 'Landscape';
}

export function buildFabricCanvasGradient(
  type: 'linear' | 'radial',
  angle: number,
  stops: CanvasGradientStop[],
  width: number,
  height: number
): fabric.Gradient<'linear'> | fabric.Gradient<'radial'> {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const colorStops = sorted.map((s) => ({
    offset: Math.max(0, Math.min(1, s.position / 100)),
    color: s.color,
  }));

  if (type === 'radial') {
    const cx = width / 2;
    const cy = height / 2;
    return new fabric.Gradient<'radial'>({
      type: 'radial',
      gradientUnits: 'pixels',
      coords: {
        x1: cx,
        y1: cy,
        r1: 0,
        x2: cx,
        y2: cy,
        r2: Math.max(width, height) * 0.65,
      },
      colorStops,
    });
  }

  const rad = ((angle - 90) * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const halfDiag = Math.sqrt(cx * cx + cy * cy);
  const dx = Math.cos(rad) * halfDiag;
  const dy = Math.sin(rad) * halfDiag;

  return new fabric.Gradient<'linear'>({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: {
      x1: cx - dx,
      y1: cy - dy,
      x2: cx + dx,
      y2: cy + dy,
    },
    colorStops,
  });
}

function buildCssGradientPreview(
  type: 'linear' | 'radial',
  angle: number,
  stops: { color: string; position: number }[]
): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const stopsStr = sorted.map((s) => `${s.color} ${s.position}%`).join(', ');
  return type === 'radial'
    ? `radial-gradient(circle, ${stopsStr})`
    : `linear-gradient(${angle}deg, ${stopsStr})`;
}

export const CanvasInspectPanel: React.FC<CanvasInspectPanelProps> = ({
  canvasWidth,
  canvasHeight,
  canvasBgColor,
  canvasBgImageUrl = null,
  brands = [],
  gridConfig,
  onChangeGridConfig,
  onChangeCanvasBackground,
  onClearCanvasBgImage,
  onResizeCanvas,
  onClose,
  onCollapsePanel,
  initialSubView = null,
}) => {
  const orientation = getOrientationLabel(canvasWidth, canvasHeight);
  const [activeSubView, setActiveSubView] = useState<InspectSubView>(initialSubView);

  // Background color & gradient state
  const [colorMode, setColorMode] = useState<'solid' | 'gradient'>('solid');
  const [solidHex, setSolidHex] = useState<string>(canvasBgColor || '#08080a');
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [gradientAngle, setGradientAngle] = useState<number>(135);
  const [gradientStops, setGradientStops] = useState<CanvasGradientStop[]>([
    { id: 'stop-1', color: '#0f172a', position: 0 },
    { id: 'stop-2', color: '#312e81', position: 100 },
  ]);

  // Resize sub-view state
  const [resizeCategory, setResizeCategory] = useState<'Square' | 'Portrait' | 'Landscape'>(
    orientation
  );
  const [customWidth, setCustomWidth] = useState<number>(canvasWidth);
  const [customHeight, setCustomHeight] = useState<number>(canvasHeight);
  const [lockRatio, setLockRatio] = useState<boolean>(false);

  // Sync dimension inputs when artboard dimensions change externally
  useEffect(() => {
    setCustomWidth(canvasWidth);
    setCustomHeight(canvasHeight);
    setResizeCategory(getOrientationLabel(canvasWidth, canvasHeight));
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(canvasBgColor)) {
      setSolidHex(canvasBgColor);
    }
  }, [canvasBgColor]);

  // Apply live gradient whenever gradient controls change
  const applyGradientState = (
    nextType: 'linear' | 'radial',
    nextAngle: number,
    nextStops: CanvasGradientStop[]
  ) => {
    const grad = buildFabricCanvasGradient(
      nextType,
      nextAngle,
      nextStops,
      canvasWidth,
      canvasHeight
    );
    const fallbackHex = nextStops[0]?.color || '#08080a';
    onChangeCanvasBackground(grad, fallbackHex);
  };

  const applySolidColor = (hex: string) => {
    setSolidHex(hex);
    onChangeCanvasBackground(hex, hex);
  };

  const handleAddGradientStop = () => {
    const palettePool = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];
    const nextColor = palettePool[gradientStops.length % palettePool.length];
    const lastPos = gradientStops[gradientStops.length - 1]?.position ?? 100;
    const prevPos = gradientStops[gradientStops.length - 2]?.position ?? 0;
    const midPos = Math.round((prevPos + lastPos) / 2);

    const newStop: CanvasGradientStop = {
      id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      color: nextColor,
      position: Math.max(0, Math.min(100, midPos)),
    };
    const nextStops = [...gradientStops, newStop];
    setGradientStops(nextStops);
    setColorMode('gradient');
    applyGradientState(gradientType, gradientAngle, nextStops);
  };

  const handleUpdateStop = (
    stopId: string,
    patch: Partial<Pick<CanvasGradientStop, 'color' | 'position'>>
  ) => {
    const nextStops = gradientStops.map((s) => (s.id === stopId ? { ...s, ...patch } : s));
    setGradientStops(nextStops);
    setColorMode('gradient');
    applyGradientState(gradientType, gradientAngle, nextStops);
  };

  const handleRemoveStop = (stopId: string) => {
    if (gradientStops.length <= 2) return;
    const nextStops = gradientStops.filter((s) => s.id !== stopId);
    setGradientStops(nextStops);
    applyGradientState(gradientType, gradientAngle, nextStops);
  };

  const handleCustomWidthChange = (rawVal: number) => {
    const clamped = Math.max(64, Math.min(8000, Math.round(rawVal || 64)));
    if (lockRatio && canvasWidth > 0) {
      const ratio = canvasHeight / canvasWidth;
      setCustomHeight(Math.max(64, Math.min(8000, Math.round(clamped * ratio))));
    }
    setCustomWidth(clamped);
  };

  const handleCustomHeightChange = (rawVal: number) => {
    const clamped = Math.max(64, Math.min(8000, Math.round(rawVal || 64)));
    if (lockRatio && canvasHeight > 0) {
      const ratio = canvasWidth / canvasHeight;
      setCustomWidth(Math.max(64, Math.min(8000, Math.round(clamped * ratio))));
    }
    setCustomHeight(clamped);
  };

  const subViewTitles: Record<Exclude<InspectSubView, null>, string> = {
    color: 'Change Color',
    resize: 'Resize',
    grid: 'Grid',
  };

  const coreCards: {
    id: Exclude<InspectSubView, null>;
    title: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'color',
      title: 'Change Color',
      subtitle: canvasBgImageUrl
        ? 'Image · Cover'
        : colorMode === 'gradient'
        ? `${gradientType === 'linear' ? 'Linear' : 'Radial'} · ${gradientStops.length} stops`
        : `Solid · ${solidHex.toUpperCase()}`,
      icon: Palette,
    },
    {
      id: 'resize',
      title: 'Resize',
      subtitle: `${orientation} · ${canvasWidth} × ${canvasHeight}px`,
      icon: Maximize2,
    },
    {
      id: 'grid',
      title: 'Grid',
      subtitle: gridConfig.visible
        ? `${
            gridConfig.axisMode === 'both'
              ? 'Both Axes'
              : gridConfig.axisMode === 'vertical'
              ? 'Vertical'
              : 'Horizontal'
          } · ${gridConfig.rows}×${gridConfig.columns}`
        : 'Hidden',
      icon: GridIcon,
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">
      {/* Header */}
      {activeSubView === null ? (
        <header className="h-12 px-4 border-b border-white/[0.08] flex items-center justify-between gap-2 shrink-0 bg-white/[0.02] backdrop-blur-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-white tracking-tight truncate">
              {orientation}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-mono tabular-nums text-slate-300 whitespace-nowrap">
              {canvasWidth}x{canvasHeight}px
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
            onClick={() => setActiveSubView(null)}
            aria-label="Back to Page Settings"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Back to Page Settings"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-xs font-semibold text-white tracking-tight text-center truncate px-1">
            {subViewTitles[activeSubView]}
          </h3>
          <button
            type="button"
            onClick={() => (onClose ? onClose() : setActiveSubView(null))}
            aria-label="Close sub-view"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors justify-self-end"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 text-xs text-slate-300">
        {activeSubView === null && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Page settings for this artboard. Select an object on the canvas to edit its properties.
            </p>

            <div className="grid grid-cols-2 gap-2.5" aria-label="Page settings tools">
              {coreCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setActiveSubView(card.id)}
                    className="group aspect-square rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.22] backdrop-blur-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-all duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] group-hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-slate-200 group-hover:text-white shrink-0 transition-colors overflow-hidden">
                      {card.id === 'color' ? (
                        canvasBgImageUrl && canvasBgImageUrl !== 'image' ? (
                          <img
                            src={canvasBgImageUrl}
                            alt="Active background texture"
                            className="w-full h-full object-cover"
                          />
                        ) : canvasBgImageUrl === 'image' ? (
                          <Icon className="w-5 h-5 text-emerald-300" />
                        ) : (
                          <span
                            className="w-5 h-5 rounded-md border border-white/25"
                            style={{
                              background:
                                colorMode === 'gradient'
                                  ? buildCssGradientPreview(
                                      gradientType,
                                      gradientAngle,
                                      gradientStops
                                    )
                                  : solidHex,
                            }}
                          />
                        )
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 w-full">
                      <div className="text-xs font-semibold text-white leading-tight truncate">
                        {card.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-1 font-mono tabular-nums">
                        {card.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB-VIEW 1: CHANGE COLOR (SOLID, PALETTES, LINEAR/RADIAL + IMAGE TEXTURE STATUS) */}
        {activeSubView === 'color' && (
          <div className="space-y-4">
            {canvasBgImageUrl && (
              <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center gap-2.5">
                {canvasBgImageUrl !== 'image' && (
                  <img
                    src={canvasBgImageUrl}
                    alt="Active background image"
                    className="w-10 h-10 rounded-xl object-cover border border-white/15 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-white truncate">
                    Image Background
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">Cover • Edge-to-edge</div>
                </div>
                {onClearCanvasBgImage && (
                  <button
                    type="button"
                    onClick={onClearCanvasBgImage}
                    className="py-1 px-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-[10px] font-medium text-white shrink-0 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
            {/* Solid vs Gradient Mode Tabs */}
            <div
              role="tablist"
              aria-label="Background fill type"
              className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={colorMode === 'solid'}
                onClick={() => {
                  setColorMode('solid');
                  applySolidColor(solidHex);
                }}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-all ${
                  colorMode === 'solid'
                    ? 'bg-white text-[#08080a] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Solid
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={colorMode === 'gradient'}
                onClick={() => {
                  setColorMode('gradient');
                  applyGradientState(gradientType, gradientAngle, gradientStops);
                }}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-all ${
                  colorMode === 'gradient'
                    ? 'bg-white text-[#08080a] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gradient
              </button>
            </div>

            {colorMode === 'solid' ? (
              <div className="space-y-4">
                {/* Custom Solid Picker + Hex Input */}
                <div className="flex items-center gap-2">
                  <label
                    className="w-10 h-10 rounded-xl border border-white/20 cursor-pointer shrink-0 overflow-hidden"
                    style={{ backgroundColor: solidHex }}
                    title="Pick custom color"
                  >
                    <input
                      type="color"
                      value={solidHex}
                      onChange={(e) => applySolidColor(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                  <input
                    type="text"
                    value={solidHex}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSolidHex(val);
                      if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
                        onChangeCanvasBackground(val, val);
                      }
                    }}
                    placeholder="#08080a"
                    aria-label="Solid background hex color"
                    className="flex-1 h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Quick Solid Swatches */}
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-slate-300">Quick Swatches</span>
                  <div className="grid grid-cols-6 gap-2">
                    {SOLID_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => applySolidColor(hex)}
                        aria-label={`Apply solid color ${hex}`}
                        className={`h-8 rounded-xl border transition-transform ${
                          solidHex.toLowerCase() === hex.toLowerCase()
                            ? 'border-white scale-105 shadow-sm'
                            : 'border-white/15 hover:border-white/40'
                        }`}
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                {/* Standard Palettes */}
                <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                  <span className="text-[11px] font-medium text-slate-300">Standard Palettes</span>
                  <div className="space-y-2.5">
                    {STANDARD_PALETTES.map((palette) => (
                      <div
                        key={palette.name}
                        className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2"
                      >
                        <div className="text-[11px] text-slate-300 font-medium">{palette.name}</div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {palette.colors.map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => applySolidColor(hex)}
                              className={`h-6 rounded-lg border transition-transform ${
                                solidHex.toLowerCase() === hex.toLowerCase()
                                  ? 'border-white scale-105'
                                  : 'border-white/15 hover:border-white/40'
                              }`}
                              style={{ backgroundColor: hex }}
                              title={hex}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brand Kit Colors (if available) */}
                {brands.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] font-medium text-slate-300">Brand Palettes</span>
                    <div className="space-y-2">
                      {brands.map((brand) => {
                        const colors = [brand.primaryColor, ...(brand.secondaryColors || [])];
                        return (
                          <div
                            key={brand.id}
                            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2"
                          >
                            <div className="text-[11px] text-slate-300 font-medium">{brand.name}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {colors.map((hex, idx) => (
                                <button
                                  key={`${brand.id}-${idx}`}
                                  type="button"
                                  onClick={() => applySolidColor(hex)}
                                  className="w-7 h-7 rounded-lg border border-white/20 hover:scale-105 transition-transform"
                                  style={{ backgroundColor: hex }}
                                  title={hex}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Live Gradient Preview */}
                <div
                  className="h-14 w-full rounded-2xl border border-white/15 shadow-inner"
                  style={{
                    background: buildCssGradientPreview(
                      gradientType,
                      gradientAngle,
                      gradientStops
                    ),
                  }}
                />

                {/* Linear vs Radial Toggle */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  {(['linear', 'radial'] as const).map((gType) => (
                    <button
                      key={gType}
                      type="button"
                      onClick={() => {
                        setGradientType(gType);
                        applyGradientState(gType, gradientAngle, gradientStops);
                      }}
                      className={`py-1.5 px-3 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                        gradientType === gType
                          ? 'bg-white text-[#08080a] shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {gType}
                    </button>
                  ))}
                </div>

                {/* Linear Angle Slider */}
                {gradientType === 'linear' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Angle</span>
                      <span className="font-mono tabular-nums text-white">{gradientAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={gradientAngle}
                      aria-label="Gradient angle"
                      onChange={(e) => {
                        const angle = Number(e.target.value);
                        setGradientAngle(angle);
                        applyGradientState(gradientType, angle, gradientStops);
                      }}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                )}

                {/* Custom Multi-Stop Gradient Builder (Infinite Stops) */}
                <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">
                      Color Stops ({gradientStops.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddGradientStop}
                      className="py-1 px-2.5 rounded-lg bg-white text-[#08080a] hover:bg-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Stop</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {gradientStops.map((stop, index) => (
                      <div
                        key={stop.id}
                        className="p-2.5 rounded-xl bg-white/[0.035] border border-white/[0.08] space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <label
                            className="w-7 h-7 rounded-lg border border-white/25 cursor-pointer shrink-0 overflow-hidden"
                            style={{ backgroundColor: stop.color }}
                            title={`Stop ${index + 1} color`}
                          >
                            <input
                              type="color"
                              value={stop.color}
                              onChange={(e) => handleUpdateStop(stop.id, { color: e.target.value })}
                              className="sr-only"
                            />
                          </label>
                          <input
                            type="text"
                            value={stop.color}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                setGradientStops((prev) =>
                                  prev.map((s) => (s.id === stop.id ? { ...s, color: val } : s))
                                );
                              }
                              if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
                                handleUpdateStop(stop.id, { color: val });
                              }
                            }}
                            aria-label={`Stop ${index + 1} hex color`}
                            className="flex-1 h-7 px-2 rounded-lg bg-black/40 border border-white/[0.08] text-white font-mono text-[11px] focus:outline-none focus:border-white/25"
                          />
                          <span className="text-[11px] font-mono tabular-nums text-slate-300 w-9 text-right">
                            {stop.position}%
                          </span>
                          <button
                            type="button"
                            disabled={gradientStops.length <= 2}
                            onClick={() => handleRemoveStop(stop.id)}
                            aria-label={`Remove stop ${index + 1}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Remove Stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={stop.position}
                          aria-label={`Stop ${index + 1} position`}
                          onChange={(e) =>
                            handleUpdateStop(stop.id, { position: Number(e.target.value) })
                          }
                          className="w-full accent-white cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gradient Presets */}
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <span className="text-[11px] font-medium text-slate-300">Gradient Presets</span>
                  <div className="grid grid-cols-2 gap-2">
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          const mappedStops = preset.stops.map((st, idx) => ({
                            id: `preset-${Date.now()}-${idx}`,
                            color: st.color,
                            position: st.position,
                          }));
                          setGradientType(preset.type);
                          setGradientAngle(preset.angle);
                          setGradientStops(mappedStops);
                          applyGradientState(preset.type, preset.angle, mappedStops);
                        }}
                        className="p-2 rounded-xl bg-white/[0.035] hover:bg-white/[0.08] border border-white/[0.08] text-left space-y-1.5 transition-all"
                      >
                        <div
                          className="h-7 w-full rounded-lg border border-white/15"
                          style={{
                            background: buildCssGradientPreview(
                              preset.type,
                              preset.angle,
                              preset.stops
                            ),
                          }}
                        />
                        <div className="text-[11px] font-medium text-white truncate">
                          {preset.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUB-VIEW 2: RESIZE (ARTBOARD SCALING) */}
        {activeSubView === 'resize' && (
          <div className="space-y-4">
            {/* Custom Width / Height Pixel Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onResizeCanvas(customWidth, customHeight);
              }}
              className="p-3 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300">Custom Size (px)</span>
                <button
                  type="button"
                  onClick={() => setLockRatio(!lockRatio)}
                  aria-label={lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  className={`py-1 px-2 rounded-lg text-[10px] font-medium flex items-center gap-1 border transition-colors ${
                    lockRatio
                      ? 'bg-white text-[#08080a] border-white'
                      : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                  }`}
                >
                  {lockRatio ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{lockRatio ? 'Ratio Locked' : 'Free Ratio'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-sans">Width (px)</span>
                  <input
                    type="number"
                    min={64}
                    max={8000}
                    value={customWidth}
                    onChange={(e) => handleCustomWidthChange(Number(e.target.value))}
                    className="w-full py-2 px-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white text-xs tabular-nums focus:outline-none focus:border-white/30"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-sans">Height (px)</span>
                  <input
                    type="number"
                    min={64}
                    max={8000}
                    value={customHeight}
                    onChange={(e) => handleCustomHeightChange(Number(e.target.value))}
                    className="w-full py-2 px-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white text-xs tabular-nums focus:outline-none focus:border-white/30"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-white text-[#08080a] hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Canvas Size</span>
              </button>
            </form>

            {/* Quick Preset Categories: Square, Portrait, Landscape */}
            <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] font-medium text-slate-300">Preset Categories</span>

              <div
                role="tablist"
                aria-label="Resize preset categories"
                className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]"
              >
                {(['Square', 'Portrait', 'Landscape'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={resizeCategory === cat}
                    onClick={() => setResizeCategory(cat)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                      resizeCategory === cat
                        ? 'bg-white text-[#08080a] shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                {RESIZE_PRESETS[resizeCategory].map((preset) => {
                  const isActive =
                    canvasWidth === preset.width && canvasHeight === preset.height;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => onResizeCanvas(preset.width, preset.height)}
                      className={`w-full py-2.5 px-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-white text-[#08080a] border-white shadow-sm'
                          : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-medium truncate pr-2">{preset.label}</span>
                      <span
                        className={`text-[11px] font-mono tabular-nums shrink-0 ${
                          isActive ? 'text-slate-700' : 'text-slate-400'
                        }`}
                      >
                        {preset.width}×{preset.height}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUB-VIEW 3: GRID (CUSTOM LAYOUT GRIDS) */}
        {activeSubView === 'grid' && (
          <div className="space-y-4">
            {/* Eye Visibility Toggle + Include in Export */}
            <div className="p-3 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Grid Overlay</div>
                  <div className="text-[11px] text-slate-400">
                    {gridConfig.visible ? 'Visible on canvas' : 'Currently hidden'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChangeGridConfig({ ...gridConfig, visible: !gridConfig.visible })
                  }
                  aria-label={gridConfig.visible ? 'Hide grid overlay' : 'Show grid overlay'}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    gridConfig.visible
                      ? 'bg-white text-[#08080a] border-white'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border-white/[0.1]'
                  }`}
                >
                  {gridConfig.visible ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hidden</span>
                    </>
                  )}
                </button>
              </div>

              <label className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] cursor-pointer">
                <span className="text-[11px] text-slate-200">Include grid in final export</span>
                <input
                  type="checkbox"
                  checked={gridConfig.includeInExport}
                  onChange={(e) =>
                    onChangeGridConfig({ ...gridConfig, includeInExport: e.target.checked })
                  }
                  className="accent-white w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            {/* Axis / Line Visibility Mode: Both (Intersecting Boxes), Vertical Only, Horizontal Only */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300">Grid Lines</span>
                <span className="text-[10px] text-slate-500">Intersecting hairlines</span>
              </div>
              <div
                role="tablist"
                aria-label="Grid line axes"
                className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]"
              >
                {(
                  [
                    { id: 'both', label: 'Both' },
                    { id: 'vertical', label: 'Vertical' },
                    { id: 'horizontal', label: 'Horizontal' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    role="tab"
                    aria-selected={gridConfig.axisMode === mode.id}
                    onClick={() =>
                      onChangeGridConfig({
                        ...gridConfig,
                        axisMode: mode.id,
                        visible: true,
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                      gridConfig.axisMode === mode.id
                        ? 'bg-white text-[#08080a] shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontal Rows & Vertical Columns */}
            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              {[
                {
                  key: 'rows' as const,
                  label: 'Horizontal Rows',
                  val: gridConfig.rows,
                  enabled: gridConfig.axisMode === 'both' || gridConfig.axisMode === 'horizontal',
                },
                {
                  key: 'columns' as const,
                  label: 'Vertical Columns',
                  val: gridConfig.columns,
                  enabled: gridConfig.axisMode === 'both' || gridConfig.axisMode === 'vertical',
                },
              ].map((ctrl) => (
                <div
                  key={ctrl.key}
                  className={`space-y-1.5 transition-opacity ${ctrl.enabled ? 'opacity-100' : 'opacity-45'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300">{ctrl.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onChangeGridConfig({
                            ...gridConfig,
                            visible: true,
                            [ctrl.key]: Math.max(1, ctrl.val - 1),
                          })
                        }
                        aria-label={`Decrease ${ctrl.label}`}
                        className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={32}
                        value={ctrl.val}
                        aria-label={ctrl.label}
                        onChange={(e) =>
                          onChangeGridConfig({
                            ...gridConfig,
                            visible: true,
                            [ctrl.key]: Math.max(1, Math.min(32, Number(e.target.value) || 1)),
                          })
                        }
                        className="w-11 h-6 rounded-lg bg-black/40 border border-white/[0.08] text-center font-mono tabular-nums text-white text-[11px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onChangeGridConfig({
                            ...gridConfig,
                            visible: true,
                            [ctrl.key]: Math.min(32, ctrl.val + 1),
                          })
                        }
                        aria-label={`Increase ${ctrl.label}`}
                        className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={32}
                    value={ctrl.val}
                    onChange={(e) =>
                      onChangeGridConfig({
                        ...gridConfig,
                        visible: true,
                        [ctrl.key]: Number(e.target.value),
                      })
                    }
                    className="w-full accent-white cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Grid Color & Opacity */}
            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Grid Color</span>
                  <span className="font-mono text-white uppercase">{gridConfig.color}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {GRID_COLOR_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onChangeGridConfig({ ...gridConfig, color: hex })}
                      className={`w-7 h-7 rounded-lg border transition-transform ${
                        gridConfig.color.toLowerCase() === hex.toLowerCase()
                          ? 'border-white scale-105'
                          : 'border-white/20 hover:border-white/50'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                  <label
                    className="w-7 h-7 rounded-lg border border-dashed border-white/30 flex items-center justify-center cursor-pointer text-[10px] text-slate-300 hover:text-white"
                    title="Custom grid color"
                  >
                    +
                    <input
                      type="color"
                      value={gridConfig.color}
                      onChange={(e) =>
                        onChangeGridConfig({ ...gridConfig, color: e.target.value })
                      }
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Opacity</span>
                  <span className="font-mono tabular-nums text-white">
                    {Math.round(gridConfig.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={gridConfig.opacity}
                  aria-label="Grid opacity"
                  onChange={(e) =>
                    onChangeGridConfig({
                      ...gridConfig,
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-white cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

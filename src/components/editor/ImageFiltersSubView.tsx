import React, { useState } from 'react';
import {
  ArrowLeft,
  X,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Sun,
  Palette,
  Grid2X2,
  Layers,
} from 'lucide-react';
import {
  FilterSliderState,
  DEFAULT_FILTER_SLIDERS,
  DitherAlgorithm,
} from '../../utils/imageEffectsEngine';

export interface ImageFiltersSubViewProps {
  filters?: FilterSliderState;
  /** @deprecated Alias for `filters` */
  sliders?: FilterSliderState;
  isImage: boolean;
  elementOpacity: number;
  elementStrokeWidth: number;
  onUpdateSliders: (
    patch: Partial<FilterSliderState>,
    options?: { coalesce?: boolean; immediateCommit?: boolean }
  ) => void;
  onResetFilter?: (key: keyof FilterSliderState) => void;
  onCommitCanvasChange?: () => void;
  onResetAllFilters: () => void;
  onChangeElementOpacity?: (opacityPct: number) => void;
  onChangeElementStrokeWidth?: (widthPx: number) => void;
  onResetNonImageFilters?: () => void;
  onBack: () => void;
  onClose?: () => void;
  showHeader?: boolean;
}

interface FilterSliderRowProps {
  id: string;
  label: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  signed?: boolean;
  onChange: (next: number) => void;
  onResetSingle?: () => void;
  onCommit?: () => void;
}

const FilterSliderRow: React.FC<FilterSliderRowProps> = ({
  id,
  label,
  value,
  defaultValue,
  min,
  max,
  step = 1,
  unit = '',
  signed = false,
  onChange,
  onResetSingle,
  onCommit,
}) => {
  const safeVal = Number.isFinite(value) ? value : defaultValue;
  const isModified = safeVal !== defaultValue;
  const formattedValue = `${signed && safeVal > 0 ? '+' : ''}${safeVal}${unit}`;

  const handleResetSingle = () => {
    if (safeVal === defaultValue) return;
    if (onResetSingle) {
      onResetSingle();
    } else {
      onChange(defaultValue);
      onCommit?.();
    }
  };

  return (
    <div
      data-testid={`filter-row-${id}`}
      onDoubleClick={handleResetSingle}
      title="Double-click to reset to default"
      className="group space-y-1.5 select-none rounded-xl px-2 py-1.5 -mx-2 hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center justify-between text-[11px]">
        <span
          className={`transition-colors ${
            isModified ? 'text-white font-medium' : 'text-slate-300'
          }`}
        >
          {label}
        </span>
        <span
          data-testid={`filter-value-${id}`}
          className={`font-mono tabular-nums ${
            isModified ? 'text-white font-semibold' : 'text-slate-400'
          }`}
        >
          {formattedValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeVal}
        aria-label={label}
        data-testid={`filter-slider-${id}`}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleResetSingle();
        }}
        onPointerUp={() => onCommit?.()}
        onKeyUp={() => onCommit?.()}
        className="w-full accent-white cursor-pointer"
      />
    </div>
  );
};

export const ImageFiltersSubView: React.FC<ImageFiltersSubViewProps> = ({
  filters: filtersProp,
  sliders: legacySlidersProp,
  isImage,
  elementOpacity,
  elementStrokeWidth,
  onUpdateSliders,
  onResetFilter,
  onCommitCanvasChange,
  onResetAllFilters,
  onChangeElementOpacity,
  onChangeElementStrokeWidth,
  onResetNonImageFilters,
  onBack,
  onClose,
  showHeader = true,
}) => {
  const filters = filtersProp ?? legacySlidersProp ?? DEFAULT_FILTER_SLIDERS;

  const hasActiveShadow =
    filters.dropShadowBlur > 0 ||
    filters.dropShadowOffsetX !== 0 ||
    filters.dropShadowOffsetY !== 0 ||
    filters.dropShadowColor.toLowerCase() !== '#000000' ||
    filters.dropShadowOpacity !== DEFAULT_FILTER_SLIDERS.dropShadowOpacity;

  const [dropShadowOpen, setDropShadowOpen] = useState<boolean>(hasActiveShadow);

  const hasAnyModified = isImage
    ? filters.brightness !== DEFAULT_FILTER_SLIDERS.brightness ||
      filters.contrast !== DEFAULT_FILTER_SLIDERS.contrast ||
      filters.saturation !== DEFAULT_FILTER_SLIDERS.saturation ||
      filters.exposure !== DEFAULT_FILTER_SLIDERS.exposure ||
      filters.shadows !== DEFAULT_FILTER_SLIDERS.shadows ||
      filters.temperature !== DEFAULT_FILTER_SLIDERS.temperature ||
      filters.hueRotate !== DEFAULT_FILTER_SLIDERS.hueRotate ||
      filters.blur !== DEFAULT_FILTER_SLIDERS.blur ||
      filters.sharpen !== DEFAULT_FILTER_SLIDERS.sharpen ||
      filters.vignette !== DEFAULT_FILTER_SLIDERS.vignette ||
      filters.ditherIntensity !== DEFAULT_FILTER_SLIDERS.ditherIntensity ||
      hasActiveShadow
    : elementOpacity !== 100 || elementStrokeWidth !== 0 || hasActiveShadow;

  const handleSliderChange = (
    key: keyof FilterSliderState,
    val: number
  ) => {
    onUpdateSliders({ [key]: val }, { coalesce: true, immediateCommit: false });
  };

  const handleSliderReset = (key: keyof FilterSliderState) => {
    if (onResetFilter) {
      onResetFilter(key);
    } else {
      onUpdateSliders(
        { [key]: DEFAULT_FILTER_SLIDERS[key] },
        { coalesce: false, immediateCommit: true }
      );
    }
  };

  const handleCommit = () => {
    onCommitCanvasChange?.();
  };

  const handleResetAll = () => {
    if (isImage) {
      onResetAllFilters();
    } else {
      onResetNonImageFilters?.();
    }
  };

  const renderDropShadowSection = () => (
    <section
      aria-label="Drop Shadow settings"
      className="rounded-2xl bg-white/[0.035] border border-white/[0.08] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setDropShadowOpen((prev) => !prev)}
        aria-expanded={dropShadowOpen}
        data-testid="drop-shadow-toggle"
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-[11px] font-semibold text-white">Drop Shadow</span>
          {hasActiveShadow && (
            <span className="text-[10px] font-mono text-slate-400">
              {filters.dropShadowBlur}px
            </span>
          )}
        </div>
        {dropShadowOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
      </button>

      {dropShadowOpen && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.06] space-y-2.5">
          <FilterSliderRow
            id="dropShadowBlur"
            label="Blur Radius"
            value={filters.dropShadowBlur}
            defaultValue={DEFAULT_FILTER_SLIDERS.dropShadowBlur}
            min={0}
            max={60}
            unit="px"
            onChange={(val) => handleSliderChange('dropShadowBlur', val)}
            onResetSingle={() => handleSliderReset('dropShadowBlur')}
            onCommit={handleCommit}
          />
          <FilterSliderRow
            id="dropShadowOffsetX"
            label="Offset X"
            value={filters.dropShadowOffsetX}
            defaultValue={DEFAULT_FILTER_SLIDERS.dropShadowOffsetX}
            min={-50}
            max={50}
            unit="px"
            signed
            onChange={(val) => handleSliderChange('dropShadowOffsetX', val)}
            onResetSingle={() => handleSliderReset('dropShadowOffsetX')}
            onCommit={handleCommit}
          />
          <FilterSliderRow
            id="dropShadowOffsetY"
            label="Offset Y"
            value={filters.dropShadowOffsetY}
            defaultValue={DEFAULT_FILTER_SLIDERS.dropShadowOffsetY}
            min={-50}
            max={50}
            unit="px"
            signed
            onChange={(val) => handleSliderChange('dropShadowOffsetY', val)}
            onResetSingle={() => handleSliderReset('dropShadowOffsetY')}
            onCommit={handleCommit}
          />
          <FilterSliderRow
            id="dropShadowOpacity"
            label="Opacity"
            value={filters.dropShadowOpacity}
            defaultValue={DEFAULT_FILTER_SLIDERS.dropShadowOpacity}
            min={0}
            max={100}
            unit="%"
            onChange={(val) => handleSliderChange('dropShadowOpacity', val)}
            onResetSingle={() => handleSliderReset('dropShadowOpacity')}
            onCommit={handleCommit}
          />

          <div
            onDoubleClick={() => handleSliderReset('dropShadowColor')}
            title="Double-click to reset color"
            className="flex items-center justify-between pt-1 select-none"
          >
            <span className="text-[11px] text-slate-300">Shadow Color</span>
            <label className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.2] transition-colors">
              <input
                type="color"
                aria-label="Shadow Color"
                data-testid="filter-color-dropShadowColor"
                value={filters.dropShadowColor}
                onChange={(e) => {
                  onUpdateSliders(
                    { dropShadowColor: e.target.value },
                    { coalesce: false, immediateCommit: true }
                  );
                }}
                className="w-4 h-4 rounded border-0 bg-transparent p-0 cursor-pointer"
              />
              <span className="text-[11px] font-mono uppercase text-white">
                {filters.dropShadowColor}
              </span>
            </label>
          </div>
        </div>
      )}
    </section>
  );

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
            Filters
          </h3>
          <button
            type="button"
            onClick={() => (onClose ? onClose() : onBack())}
            aria-label="Close Filters"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors justify-self-end"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
      )}

      {/* Pinned Top Quick Reset Bar */}
      <div className="px-4 py-2 border-b border-white/[0.08] bg-white/[0.025] backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
        <span className="text-[10px] text-slate-400 truncate">
          Double-click any slider to reset
        </span>
        <button
          type="button"
          onClick={handleResetAll}
          disabled={!hasAnyModified}
          data-testid="filters-reset-all-top"
          className={`py-1 px-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
            hasAnyModified
              ? 'bg-white/[0.08] hover:bg-white/[0.15] border-white/[0.14] text-white cursor-pointer'
              : 'bg-white/[0.02] border-white/[0.05] text-slate-500 cursor-default'
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset All</span>
        </button>
      </div>

      {/* Scrollable Filter Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
        {!isImage ? (
          <>
            <section className="rounded-2xl bg-white/[0.035] border border-white/[0.08] p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white pb-1 border-b border-white/[0.06]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-300" />
                <span>Appearance</span>
              </div>

              <FilterSliderRow
                id="elementOpacity"
                label="Opacity"
                value={elementOpacity}
                defaultValue={100}
                min={5}
                max={100}
                unit="%"
                onChange={(val) => onChangeElementOpacity?.(val)}
                onCommit={handleCommit}
              />

              <FilterSliderRow
                id="elementStrokeWidth"
                label="Stroke Width"
                value={elementStrokeWidth}
                defaultValue={0}
                min={0}
                max={24}
                unit="px"
                onChange={(val) => onChangeElementStrokeWidth?.(val)}
                onCommit={handleCommit}
              />
            </section>

            {renderDropShadowSection()}
          </>
        ) : (
          <>
            {/* Group 1: Tone & Light */}
            <section className="rounded-2xl bg-white/[0.035] border border-white/[0.08] p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white pb-1.5 border-b border-white/[0.06]">
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <span>Light & Tone</span>
              </div>

              <FilterSliderRow
                id="brightness"
                label="Brightness"
                value={filters.brightness}
                defaultValue={DEFAULT_FILTER_SLIDERS.brightness}
                min={-100}
                max={100}
                signed
                onChange={(val) => handleSliderChange('brightness', val)}
                onResetSingle={() => handleSliderReset('brightness')}
                onCommit={handleCommit}
              />
              <FilterSliderRow
                id="contrast"
                label="Contrast"
                value={filters.contrast}
                defaultValue={DEFAULT_FILTER_SLIDERS.contrast}
                min={-100}
                max={100}
                signed
                onChange={(val) => handleSliderChange('contrast', val)}
                onResetSingle={() => handleSliderReset('contrast')}
                onCommit={handleCommit}
              />
              <FilterSliderRow
                id="exposure"
                label="Exposure / Highlights"
                value={filters.exposure}
                defaultValue={DEFAULT_FILTER_SLIDERS.exposure}
                min={-100}
                max={100}
                signed
                onChange={(val) => handleSliderChange('exposure', val)}
                onResetSingle={() => handleSliderReset('exposure')}
                onCommit={handleCommit}
              />
              <FilterSliderRow
                id="shadows"
                label="Shadows"
                value={filters.shadows}
                defaultValue={DEFAULT_FILTER_SLIDERS.shadows}
                min={-100}
                max={100}
                signed
                onChange={(val) => handleSliderChange('shadows', val)}
                onResetSingle={() => handleSliderReset('shadows')}
                onCommit={handleCommit}
              />
            </section>

            {/* Group 2: Color & Detail */}
            <section className="rounded-2xl bg-white/[0.035] border border-white/[0.08] p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white pb-1.5 border-b border-white/[0.06]">
                <Palette className="w-3.5 h-3.5 text-sky-300" />
                <span>Color & Optics</span>
              </div>

              <FilterSliderRow
                id="saturation"
                label="Saturation"
                value={filters.saturation}
                defaultValue={DEFAULT_FILTER_SLIDERS.saturation}
                min={-100}
                max={100}
                signed
                onChange={(val) => handleSliderChange('saturation', val)}
                onResetSingle={() => handleSliderReset('saturation')}
                onCommit={handleCommit}
              />
              <FilterSliderRow
                id="temperature"
                label="Temperature / Warmth"
                value={filters.temperature}
                defaultValue={DEFAULT_FILTER_SLIDERS.temperature}
                min={-100}
                max={100}
                signed
                onChange={(val) => handleSliderChange('temperature', val)}
                onResetSingle={() => handleSliderReset('temperature')}
                onCommit={handleCommit}
              />
              <FilterSliderRow
                id="hueRotate"
                label="Hue Rotate"
                value={filters.hueRotate}
                defaultValue={DEFAULT_FILTER_SLIDERS.hueRotate}
                min={0}
                max={360}
                unit="°"
                onChange={(val) => handleSliderChange('hueRotate', val)}
                onResetSingle={() => handleSliderReset('hueRotate')}
                onCommit={handleCommit}
              />
              <FilterSliderRow
                id="blur"
                label="Blur"
                value={filters.blur}
                defaultValue={DEFAULT_FILTER_SLIDERS.blur}
                min={0}
                max={40}
                unit="px"
                onChange={(val) => handleSliderChange('blur', val)}
                onResetSingle={() => handleSliderReset('blur')}
                onCommit={handleCommit}
              />
              <FilterSliderRow
                id="sharpen"
                label="Sharpen"
                value={filters.sharpen}
                defaultValue={DEFAULT_FILTER_SLIDERS.sharpen}
                min={0}
                max={100}
                unit="%"
                onChange={(val) => handleSliderChange('sharpen', val)}
                onResetSingle={() => handleSliderReset('sharpen')}
                onCommit={handleCommit}
              />
              <FilterSliderRow
                id="vignette"
                label="Vignette"
                value={filters.vignette}
                defaultValue={DEFAULT_FILTER_SLIDERS.vignette}
                min={0}
                max={100}
                unit="%"
                onChange={(val) => handleSliderChange('vignette', val)}
                onResetSingle={() => handleSliderReset('vignette')}
                onCommit={handleCommit}
              />
            </section>

            {/* Group 3: Drop Shadow (Collapsible 5-Control Group) */}
            {renderDropShadowSection()}

            {/* Group 4: Dither (Pixel Art / Retro Halftone) */}
            <section
              aria-label="Dither settings"
              className="rounded-2xl bg-white/[0.035] border border-white/[0.08] p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-white">
                  <Grid2X2 className="w-3.5 h-3.5 text-fuchsia-300" />
                  <span>Dither</span>
                </div>
                <span className="text-[10px] text-slate-400">Retro Halftone</span>
              </div>

              <div
                role="group"
                aria-label="Dither algorithm"
                className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]"
              >
                {(
                  [
                    { id: 'bayer-4x4', label: 'Bayer 4x4' },
                    { id: 'floyd-steinberg', label: 'Floyd-Steinberg' },
                  ] as { id: DitherAlgorithm; label: string }[]
                ).map((opt) => {
                  const active = filters.ditherMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`dither-mode-${opt.id}`}
                      aria-pressed={active}
                      onClick={() => {
                        onUpdateSliders(
                          { ditherMode: opt.id },
                          { coalesce: false, immediateCommit: true }
                        );
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                        active
                          ? 'bg-white text-[#08080a] shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <FilterSliderRow
                id="ditherIntensity"
                label="Intensity / Threshold"
                value={filters.ditherIntensity}
                defaultValue={DEFAULT_FILTER_SLIDERS.ditherIntensity}
                min={0}
                max={100}
                unit="%"
                onChange={(val) => handleSliderChange('ditherIntensity', val)}
                onResetSingle={() => handleSliderReset('ditherIntensity')}
                onCommit={handleCommit}
              />
            </section>
          </>
        )}

        {/* Bottom Reset All Action */}
        <div className="pt-1 pb-2">
          <button
            type="button"
            onClick={handleResetAll}
            data-testid="filters-reset-all-bottom"
            className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-slate-200 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};

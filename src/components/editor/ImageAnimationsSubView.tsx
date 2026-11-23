import React, { useEffect, useMemo, useState } from 'react';
import * as fabric from 'fabric';
import {
  ArrowLeft,
  X,
  RotateCw,
  Ban,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  Zap,
  FlipHorizontal2,
  FlipVertical2,
  Columns2,
  Wind,
  HeartPulse,
  RefreshCw,
  Waves,
  SunMedium,
  Clock,
  Sliders,
} from 'lucide-react';
import {
  ANIMATION_PRESETS_BY_CATEGORY,
  AnimationCategory,
  AnimationConfig,
  AnimationEasing,
  AnimationPresetDef,
  DEFAULT_ANIMATION_CONFIG,
  EASING_OPTIONS,
  ObjectAnimationSlots,
  PlaybackStatus,
  findAnimationPreset,
  getPrimaryAnimationSlot,
  hasAnyAnimationSlot,
} from '../../utils/animationEngine';

export interface ImageAnimationsSubViewProps {
  selectedObject: fabric.FabricObject | null;
  slots: ObjectAnimationSlots;
  replayKey: number;
  playbackStatus: PlaybackStatus;
  onSelectPreset: (preset: AnimationPresetDef) => void;
  onUpdateTiming: (
    category: AnimationCategory,
    patch: Partial<Pick<AnimationConfig, 'duration' | 'delay' | 'easing'>>
  ) => void;
  onReplay: (category?: AnimationCategory) => void;
  onClearSlot: (category: AnimationCategory) => void;
  onClearAll: () => void;
  onBack: () => void;
  onClose?: () => void;
  showHeader?: boolean;
}

const CATEGORY_TABS: {
  id: AnimationCategory;
  label: string;
}[] = [
  { id: 'in', label: 'In' },
  { id: 'out', label: 'Out' },
  { id: 'passive', label: 'Passive' },
];

const CATEGORY_LABEL_MAP: Record<AnimationCategory, string> = {
  in: 'In',
  out: 'Out',
  passive: 'Passive',
};

const PRESET_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  'pop-in': Sparkles,
  'fade-in': SunMedium,
  'slide-in-left': ArrowRight,
  'slide-in-right': ArrowLeftIcon,
  'slide-in-up': ArrowUp,
  'slide-in-down': ArrowDown,
  'zoom-in': Maximize2,
  'bounce-in': Zap,
  'flip-in-x': FlipVertical2,
  'flip-in-y': FlipHorizontal2,
  'wipe-reveal': Columns2,
  'fade-out': SunMedium,
  'slide-out-left': ArrowLeftIcon,
  'slide-out-right': ArrowRight,
  'slide-out-up': ArrowUp,
  'slide-out-down': ArrowDown,
  'zoom-out': Maximize2,
  'shrink-out': Minimize2,
  'flip-out-x': FlipVertical2,
  'flip-out-y': FlipHorizontal2,
  'wipe-hide': Columns2,
  float: Wind,
  pulse: HeartPulse,
  spin: RefreshCw,
  wobble: Waves,
  drift: ArrowRight,
  heartbeat: HeartPulse,
  'shimmer-glow': Sparkles,
  swing: Clock,
};

const STATUS_LABEL_MAP: Record<PlaybackStatus, string> = {
  idle: 'Ready',
  delay: 'Delay…',
  playing: 'Playing',
  'completed-hidden': 'Exited (Hidden)',
  looping: 'Looping',
};

export const ImageAnimationsSubView: React.FC<ImageAnimationsSubViewProps> = ({
  selectedObject,
  slots,
  replayKey,
  playbackStatus,
  onSelectPreset,
  onUpdateTiming,
  onReplay,
  onClearSlot,
  onClearAll,
  onBack,
  onClose,
  showHeader = true,
}) => {
  const [activeTab, setActiveTab] = useState<AnimationCategory>(() => {
    if (slots.in) return 'in';
    if (slots.out) return 'out';
    if (slots.passive) return 'passive';
    return 'in';
  });

  // Only reset initial tab when the selected canvas object itself changes
  useEffect(() => {
    if (slots.in) setActiveTab('in');
    else if (slots.out) setActiveTab('out');
    else if (slots.passive) setActiveTab('passive');
    else setActiveTab('in');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObject]);

  const anyAssigned = hasAnyAnimationSlot(slots);
  const currentTabConfig = slots[activeTab];
  const stageConfig = currentTabConfig || getPrimaryAnimationSlot(slots);

  const currentTabPreset = useMemo(
    () => (currentTabConfig ? findAnimationPreset(currentTabConfig.id) : null),
    [currentTabConfig]
  );

  const stagePreset = useMemo(
    () => (stageConfig ? findAnimationPreset(stageConfig.id) : null),
    [stageConfig]
  );

  const previewImgSrc = useMemo(() => {
    if (!selectedObject) return null;
    if (
      selectedObject instanceof fabric.FabricImage ||
      selectedObject.type === 'image'
    ) {
      try {
        const imgObj = selectedObject as fabric.FabricImage;
        return typeof imgObj.getSrc === 'function' ? imgObj.getSrc() : null;
      } catch {
        return null;
      }
    }
    return null;
  }, [selectedObject]);

  // Isolate Invert/Transform axis flips on outer wrapper so keyframes never collide
  const isFlippedX = !!selectedObject?.flipX || (selectedObject?.scaleX ?? 1) < 0;
  const isFlippedY = !!selectedObject?.flipY || (selectedObject?.scaleY ?? 1) < 0;

  const effectiveDuration =
    currentTabConfig?.duration ?? DEFAULT_ANIMATION_CONFIG.duration;
  const effectiveDelay =
    currentTabConfig?.delay ?? DEFAULT_ANIMATION_CONFIG.delay;
  const effectiveEasing: AnimationEasing =
    currentTabConfig?.easing ?? DEFAULT_ANIMATION_CONFIG.easing;

  const previewAnimationStyle: React.CSSProperties = stagePreset && stageConfig
    ? {
        animationName: stagePreset.cssKeyframe,
        animationDuration: `${stageConfig.duration}s`,
        animationDelay: `${stageConfig.delay}s`,
        animationTimingFunction: stageConfig.easing,
        animationIterationCount: stagePreset.category === 'passive' ? 'infinite' : 1,
        animationFillMode: 'forwards',
      }
    : {};

  const presets = ANIMATION_PRESETS_BY_CATEGORY[activeTab];
  const activeTabLabel = CATEGORY_LABEL_MAP[activeTab];

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
            Animation
          </h3>
          <button
            type="button"
            onClick={() => (onClose ? onClose() : onBack())}
            aria-label="Close Animation"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors justify-self-end"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
      )}

      {/* Pinned Replay, Single-Slot Clear, & Clear All Action Bar */}
      <div className="px-4 py-2 border-b border-white/[0.08] bg-white/[0.025] backdrop-blur-xl flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onReplay(activeTab)}
          disabled={!anyAssigned}
          data-testid="animation-replay-btn"
          className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
            anyAssigned
              ? 'bg-white text-[#08080a] border-white hover:bg-slate-200 cursor-pointer shadow-sm'
              : 'bg-white/[0.03] border-white/[0.06] text-slate-500 cursor-not-allowed'
          }`}
          title={`Replay ${currentTabPreset ? activeTabLabel : 'active'} animation`}
        >
          <RotateCw className="w-3 h-3" />
          <span>Replay</span>
        </button>

        <button
          type="button"
          onClick={() => onClearSlot(activeTab)}
          disabled={!currentTabPreset}
          data-testid="animation-clear-slot-btn"
          className={`py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
            currentTabPreset
              ? 'bg-white/[0.08] hover:bg-rose-500/20 border-white/[0.14] hover:border-rose-400/40 text-slate-200 hover:text-rose-100 cursor-pointer'
              : 'bg-white/[0.02] border-white/[0.05] text-slate-500 cursor-default'
          }`}
          title={`Clear only the ${activeTabLabel} animation`}
        >
          <Ban className="w-3 h-3" />
          <span>Clear {activeTabLabel}</span>
        </button>

        {anyAssigned && (
          <button
            type="button"
            onClick={onClearAll}
            data-testid="animation-clear-all-btn"
            className="py-1.5 px-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.12] text-[10px] font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap"
            title="Clear all animations (In, Out, Passive)"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
        {/* Live CSS @keyframes Stage Preview (transform-isolated from Invert/Transform) */}
        <div
          data-testid="animation-preview-stage"
          className="rounded-2xl bg-black/40 border border-white/[0.08] p-3 flex flex-col gap-2 overflow-hidden"
        >
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-slate-300 truncate">
              {stagePreset ? stagePreset.label : 'No Animation'}
            </span>
            <span
              data-testid="animation-status-badge"
              className="font-mono text-slate-400"
            >
              {stagePreset ? STATUS_LABEL_MAP[playbackStatus] : 'Static'}
            </span>
          </div>

          <div className="h-20 rounded-xl canvas-checkerboard border border-white/[0.05] flex items-center justify-center overflow-hidden relative">
            {/* Outer Wrapper preserves Invert/Transform flips cleanly */}
            <div
              style={{
                transform: `scale(${isFlippedX ? -1 : 1}, ${isFlippedY ? -1 : 1})`,
              }}
              className="flex items-center justify-center"
            >
              {/* Inner Keyframe Actor resets cleanly via key on every Replay / Preset click */}
              <div
                key={`${stagePreset?.id ?? 'none'}-${replayKey}`}
                data-testid="animation-preview-actor"
                style={previewAnimationStyle}
                className="w-14 h-11 rounded-lg overflow-hidden border border-white/20 bg-gradient-to-br from-sky-500/40 via-indigo-500/30 to-fuchsia-500/40 flex items-center justify-center shadow-md"
              >
                {previewImgSrc ? (
                  <img
                    src={previewImgSrc}
                    alt="Animated asset preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Sparkles className="w-4 h-4 text-white/90" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Slots Summary with Direct Per-Slot Single Clear Controls */}
        {anyAssigned && (
          <div
            data-testid="animation-assigned-slots"
            aria-label="Assigned animation slots"
            className="grid grid-cols-3 gap-1.5"
          >
            {CATEGORY_TABS.map((tab) => {
              const slotCfg = slots[tab.id];
              const slotPreset = slotCfg ? findAnimationPreset(slotCfg.id) : null;
              const isCurrent = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  className={`rounded-xl border px-2 py-1.5 flex items-center justify-between gap-1 transition-colors ${
                    slotPreset
                      ? isCurrent
                        ? 'bg-white/[0.1] border-white/25 text-white'
                        : 'bg-white/[0.045] border-white/[0.1] text-slate-200'
                      : 'bg-white/[0.02] border-white/[0.05] text-slate-500'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="min-w-0 flex-1 text-left"
                    title={
                      slotPreset
                        ? `${tab.label}: ${slotPreset.label}`
                        : `No ${tab.label} animation`
                    }
                  >
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                      {tab.label}
                    </div>
                    <div className="text-[10px] font-medium truncate">
                      {slotPreset ? slotPreset.label : 'None'}
                    </div>
                  </button>
                  {slotPreset && (
                    <button
                      type="button"
                      data-testid={`clear-slot-${tab.id}`}
                      aria-label={`Clear ${tab.label} animation`}
                      title={`Clear ${tab.label} animation`}
                      onClick={() => onClearSlot(tab.id)}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500/30 transition-colors shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Category Tabs: In / Out / Passive */}
        <div
          role="tablist"
          aria-label="Animation categories"
          className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]"
        >
          {CATEGORY_TABS.map((tab) => {
            const isTabActive = activeTab === tab.id;
            const hasAssignedInTab = Boolean(slots[tab.id]);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isTabActive}
                data-testid={`anim-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  isTabActive
                    ? 'bg-white text-[#08080a] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {hasAssignedInTab && (
                  <span
                    aria-hidden="true"
                    className={`w-1.5 h-1.5 rounded-full ${
                      isTabActive ? 'bg-indigo-600' : 'bg-sky-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Category Guidance Subtitle */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
          <span className="flex items-center gap-1">
            {activeTab === 'in' && (
              <>
                <ArrowDownToLine className="w-3 h-3 text-emerald-300" />
                <span>Entry motion • Plays once (forwards)</span>
              </>
            )}
            {activeTab === 'out' && (
              <>
                <ArrowUpFromLine className="w-3 h-3 text-rose-300" />
                <span>Exit motion • Hides on completion</span>
              </>
            )}
            {activeTab === 'passive' && (
              <>
                <RefreshCw className="w-3 h-3 text-sky-300" />
                <span>Ambient loop • Infinite cycle</span>
              </>
            )}
          </span>
          <span className="font-mono text-slate-500">{presets.length}</span>
        </div>

        {/* Preset Cards Grid */}
        <div
          role="listbox"
          aria-label={`${activeTab} animation presets`}
          className="grid grid-cols-2 gap-2"
        >
          {presets.map((preset) => {
            const isSelected = currentTabPreset?.id === preset.id;
            const Icon = PRESET_ICON_MAP[preset.id] || Sparkles;
            return (
              <button
                key={preset.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-testid={`anim-preset-${preset.id}`}
                onClick={() => onSelectPreset(preset)}
                className={`group p-2.5 rounded-xl text-left border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-white text-[#08080a] border-white shadow-sm'
                    : 'bg-white/[0.035] hover:bg-white/[0.08] text-slate-200 border-white/[0.08] hover:border-white/[0.2]'
                }`}
                title={preset.description}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#08080a]/10 text-[#08080a]'
                      : 'bg-white/[0.06] text-slate-300 group-hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-semibold leading-tight truncate">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Timing & Easing Controls for Active Tab Slot */}
        <section
          aria-label="Animation timing controls"
          className="rounded-2xl bg-white/[0.035] border border-white/[0.08] p-3.5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-white pb-1.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-sky-300" />
              <span>{activeTabLabel} Timing</span>
            </div>
            {currentTabPreset && (
              <button
                type="button"
                onClick={() => onClearSlot(activeTab)}
                data-testid="anim-timing-clear-slot-btn"
                className="text-[10px] font-medium text-slate-400 hover:text-rose-300 transition-colors"
              >
                Remove {activeTabLabel}
              </button>
            )}
          </div>

          {/* Duration Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Duration</span>
              <span
                data-testid="anim-duration-value"
                className="font-mono tabular-nums text-white font-semibold"
              >
                {effectiveDuration.toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.1}
              value={effectiveDuration}
              disabled={!currentTabPreset}
              aria-label="Duration"
              data-testid="anim-duration-slider"
              onChange={(e) => onUpdateTiming(activeTab, { duration: Number(e.target.value) })}
              className="w-full accent-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          {/* Delay Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Delay</span>
              <span
                data-testid="anim-delay-value"
                className="font-mono tabular-nums text-white font-semibold"
              >
                {effectiveDelay.toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={0.0}
              max={2.0}
              step={0.1}
              value={effectiveDelay}
              disabled={!currentTabPreset}
              aria-label="Delay"
              data-testid="anim-delay-slider"
              onChange={(e) => onUpdateTiming(activeTab, { delay: Number(e.target.value) })}
              className="w-full accent-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          {/* Easing Selector */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Easing</span>
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                {effectiveEasing === 'cubic-bezier(0.22, 1, 0.36, 1)'
                  ? 'cubic-bezier(0.22…)'
                  : effectiveEasing}
              </span>
            </div>
            <div
              role="group"
              aria-label="Animation easing"
              className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]"
            >
              {EASING_OPTIONS.map((opt) => {
                const active = effectiveEasing === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!currentTabPreset}
                    data-testid={`anim-easing-${opt.shortLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    aria-pressed={active}
                    onClick={() => onUpdateTiming(activeTab, { easing: opt.value })}
                    title={opt.label}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      active
                        ? 'bg-white text-[#08080a] shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

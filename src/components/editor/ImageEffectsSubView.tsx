import React from 'react';
import {
  ArrowLeft,
  X,
  RotateCcw,
  Sparkles,
  Contrast,
  Sun,
  Moon,
  Flame,
  Zap,
  Film,
  Camera,
  Palette,
  CloudSun,
  CircleDot,
  SlidersHorizontal,
  Layers,
  Eye,
  Aperture,
  Wand2,
  Droplets,
} from 'lucide-react';
import {
  normalizeEffectId,
  buildEffectFiltersForImage,
  ScribeCompositeEffectFilter,
} from '../../utils/imageEffectsEngine';

export {
  normalizeEffectId,
  buildEffectFiltersForImage,
  ScribeCompositeEffectFilter,
};

export interface ImageEffectPreset {
  id: string;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  previewCss: string;
  swatchGradient: string;
}

export const IMAGE_EFFECT_PRESETS: ImageEffectPreset[] = [
  {
    id: 'grayscale',
    label: 'Grayscale / B&W',
    description: 'Deep panchromatic darkroom contrast',
    icon: Contrast,
    previewCss: 'grayscale(100%) contrast(132%)',
    swatchGradient: 'from-zinc-100 via-zinc-500 to-zinc-950',
  },
  {
    id: 'sepia',
    label: 'Sepia',
    description: 'Rich espresso shadows & parchment highs',
    icon: Sun,
    previewCss: 'sepia(100%) contrast(118%) brightness(96%)',
    swatchGradient: 'from-amber-200 via-amber-800 to-stone-950',
  },
  {
    id: 'color-punch',
    label: 'Color Punch',
    description: 'High-impact vibrance, clarity & S-curve pop',
    icon: Flame,
    previewCss: 'saturate(200%) contrast(128%)',
    swatchGradient: 'from-rose-500 via-amber-400 to-cyan-400',
  },
  {
    id: 'vintage-film',
    label: 'Vintage Film',
    description: 'Lifted matte blacks, warm cast & fine grain',
    icon: Film,
    previewCss: 'sepia(48%) contrast(94%) saturate(78%) brightness(104%)',
    swatchGradient: 'from-amber-300 via-stone-500 to-stone-900',
  },
  {
    id: 'cool-noir',
    label: 'Cool Noir',
    description: 'Steel-blue shadows, icy highlights & vignette',
    icon: Moon,
    previewCss: 'grayscale(65%) contrast(142%) hue-rotate(190deg) brightness(90%)',
    swatchGradient: 'from-sky-300 via-slate-700 to-slate-950',
  },
  {
    id: 'high-contrast',
    label: 'High Contrast',
    description: 'Ink-deep blacks, crisp clarity & gleam',
    icon: SlidersHorizontal,
    previewCss: 'contrast(180%) saturate(112%)',
    swatchGradient: 'from-white via-zinc-700 to-black',
  },
  {
    id: 'teal-orange',
    label: 'Cinematic Teal & Orange',
    description: '3-zone teal shadows & warm amber highlights',
    icon: Aperture,
    previewCss: 'contrast(132%) saturate(155%) sepia(24%) hue-rotate(-14deg)',
    swatchGradient: 'from-orange-500 via-amber-400 to-teal-600',
  },
  {
    id: 'warm-sunset',
    label: 'Warm Sunset',
    description: 'Golden hour amber glow & plum shadows',
    icon: CloudSun,
    previewCss: 'sepia(38%) saturate(165%) contrast(115%) brightness(104%)',
    swatchGradient: 'from-amber-300 via-orange-500 to-rose-700',
  },
  {
    id: 'cyberpunk-neon',
    label: 'Cyberpunk Neon',
    description: 'Electric magenta shadows & neon cyan highs',
    icon: Zap,
    previewCss: 'hue-rotate(65deg) saturate(210%) contrast(138%)',
    swatchGradient: 'from-fuchsia-500 via-purple-700 to-cyan-400',
  },
  {
    id: 'lofi-grain',
    label: 'Lofi Grain',
    description: 'Dusty matte tones, heavy analog grain & fade',
    icon: Sparkles,
    previewCss: 'contrast(88%) saturate(72%) sepia(18%)',
    swatchGradient: 'from-stone-400 via-zinc-600 to-neutral-950',
  },
  {
    id: 'vignette',
    label: 'Vignette',
    description: 'Studio radial shadow falloff & center pop',
    icon: CircleDot,
    previewCss: 'brightness(86%) contrast(124%)',
    swatchGradient: 'from-slate-200 via-zinc-700 to-black',
  },
  {
    id: 'invert-colors',
    label: 'Invert Colors',
    description: 'Crisp high-contrast negative inversion',
    icon: Eye,
    previewCss: 'invert(100%) contrast(115%)',
    swatchGradient: 'from-cyan-300 via-indigo-700 to-amber-300',
  },
  {
    id: 'duotone',
    label: 'Duotone',
    description: '3-stop indigo-to-sky luminance gradient map',
    icon: Layers,
    previewCss: 'grayscale(100%) contrast(145%) hue-rotate(225deg) saturate(180%)',
    swatchGradient: 'from-indigo-950 via-violet-500 to-sky-300',
  },
  {
    id: 'pastel-dream',
    label: 'Pastel Dream',
    description: 'Airy gamma lift & soft rose-lavender wash',
    icon: Droplets,
    previewCss: 'saturate(75%) brightness(118%) contrast(90%)',
    swatchGradient: 'from-pink-200 via-violet-200 to-sky-200',
  },
  {
    id: 'retro-polaroid',
    label: 'Retro Polaroid',
    description: 'Emerald-cyan shadows & creamy warm highs',
    icon: Camera,
    previewCss: 'contrast(112%) sepia(32%) saturate(126%) brightness(104%)',
    swatchGradient: 'from-yellow-200 via-amber-400 to-teal-900',
  },
  {
    id: 'matte-fade',
    label: 'Matte Fade',
    description: 'Charcoal lifted blacks & cool slate cast',
    icon: Palette,
    previewCss: 'contrast(80%) brightness(106%) saturate(80%)',
    swatchGradient: 'from-slate-400 via-slate-600 to-zinc-800',
  },
  {
    id: 'dramatic-hdr',
    label: 'Dramatic HDR',
    description: 'High-pass micro-clarity, shadow lift & pop',
    icon: Wand2,
    previewCss: 'contrast(162%) saturate(152%) brightness(100%)',
    swatchGradient: 'from-emerald-400 via-blue-600 to-slate-950',
  },
];

export interface ImageEffectsSubViewProps {
  activeEffectId: string;
  intensity: number; // 0 to 100
  isImage?: boolean;
  onSelectEffect: (effectId: string, nextIntensity: number) => void;
  onChangeIntensity: (nextIntensity: number) => void;
  onCommitIntensity?: () => void;
  onResetEffect: () => void;
  onBack: () => void;
  onClose?: () => void;
  showHeader?: boolean;
  title?: string;
}

export const ImageEffectsSubView: React.FC<ImageEffectsSubViewProps> = ({
  activeEffectId,
  intensity,
  isImage = true,
  onSelectEffect,
  onChangeIntensity,
  onCommitIntensity,
  onResetEffect,
  onBack,
  onClose,
  showHeader = true,
  title,
}) => {
  const normalizedId = normalizeEffectId(activeEffectId);
  const selectedPreset = IMAGE_EFFECT_PRESETS.find((p) => p.id === normalizedId);
  const resolvedTitle = title || (isImage ? 'Image Effects' : 'Effects');

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">
      {showHeader && (
        <header className="h-12 px-2.5 border-b border-white/[0.08] grid grid-cols-[36px_1fr_36px] items-center shrink-0 bg-white/[0.02] backdrop-blur-2xl">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Edit"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-xs font-semibold text-white tracking-tight text-center truncate px-1">
            {resolvedTitle}
          </h3>
          <button
            type="button"
            onClick={() => {
              onClose ? onClose() : onBack();
            }}
            aria-label="Close Image Effects"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors justify-self-end"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
      )}

      {/* Pinned Intensity Interpolator (0% Original -> 100% Full Composite Effect) */}
      {normalizedId !== 'none' && selectedPreset && (
        <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-xl space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-white truncate">
                {selectedPreset.label}
              </div>
              <div className="text-[10px] text-slate-400">
                Intensity ({intensity === 0 ? 'Original' : intensity === 100 ? 'Full Effect' : 'Blended'})
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono tabular-nums text-white font-semibold">
                {intensity}%
              </span>
              <button
                type="button"
                onClick={onResetEffect}
                aria-label="Reset active effect"
                className="py-1 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-[10px] font-medium text-slate-200 hover:text-white flex items-center gap-1 transition-colors"
                title="Reset effect to Original"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={intensity}
            aria-label="Effect Intensity"
            onChange={(e) => onChangeIntensity(Number(e.target.value))}
            onPointerUp={() => onCommitIntensity?.()}
            onKeyUp={() => onCommitIntensity?.()}
            className="w-full accent-white cursor-pointer"
          />
        </div>
      )}

      {/* Scrollable Effects List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-300">
            {isImage ? `Curated Effects (${IMAGE_EFFECT_PRESETS.length})` : 'Element Style Effects'}
          </span>
          {normalizedId !== 'none' && (
            <button
              type="button"
              onClick={onResetEffect}
              className="text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              Original
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2" aria-label="Image effects list">
          {IMAGE_EFFECT_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = normalizedId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  const nextIntensity = isSelected ? intensity : intensity > 0 ? intensity : 100;
                  onSelectEffect(preset.id, nextIntensity);
                }}
                aria-pressed={isSelected}
                className={`group w-full p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all duration-150 ${
                  isSelected
                    ? 'bg-white text-[#08080a] border-white shadow-sm'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/[0.08] hover:border-white/[0.2]'
                }`}
              >
                {/* Live Filtered Mini Preview Tile + Subtle Icon */}
                <div
                  className={`relative w-11 h-11 rounded-xl shrink-0 overflow-hidden border flex items-center justify-center ${
                    isSelected ? 'border-black/15' : 'border-white/15'
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${preset.swatchGradient}`}
                    style={{ filter: preset.previewCss }}
                  />
                  <div className="relative z-10 w-6 h-6 rounded-lg bg-black/45 backdrop-blur-md flex items-center justify-center text-white">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate leading-tight">
                    {preset.label}
                  </div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isSelected ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {preset.description}
                  </div>
                </div>

                {isSelected && (
                  <span className="text-[10px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded-md bg-black/10 text-[#08080a] shrink-0">
                    {intensity}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};


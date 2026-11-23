import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

export type AnimationCategory = 'in' | 'out' | 'passive';

export type AnimationEasing =
  | 'ease'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier(0.22, 1, 0.36, 1)';

export interface AnimationPresetDef {
  id: string;
  label: string;
  category: AnimationCategory;
  description: string;
  cssKeyframe: string;
}

export interface AnimationConfig {
  id: string;
  category: AnimationCategory;
  duration: number; // 0.2 to 3.0 seconds
  delay: number; // 0.0 to 2.0 seconds
  easing: AnimationEasing;
}

export interface ObjectAnimationSlots {
  in: AnimationConfig | null;
  out: AnimationConfig | null;
  passive: AnimationConfig | null;
}

export const EMPTY_ANIMATION_SLOTS: ObjectAnimationSlots = {
  in: null,
  out: null,
  passive: null,
};

export interface EvaluatedAnimationFrame {
  opacity: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  angleDeg: number;
  skewX: number;
  clipRightPct: number;
  glowBlur: number;
  glowAlpha: number;
  pivotTop: boolean;
}

export const EASING_OPTIONS: {
  value: AnimationEasing;
  label: string;
  shortLabel: string;
}[] = [
  { value: 'ease', label: 'Ease', shortLabel: 'Ease' },
  { value: 'ease-out', label: 'Ease Out', shortLabel: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out', shortLabel: 'In-Out' },
  {
    value: 'cubic-bezier(0.22, 1, 0.36, 1)',
    label: 'cubic-bezier(0.22, 1, 0.36, 1)',
    shortLabel: 'Expo Out',
  },
];

export const DEFAULT_ANIMATION_CONFIG: Omit<AnimationConfig, 'id' | 'category'> = {
  duration: 0.8,
  delay: 0,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

export const ANIMATION_PRESETS: AnimationPresetDef[] = [
  // IN (Entry — genuinely starts hidden/off-axis/scaled-down and animates cleanly into place)
  {
    id: 'pop-in',
    label: 'Pop In',
    category: 'in',
    description: 'Snappy scale pop with overshoot',
    cssKeyframe: 'scribeAnimPopIn',
  },
  {
    id: 'fade-in',
    label: 'Fade In',
    category: 'in',
    description: 'Smooth opacity 0 to 1',
    cssKeyframe: 'scribeAnimFadeIn',
  },
  {
    id: 'slide-in-left',
    label: 'Slide In Left',
    category: 'in',
    description: 'Enters from left + fade',
    cssKeyframe: 'scribeAnimSlideInLeft',
  },
  {
    id: 'slide-in-right',
    label: 'Slide In Right',
    category: 'in',
    description: 'Enters from right + fade',
    cssKeyframe: 'scribeAnimSlideInRight',
  },
  {
    id: 'slide-in-up',
    label: 'Slide In Up',
    category: 'in',
    description: 'Enters from bottom + fade',
    cssKeyframe: 'scribeAnimSlideInUp',
  },
  {
    id: 'slide-in-down',
    label: 'Slide In Down',
    category: 'in',
    description: 'Enters from top + fade',
    cssKeyframe: 'scribeAnimSlideInDown',
  },
  {
    id: 'zoom-in',
    label: 'Zoom In',
    category: 'in',
    description: 'Smooth depth scale up',
    cssKeyframe: 'scribeAnimZoomIn',
  },
  {
    id: 'bounce-in',
    label: 'Bounce In',
    category: 'in',
    description: 'Elastic bounce landing',
    cssKeyframe: 'scribeAnimBounceIn',
  },
  {
    id: 'flip-in-x',
    label: 'Flip In X',
    category: 'in',
    description: '3D horizontal axis flip',
    cssKeyframe: 'scribeAnimFlipInX',
  },
  {
    id: 'flip-in-y',
    label: 'Flip In Y',
    category: 'in',
    description: '3D vertical axis flip',
    cssKeyframe: 'scribeAnimFlipInY',
  },
  {
    id: 'wipe-reveal',
    label: 'Wipe / Reveal',
    category: 'in',
    description: 'Smooth clip-path reveal',
    cssKeyframe: 'scribeAnimWipeReveal',
  },

  // OUT (Exit — animates out and genuinely disappears from view on completion)
  {
    id: 'fade-out',
    label: 'Fade Out',
    category: 'out',
    description: 'Fades out to invisible',
    cssKeyframe: 'scribeAnimFadeOut',
  },
  {
    id: 'slide-out-left',
    label: 'Slide Out Left',
    category: 'out',
    description: 'Exits left + disappears',
    cssKeyframe: 'scribeAnimSlideOutLeft',
  },
  {
    id: 'slide-out-right',
    label: 'Slide Out Right',
    category: 'out',
    description: 'Exits right + disappears',
    cssKeyframe: 'scribeAnimSlideOutRight',
  },
  {
    id: 'slide-out-up',
    label: 'Slide Out Up',
    category: 'out',
    description: 'Exits upward + disappears',
    cssKeyframe: 'scribeAnimSlideOutUp',
  },
  {
    id: 'slide-out-down',
    label: 'Slide Out Down',
    category: 'out',
    description: 'Exits downward + disappears',
    cssKeyframe: 'scribeAnimSlideOutDown',
  },
  {
    id: 'zoom-out',
    label: 'Zoom Out',
    category: 'out',
    description: 'Expands past view + fades',
    cssKeyframe: 'scribeAnimZoomOut',
  },
  {
    id: 'shrink-out',
    label: 'Shrink Out',
    category: 'out',
    description: 'Collapses to scale(0)',
    cssKeyframe: 'scribeAnimShrinkOut',
  },
  {
    id: 'flip-out-x',
    label: 'Flip Out X',
    category: 'out',
    description: '3D flip exit on X',
    cssKeyframe: 'scribeAnimFlipOutX',
  },
  {
    id: 'flip-out-y',
    label: 'Flip Out Y',
    category: 'out',
    description: '3D flip exit on Y',
    cssKeyframe: 'scribeAnimFlipOutY',
  },
  {
    id: 'wipe-hide',
    label: 'Wipe / Hide',
    category: 'out',
    description: 'Clean clip-path collapse',
    cssKeyframe: 'scribeAnimWipeHide',
  },

  // PASSIVE (Continuous looping motion while active)
  {
    id: 'float',
    label: 'Float',
    category: 'passive',
    description: 'Gentle vertical hover',
    cssKeyframe: 'scribeAnimFloat',
  },
  {
    id: 'pulse',
    label: 'Pulse',
    category: 'passive',
    description: 'Rhythmic scale breath',
    cssKeyframe: 'scribeAnimPulse',
  },
  {
    id: 'spin',
    label: 'Spin',
    category: 'passive',
    description: 'Continuous smooth rotation',
    cssKeyframe: 'scribeAnimSpin',
  },
  {
    id: 'wobble',
    label: 'Wobble',
    category: 'passive',
    description: 'Playful tilt & sway',
    cssKeyframe: 'scribeAnimWobble',
  },
  {
    id: 'drift',
    label: 'Drift',
    category: 'passive',
    description: 'Slow diagonal glide',
    cssKeyframe: 'scribeAnimDrift',
  },
  {
    id: 'heartbeat',
    label: 'Heartbeat',
    category: 'passive',
    description: 'Double-beat pulse rhythm',
    cssKeyframe: 'scribeAnimHeartbeat',
  },
  {
    id: 'shimmer-glow',
    label: 'Shimmer / Glow',
    category: 'passive',
    description: 'Smooth brightness glow',
    cssKeyframe: 'scribeAnimShimmerGlow',
  },
  {
    id: 'swing',
    label: 'Swing',
    category: 'passive',
    description: 'Pendulum tilt from top',
    cssKeyframe: 'scribeAnimSwing',
  },
];

export const ANIMATION_PRESETS_BY_CATEGORY: Record<AnimationCategory, AnimationPresetDef[]> = {
  in: ANIMATION_PRESETS.filter((p) => p.category === 'in'),
  out: ANIMATION_PRESETS.filter((p) => p.category === 'out'),
  passive: ANIMATION_PRESETS.filter((p) => p.category === 'passive'),
};

export function findAnimationPreset(idOrLabel?: string | null): AnimationPresetDef | null {
  if (!idOrLabel || typeof idOrLabel !== 'string') return null;
  const norm = idOrLabel.trim().toLowerCase();
  return (
    ANIMATION_PRESETS.find((p) => p.id === norm || p.label.toLowerCase() === norm) || null
  );
}

export function clampDuration(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_ANIMATION_CONFIG.duration;
  return Math.round(Math.min(3.0, Math.max(0.2, val)) * 10) / 10;
}

export function clampDelay(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_ANIMATION_CONFIG.delay;
  return Math.round(Math.min(2.0, Math.max(0.0, val)) * 10) / 10;
}

export function normalizeEasing(val?: string | null): AnimationEasing {
  if (
    val === 'ease' ||
    val === 'ease-out' ||
    val === 'ease-in-out' ||
    val === 'cubic-bezier(0.22, 1, 0.36, 1)'
  ) {
    return val;
  }
  return DEFAULT_ANIMATION_CONFIG.easing;
}

export function normalizeAnimationConfig(
  raw: Partial<AnimationConfig> | null | undefined
): AnimationConfig | null {
  if (!raw || !raw.id) return null;
  const preset = findAnimationPreset(raw.id);
  if (!preset) return null;
  return {
    id: preset.id,
    category: preset.category,
    duration: clampDuration(raw.duration ?? DEFAULT_ANIMATION_CONFIG.duration),
    delay: clampDelay(raw.delay ?? DEFAULT_ANIMATION_CONFIG.delay),
    easing: normalizeEasing(raw.easing),
  };
}

export function normalizeAnimationSlots(objOrRaw: any): ObjectAnimationSlots {
  if (!objOrRaw) {
    return { ...EMPTY_ANIMATION_SLOTS };
  }

  const rawSlots = objOrRaw.animationSlots ?? objOrRaw;
  const hasExplicitSlotsObject =
    rawSlots &&
    typeof rawSlots === 'object' &&
    ('in' in rawSlots || 'out' in rawSlots || 'passive' in rawSlots);

  if (hasExplicitSlotsObject) {
    const inCfg = normalizeAnimationConfig(rawSlots.in);
    const outCfg = normalizeAnimationConfig(rawSlots.out);
    const passiveCfg = normalizeAnimationConfig(rawSlots.passive);
    return {
      in: inCfg?.category === 'in' ? inCfg : null,
      out: outCfg?.category === 'out' ? outCfg : null,
      passive: passiveCfg?.category === 'passive' ? passiveCfg : null,
    };
  }

  // Legacy migration from single animationConfig / animation field
  const storedConfig = normalizeAnimationConfig(objOrRaw.animationConfig);
  const fallbackPreset = findAnimationPreset(objOrRaw.animation);
  const legacy: AnimationConfig | null =
    storedConfig ||
    (fallbackPreset
      ? {
          id: fallbackPreset.id,
          category: fallbackPreset.category,
          ...DEFAULT_ANIMATION_CONFIG,
        }
      : null);

  if (!legacy) {
    return { ...EMPTY_ANIMATION_SLOTS };
  }

  return {
    in: legacy.category === 'in' ? legacy : null,
    out: legacy.category === 'out' ? legacy : null,
    passive: legacy.category === 'passive' ? legacy : null,
  };
}

export function hasAnyAnimationSlot(slots: ObjectAnimationSlots): boolean {
  return Boolean(slots.in || slots.out || slots.passive);
}

export function getPrimaryAnimationSlot(
  slots: ObjectAnimationSlots,
  preferred?: AnimationCategory
): AnimationConfig | null {
  if (preferred && slots[preferred]) {
    return slots[preferred];
  }
  return slots.in || slots.passive || slots.out || null;
}

export function syncAnimationSlotsToObject(
  obj: fabric.FabricObject,
  slots: ObjectAnimationSlots,
  preferredCategory?: AnimationCategory
): void {
  const normalized: ObjectAnimationSlots = {
    in: slots.in ? normalizeAnimationConfig(slots.in) : null,
    out: slots.out ? normalizeAnimationConfig(slots.out) : null,
    passive: slots.passive ? normalizeAnimationConfig(slots.passive) : null,
  };

  if (!hasAnyAnimationSlot(normalized)) {
    (obj as any).animationSlots = undefined;
    (obj as any).animation = undefined;
    (obj as any).animationCategory = undefined;
    (obj as any).animationConfig = undefined;
    return;
  }

  (obj as any).animationSlots = normalized;
  const primary = getPrimaryAnimationSlot(normalized, preferredCategory);
  if (primary) {
    const preset = findAnimationPreset(primary.id);
    (obj as any).animation = preset ? preset.label : primary.id;
    (obj as any).animationCategory = primary.category;
    (obj as any).animationConfig = primary;
  }
}

export function clearAnimationSlotFromObject(
  obj: fabric.FabricObject,
  category: AnimationCategory
): ObjectAnimationSlots {
  const current = normalizeAnimationSlots(obj);
  const next: ObjectAnimationSlots = {
    ...current,
    [category]: null,
  };
  syncAnimationSlotsToObject(obj, next);
  return next;
}

/**
 * Pure @keyframes stylesheet string for CSS playback in any container.
 */
export const SCRIBE_ANIMATION_KEYFRAMES_CSS = `
@keyframes scribeAnimPopIn {
  0% { opacity: 0; transform: scale(0); }
  65% { opacity: 1; transform: scale(1.12); }
  85% { opacity: 1; transform: scale(0.96); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes scribeAnimFadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes scribeAnimSlideInLeft {
  0% { opacity: 0; transform: translateX(-48px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes scribeAnimSlideInRight {
  0% { opacity: 0; transform: translateX(48px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes scribeAnimSlideInUp {
  0% { opacity: 0; transform: translateY(42px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes scribeAnimSlideInDown {
  0% { opacity: 0; transform: translateY(-42px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes scribeAnimZoomIn {
  0% { opacity: 0; transform: scale(0.35); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes scribeAnimBounceIn {
  0% { opacity: 0; transform: scale(0.2); }
  48% { opacity: 1; transform: scale(1.16); }
  68% { opacity: 1; transform: scale(0.91); }
  84% { opacity: 1; transform: scale(1.05); }
  94% { opacity: 1; transform: scale(0.98); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes scribeAnimFlipInX {
  0% { opacity: 0; transform: perspective(600px) rotateX(90deg) scale(0.92); }
  60% { opacity: 1; transform: perspective(600px) rotateX(-12deg) scale(1.02); }
  100% { opacity: 1; transform: perspective(600px) rotateX(0deg) scale(1); }
}
@keyframes scribeAnimFlipInY {
  0% { opacity: 0; transform: perspective(600px) rotateY(90deg) scale(0.92); }
  60% { opacity: 1; transform: perspective(600px) rotateY(-12deg) scale(1.02); }
  100% { opacity: 1; transform: perspective(600px) rotateY(0deg) scale(1); }
}
@keyframes scribeAnimWipeReveal {
  0% { opacity: 1; clip-path: inset(0 100% 0 0); }
  100% { opacity: 1; clip-path: inset(0 0% 0 0); }
}

@keyframes scribeAnimFadeOut {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes scribeAnimSlideOutLeft {
  0% { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(-48px); }
}
@keyframes scribeAnimSlideOutRight {
  0% { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(48px); }
}
@keyframes scribeAnimSlideOutUp {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-42px); }
}
@keyframes scribeAnimSlideOutDown {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(42px); }
}
@keyframes scribeAnimZoomOut {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.65); }
}
@keyframes scribeAnimShrinkOut {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0); }
}
@keyframes scribeAnimFlipOutX {
  0% { opacity: 1; transform: perspective(600px) rotateX(0deg) scale(1); }
  100% { opacity: 0; transform: perspective(600px) rotateX(90deg) scale(0.88); }
}
@keyframes scribeAnimFlipOutY {
  0% { opacity: 1; transform: perspective(600px) rotateY(0deg) scale(1); }
  100% { opacity: 0; transform: perspective(600px) rotateY(90deg) scale(0.88); }
}
@keyframes scribeAnimWipeHide {
  0% { opacity: 1; clip-path: inset(0 0 0 0); }
  92% { opacity: 1; clip-path: inset(0 0 0 100%); }
  100% { opacity: 0; clip-path: inset(0 0 0 100%); }
}

@keyframes scribeAnimFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-7px); }
}
@keyframes scribeAnimPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07); }
}
@keyframes scribeAnimSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes scribeAnimWobble {
  0%, 100% { transform: rotate(0deg) translateX(0px); }
  25% { transform: rotate(-6deg) translateX(-4px); }
  75% { transform: rotate(6deg) translateX(4px); }
}
@keyframes scribeAnimDrift {
  0%, 100% { transform: translate(0px, 0px); }
  25% { transform: translate(7px, -4px); }
  50% { transform: translate(0px, -6px); }
  75% { transform: translate(-7px, -2px); }
}
@keyframes scribeAnimHeartbeat {
  0%, 100% { transform: scale(1); }
  14% { transform: scale(1.14); }
  28% { transform: scale(1); }
  42% { transform: scale(1.1); }
  70% { transform: scale(1); }
}
@keyframes scribeAnimShimmerGlow {
  0%, 100% { opacity: 1; filter: brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0)); }
  50% { opacity: 0.92; filter: brightness(1.24) drop-shadow(0 0 12px rgba(125,211,252,0.72)); }
}
@keyframes scribeAnimSwing {
  0%, 100% { transform-origin: top center; transform: rotate(0deg); }
  25% { transform-origin: top center; transform: rotate(10deg); }
  75% { transform-origin: top center; transform: rotate(-10deg); }
}
`;

/**
 * Returns Web Animations API keyframes matching the active preset for smooth hardware playback.
 */
export function getWebAnimationKeyframes(presetId: string): Keyframe[] {
  switch (presetId) {
    case 'pop-in':
      return [
        { opacity: 0, transform: 'scale(0)', offset: 0 },
        { opacity: 1, transform: 'scale(1.12)', offset: 0.65 },
        { opacity: 1, transform: 'scale(0.96)', offset: 0.85 },
        { opacity: 1, transform: 'scale(1)', offset: 1 },
      ];
    case 'fade-in':
      return [{ opacity: 0 }, { opacity: 1 }];
    case 'slide-in-left':
      return [
        { opacity: 0, transform: 'translateX(-48px)' },
        { opacity: 1, transform: 'translateX(0px)' },
      ];
    case 'slide-in-right':
      return [
        { opacity: 0, transform: 'translateX(48px)' },
        { opacity: 1, transform: 'translateX(0px)' },
      ];
    case 'slide-in-up':
      return [
        { opacity: 0, transform: 'translateY(42px)' },
        { opacity: 1, transform: 'translateY(0px)' },
      ];
    case 'slide-in-down':
      return [
        { opacity: 0, transform: 'translateY(-42px)' },
        { opacity: 1, transform: 'translateY(0px)' },
      ];
    case 'zoom-in':
      return [
        { opacity: 0, transform: 'scale(0.35)' },
        { opacity: 1, transform: 'scale(1)' },
      ];
    case 'bounce-in':
      return [
        { opacity: 0, transform: 'scale(0.2)', offset: 0 },
        { opacity: 1, transform: 'scale(1.16)', offset: 0.48 },
        { opacity: 1, transform: 'scale(0.91)', offset: 0.68 },
        { opacity: 1, transform: 'scale(1.05)', offset: 0.84 },
        { opacity: 1, transform: 'scale(0.98)', offset: 0.94 },
        { opacity: 1, transform: 'scale(1)', offset: 1 },
      ];
    case 'flip-in-x':
      return [
        { opacity: 0, transform: 'perspective(600px) rotateX(90deg) scale(0.92)', offset: 0 },
        { opacity: 1, transform: 'perspective(600px) rotateX(-12deg) scale(1.02)', offset: 0.6 },
        { opacity: 1, transform: 'perspective(600px) rotateX(0deg) scale(1)', offset: 1 },
      ];
    case 'flip-in-y':
      return [
        { opacity: 0, transform: 'perspective(600px) rotateY(90deg) scale(0.92)', offset: 0 },
        { opacity: 1, transform: 'perspective(600px) rotateY(-12deg) scale(1.02)', offset: 0.6 },
        { opacity: 1, transform: 'perspective(600px) rotateY(0deg) scale(1)', offset: 1 },
      ];
    case 'wipe-reveal':
      return [
        { opacity: 1, clipPath: 'inset(0 100% 0 0)' },
        { opacity: 1, clipPath: 'inset(0 0% 0 0)' },
      ];
    case 'fade-out':
      return [{ opacity: 1 }, { opacity: 0 }];
    case 'slide-out-left':
      return [
        { opacity: 1, transform: 'translateX(0px)' },
        { opacity: 0, transform: 'translateX(-48px)' },
      ];
    case 'slide-out-right':
      return [
        { opacity: 1, transform: 'translateX(0px)' },
        { opacity: 0, transform: 'translateX(48px)' },
      ];
    case 'slide-out-up':
      return [
        { opacity: 1, transform: 'translateY(0px)' },
        { opacity: 0, transform: 'translateY(-42px)' },
      ];
    case 'slide-out-down':
      return [
        { opacity: 1, transform: 'translateY(0px)' },
        { opacity: 0, transform: 'translateY(42px)' },
      ];
    case 'zoom-out':
      return [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(1.65)' },
      ];
    case 'shrink-out':
      return [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0)' },
      ];
    case 'flip-out-x':
      return [
        { opacity: 1, transform: 'perspective(600px) rotateX(0deg) scale(1)' },
        { opacity: 0, transform: 'perspective(600px) rotateX(90deg) scale(0.88)' },
      ];
    case 'flip-out-y':
      return [
        { opacity: 1, transform: 'perspective(600px) rotateY(0deg) scale(1)' },
        { opacity: 0, transform: 'perspective(600px) rotateY(90deg) scale(0.88)' },
      ];
    case 'wipe-hide':
      return [
        { opacity: 1, clipPath: 'inset(0 0 0 0)', offset: 0 },
        { opacity: 1, clipPath: 'inset(0 0 0 100%)', offset: 0.92 },
        { opacity: 0, clipPath: 'inset(0 0 0 100%)', offset: 1 },
      ];
    case 'float':
      return [
        { transform: 'translateY(0px)' },
        { transform: 'translateY(-7px)' },
        { transform: 'translateY(0px)' },
      ];
    case 'pulse':
      return [
        { transform: 'scale(1)' },
        { transform: 'scale(1.07)' },
        { transform: 'scale(1)' },
      ];
    case 'spin':
      return [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }];
    case 'wobble':
      return [
        { transform: 'rotate(0deg) translateX(0px)' },
        { transform: 'rotate(-6deg) translateX(-4px)' },
        { transform: 'rotate(6deg) translateX(4px)' },
        { transform: 'rotate(0deg) translateX(0px)' },
      ];
    case 'drift':
      return [
        { transform: 'translate(0px, 0px)' },
        { transform: 'translate(7px, -4px)' },
        { transform: 'translate(0px, -6px)' },
        { transform: 'translate(-7px, -2px)' },
        { transform: 'translate(0px, 0px)' },
      ];
    case 'heartbeat':
      return [
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1.14)', offset: 0.14 },
        { transform: 'scale(1)', offset: 0.28 },
        { transform: 'scale(1.1)', offset: 0.42 },
        { transform: 'scale(1)', offset: 0.7 },
        { transform: 'scale(1)', offset: 1 },
      ];
    case 'shimmer-glow':
      return [
        {
          opacity: 1,
          filter: 'brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0))',
        },
        {
          opacity: 0.92,
          filter: 'brightness(1.24) drop-shadow(0 0 12px rgba(125,211,252,0.72))',
        },
        {
          opacity: 1,
          filter: 'brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0))',
        },
      ];
    case 'swing':
      return [
        { transformOrigin: 'top center', transform: 'rotate(0deg)' },
        { transformOrigin: 'top center', transform: 'rotate(10deg)' },
        { transformOrigin: 'top center', transform: 'rotate(-10deg)' },
        { transformOrigin: 'top center', transform: 'rotate(0deg)' },
      ];
    default:
      return [{ opacity: 1 }, { opacity: 1 }];
  }
}

/**
 * Cubic-bezier solver for accurate CSS timing curves in JS rAF loops.
 */
function sampleCubicBezier(p1x: number, p1y: number, p2x: number, p2y: number, x: number): number {
  const clampedX = Math.min(1, Math.max(0, x));
  if (clampedX <= 0) return 0;
  if (clampedX >= 1) return 1;

  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  let t = clampedX;
  for (let i = 0; i < 6; i++) {
    const xEst = ((ax * t + bx) * t + cx) * t - clampedX;
    const dx = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(xEst) < 1e-5) break;
    if (Math.abs(dx) < 1e-6) break;
    t = Math.min(1, Math.max(0, t - xEst / dx));
  }
  return ((ay * t + by) * t + cy) * t;
}

export function solveEasing(easing: AnimationEasing, linearT: number): number {
  const t = Math.min(1, Math.max(0, Number.isFinite(linearT) ? linearT : 0));
  switch (easing) {
    case 'ease':
      return sampleCubicBezier(0.25, 0.1, 0.25, 1.0, t);
    case 'ease-out':
      return sampleCubicBezier(0.0, 0.0, 0.58, 1.0, t);
    case 'ease-in-out':
      return sampleCubicBezier(0.42, 0.0, 0.58, 1.0, t);
    case 'cubic-bezier(0.22, 1, 0.36, 1)':
    default:
      return sampleCubicBezier(0.22, 1.0, 0.36, 1.0, t);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function piecewiseLerp(
  t: number,
  stops: { t: number; v: number }[]
): number {
  if (t <= stops[0].t) return stops[0].v;
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].t) {
      const span = Math.max(1e-5, stops[i].t - stops[i - 1].t);
      const local = (t - stops[i - 1].t) / span;
      return lerp(stops[i - 1].v, stops[i].v, local);
    }
  }
  return stops[stops.length - 1].v;
}

const IDENTITY_FRAME: EvaluatedAnimationFrame = {
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  angleDeg: 0,
  skewX: 0,
  clipRightPct: 0,
  glowBlur: 0,
  glowAlpha: 0,
  pivotTop: false,
};

/**
 * Pure deterministic keyframe evaluator mapping presetId + normalized progress `t` ∈ [0, 1]
 * into composable deltas so Invert/Transform coordinates & flips remain completely intact.
 */
export function evaluateAnimationFrame(
  presetId: string,
  tRaw: number
): EvaluatedAnimationFrame {
  const t = Math.min(1, Math.max(0, Number.isFinite(tRaw) ? tRaw : 0));
  const f: EvaluatedAnimationFrame = { ...IDENTITY_FRAME };

  switch (presetId) {
    // --- IN PRESETS ---
    case 'pop-in': {
      f.opacity = t <= 0 ? 0 : Math.min(1, t / 0.2);
      const s = piecewiseLerp(t, [
        { t: 0, v: 0 },
        { t: 0.65, v: 1.12 },
        { t: 0.85, v: 0.96 },
        { t: 1, v: 1 },
      ]);
      f.scaleX = s;
      f.scaleY = s;
      return f;
    }
    case 'fade-in': {
      f.opacity = t;
      return f;
    }
    case 'slide-in-left': {
      f.opacity = t;
      f.translateX = lerp(-96, 0, t);
      return f;
    }
    case 'slide-in-right': {
      f.opacity = t;
      f.translateX = lerp(96, 0, t);
      return f;
    }
    case 'slide-in-up': {
      f.opacity = t;
      f.translateY = lerp(84, 0, t);
      return f;
    }
    case 'slide-in-down': {
      f.opacity = t;
      f.translateY = lerp(-84, 0, t);
      return f;
    }
    case 'zoom-in': {
      f.opacity = t;
      const s = lerp(0.35, 1, t);
      f.scaleX = s;
      f.scaleY = s;
      return f;
    }
    case 'bounce-in': {
      f.opacity = t <= 0 ? 0 : Math.min(1, t / 0.16);
      const s = piecewiseLerp(t, [
        { t: 0, v: 0.05 },
        { t: 0.48, v: 1.16 },
        { t: 0.68, v: 0.91 },
        { t: 0.84, v: 1.05 },
        { t: 0.94, v: 0.98 },
        { t: 1, v: 1 },
      ]);
      f.scaleX = s;
      f.scaleY = s;
      return f;
    }
    case 'flip-in-x': {
      f.opacity = t <= 0 ? 0 : Math.min(1, t / 0.25);
      f.scaleY = piecewiseLerp(t, [
        { t: 0, v: 0.02 },
        { t: 0.6, v: 1.06 },
        { t: 1, v: 1 },
      ]);
      f.skewX = piecewiseLerp(t, [
        { t: 0, v: 14 },
        { t: 0.6, v: -3 },
        { t: 1, v: 0 },
      ]);
      return f;
    }
    case 'flip-in-y': {
      f.opacity = t <= 0 ? 0 : Math.min(1, t / 0.25);
      f.scaleX = piecewiseLerp(t, [
        { t: 0, v: 0.02 },
        { t: 0.6, v: 1.06 },
        { t: 1, v: 1 },
      ]);
      return f;
    }
    case 'wipe-reveal': {
      f.opacity = 1;
      f.clipRightPct = lerp(100, 0, t);
      return f;
    }

    // --- OUT PRESETS (Genuinely disappear at t = 1) ---
    case 'fade-out': {
      f.opacity = lerp(1, 0, t);
      return f;
    }
    case 'slide-out-left': {
      f.opacity = lerp(1, 0, t);
      f.translateX = lerp(0, -96, t);
      return f;
    }
    case 'slide-out-right': {
      f.opacity = lerp(1, 0, t);
      f.translateX = lerp(0, 96, t);
      return f;
    }
    case 'slide-out-up': {
      f.opacity = lerp(1, 0, t);
      f.translateY = lerp(0, -84, t);
      return f;
    }
    case 'slide-out-down': {
      f.opacity = lerp(1, 0, t);
      f.translateY = lerp(0, 84, t);
      return f;
    }
    case 'zoom-out': {
      f.opacity = lerp(1, 0, t);
      const s = lerp(1, 1.65, t);
      f.scaleX = s;
      f.scaleY = s;
      return f;
    }
    case 'shrink-out': {
      f.opacity = lerp(1, 0, t);
      const s = lerp(1, 0, t);
      f.scaleX = s;
      f.scaleY = s;
      return f;
    }
    case 'flip-out-x': {
      f.opacity = lerp(1, 0, t);
      f.scaleY = lerp(1, 0.02, t);
      f.skewX = lerp(0, 14, t);
      return f;
    }
    case 'flip-out-y': {
      f.opacity = lerp(1, 0, t);
      f.scaleX = lerp(1, 0.02, t);
      return f;
    }
    case 'wipe-hide': {
      f.clipRightPct = Math.min(100, lerp(0, 100, t / 0.92));
      f.opacity = t >= 0.92 ? lerp(1, 0, (t - 0.92) / 0.08) : 1;
      return f;
    }

    // --- PASSIVE PRESETS (Continuous looping motion) ---
    case 'float': {
      f.translateY = -Math.sin(t * Math.PI * 2) * 14;
      return f;
    }
    case 'pulse': {
      const s = 1 + 0.075 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));
      f.scaleX = s;
      f.scaleY = s;
      return f;
    }
    case 'spin': {
      f.angleDeg = t * 360;
      return f;
    }
    case 'wobble': {
      const wave = Math.sin(t * Math.PI * 2);
      f.angleDeg = wave * 6;
      f.translateX = wave * 8;
      return f;
    }
    case 'drift': {
      f.translateX = Math.sin(t * Math.PI * 2) * 14;
      f.translateY = -Math.sin(t * Math.PI) * 10;
      return f;
    }
    case 'heartbeat': {
      const s = piecewiseLerp(t, [
        { t: 0, v: 1 },
        { t: 0.14, v: 1.14 },
        { t: 0.28, v: 1 },
        { t: 0.42, v: 1.1 },
        { t: 0.7, v: 1 },
        { t: 1, v: 1 },
      ]);
      f.scaleX = s;
      f.scaleY = s;
      return f;
    }
    case 'shimmer-glow': {
      const wave = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      f.opacity = 1 - wave * 0.08;
      f.glowBlur = Math.round(wave * 26);
      f.glowAlpha = Number((wave * 0.78).toFixed(2));
      return f;
    }
    case 'swing': {
      f.pivotTop = true;
      f.angleDeg = Math.sin(t * Math.PI * 2) * 10;
      return f;
    }
    default:
      return f;
  }
}

export interface RestingObjectBaseline {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
  skewX: number;
  skewY: number;
  clipPath: fabric.FabricObject['clipPath'];
  shadow: fabric.Shadow | string | null | undefined;
}

const BASELINE_PROP = '__scribeAnimBaseline';
const ACTIVE_RAF_MAP = new WeakMap<fabric.FabricObject, number>();

export function captureRestingBaseline(obj: fabric.FabricObject): RestingObjectBaseline {
  const existing = (obj as any)[BASELINE_PROP] as RestingObjectBaseline | undefined;
  if (existing) return existing;
  const baseline: RestingObjectBaseline = {
    left: obj.left ?? 0,
    top: obj.top ?? 0,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
    angle: obj.angle ?? 0,
    opacity: obj.opacity ?? 1,
    skewX: obj.skewX ?? 0,
    skewY: obj.skewY ?? 0,
    clipPath: obj.clipPath,
    shadow: obj.shadow,
  };
  (obj as any)[BASELINE_PROP] = baseline;
  return baseline;
}

export function refreshRestingBaseline(obj: fabric.FabricObject): RestingObjectBaseline {
  delete (obj as any)[BASELINE_PROP];
  return captureRestingBaseline(obj);
}

export function restoreRestingBaseline(obj: fabric.FabricObject): void {
  const baseline = (obj as any)[BASELINE_PROP] as RestingObjectBaseline | undefined;
  if (!baseline) return;
  obj.set({
    left: baseline.left,
    top: baseline.top,
    scaleX: baseline.scaleX,
    scaleY: baseline.scaleY,
    angle: baseline.angle,
    opacity: baseline.opacity,
    skewX: baseline.skewX,
    skewY: baseline.skewY,
    clipPath: baseline.clipPath,
    shadow: baseline.shadow ?? null,
  });
  obj.setCoords();
  obj.canvas?.requestRenderAll();
}

export function stopObjectAnimationLoop(
  obj: fabric.FabricObject,
  options?: { restore?: boolean; clearBaseline?: boolean }
): void {
  const raf = ACTIVE_RAF_MAP.get(obj);
  if (raf !== undefined) {
    cancelAnimationFrame(raf);
    ACTIVE_RAF_MAP.delete(obj);
  }
  if (options?.restore !== false) {
    restoreRestingBaseline(obj);
  }
  if (options?.clearBaseline) {
    delete (obj as any)[BASELINE_PROP];
  }
}

export function applyAnimationFrameToFabricObject(
  obj: fabric.FabricObject,
  baseline: RestingObjectBaseline,
  frame: EvaluatedAnimationFrame
): void {
  const radBase = (baseline.angle * Math.PI) / 180;
  let extraDx = frame.translateX;
  let extraDy = frame.translateY;

  if (frame.pivotTop) {
    const halfH = ((obj.height || 100) * Math.abs(baseline.scaleY)) / 2;
    const theta = (frame.angleDeg * Math.PI) / 180;
    const localDx = -halfH * Math.sin(theta);
    const localDy = halfH * (1 - Math.cos(theta));
    extraDx += localDx * Math.cos(radBase) - localDy * Math.sin(radBase);
    extraDy += localDx * Math.sin(radBase) + localDy * Math.cos(radBase);
  }

  let nextClipPath = baseline.clipPath;
  if (frame.clipRightPct > 0.01) {
    const localW = Math.max(1, obj.width || 100);
    const localH = Math.max(1, obj.height || 100);
    const visibleFrac = Math.max(0.001, 1 - frame.clipRightPct / 100);
    const clipW = localW * visibleFrac;
    nextClipPath = new fabric.Rect({
      width: clipW,
      height: localH,
      left: -localW / 2 + clipW / 2,
      top: 0,
      originX: 'center',
      originY: 'center',
    });
  }

  let nextShadow = baseline.shadow ?? null;
  if (frame.glowBlur > 0 && frame.glowAlpha > 0) {
    nextShadow = new fabric.Shadow({
      color: `rgba(125, 211, 252, ${frame.glowAlpha})`,
      blur: frame.glowBlur,
      offsetX: 0,
      offsetY: 0,
    });
  }

  obj.set({
    left: baseline.left + extraDx,
    top: baseline.top + extraDy,
    scaleX: baseline.scaleX * Math.max(0.001, frame.scaleX),
    scaleY: baseline.scaleY * Math.max(0.001, frame.scaleY),
    angle: baseline.angle + frame.angleDeg,
    opacity: Math.max(0, Math.min(1, baseline.opacity * frame.opacity)),
    skewX: baseline.skewX + frame.skewX,
    clipPath: nextClipPath,
    shadow: nextShadow,
  });
  obj.setCoords();
  obj.canvas?.requestRenderAll();
}

export function playFabricObjectAnimation(
  obj: fabric.FabricObject,
  config: AnimationConfig,
  callbacks?: {
    onStateChange?: (state: 'idle' | 'delay' | 'playing' | 'completed-hidden' | 'looping') => void;
    onComplete?: () => void;
  }
): () => void {
  stopObjectAnimationLoop(obj, { restore: true, clearBaseline: false });
  const baseline = captureRestingBaseline(obj);

  const durationMs = Math.max(200, config.duration * 1000);
  const delayMs = Math.max(0, config.delay * 1000);
  const startTime = performance.now();

  // Initialize exact start frame (so IN animations genuinely begin hidden/off-axis during delay)
  const initialFrame = evaluateAnimationFrame(config.id, 0);
  applyAnimationFrameToFabricObject(obj, baseline, initialFrame);
  callbacks?.onStateChange?.(delayMs > 0 ? 'delay' : config.category === 'passive' ? 'looping' : 'playing');

  let cancelled = false;

  const tick = (now: number) => {
    if (cancelled) return;
    const elapsed = now - startTime;

    if (elapsed < delayMs) {
      callbacks?.onStateChange?.('delay');
      const id = requestAnimationFrame(tick);
      ACTIVE_RAF_MAP.set(obj, id);
      return;
    }

    const activeElapsed = elapsed - delayMs;

    if (config.category === 'passive') {
      const linearT = (activeElapsed % durationMs) / durationMs;
      const easedT =
        config.id === 'spin' || config.id === 'swing' || config.id === 'float'
          ? linearT
          : solveEasing(config.easing, linearT);
      const frame = evaluateAnimationFrame(config.id, easedT);
      applyAnimationFrameToFabricObject(obj, baseline, frame);
      callbacks?.onStateChange?.('looping');
      const id = requestAnimationFrame(tick);
      ACTIVE_RAF_MAP.set(obj, id);
      return;
    }

    const linearT = Math.min(1, activeElapsed / durationMs);
    const easedT = solveEasing(config.easing, linearT);
    const frame = evaluateAnimationFrame(config.id, easedT);
    applyAnimationFrameToFabricObject(obj, baseline, frame);

    if (linearT < 1) {
      callbacks?.onStateChange?.('playing');
      const id = requestAnimationFrame(tick);
      ACTIVE_RAF_MAP.set(obj, id);
      return;
    }

    // Completed finite cycle
    ACTIVE_RAF_MAP.delete(obj);
    if (config.category === 'in') {
      restoreRestingBaseline(obj);
      callbacks?.onStateChange?.('idle');
    } else {
      // Out animation genuinely stays hidden on completion until replayed or cleared
      const endFrame = evaluateAnimationFrame(config.id, 1);
      applyAnimationFrameToFabricObject(obj, baseline, endFrame);
      callbacks?.onStateChange?.('completed-hidden');
    }
    callbacks?.onComplete?.();
  };

  const firstId = requestAnimationFrame(tick);
  ACTIVE_RAF_MAP.set(obj, firstId);

  return () => {
    cancelled = true;
    stopObjectAnimationLoop(obj, { restore: true, clearBaseline: false });
  };
}

export function playFabricObjectAnimationSequence(
  obj: fabric.FabricObject,
  slots: ObjectAnimationSlots,
  callbacks?: {
    onCompleteFinite?: () => void;
  }
): { stop: () => void; hasInfinitePassive: boolean } {
  const ordered: AnimationConfig[] = [slots.in, slots.passive, slots.out].filter(
    (c): c is AnimationConfig => c !== null
  );

  if (ordered.length === 0) {
    callbacks?.onCompleteFinite?.();
    return { stop: () => {}, hasInfinitePassive: false };
  }

  if (ordered.length === 1) {
    const single = ordered[0];
    const stop = playFabricObjectAnimation(obj, single, {
      onComplete: () => {
        if (single.category !== 'passive') {
          callbacks?.onCompleteFinite?.();
        }
      },
    });
    return { stop, hasInfinitePassive: single.category === 'passive' };
  }

  let cancelled = false;
  let currentStop: (() => void) | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const hasInfinitePassive = Boolean(slots.passive && !slots.out);

  const runPhase = (idx: number) => {
    if (cancelled) return;
    if (idx >= ordered.length) {
      callbacks?.onCompleteFinite?.();
      return;
    }

    const cfg = ordered[idx];
    // If passive is followed by an Out animation, run one passive cycle then advance to Out
    if (cfg.category === 'passive' && slots.out) {
      currentStop = playFabricObjectAnimation(obj, cfg);
      const totalMs = Math.max(200, cfg.duration * 1000) + Math.max(0, cfg.delay * 1000);
      timerId = setTimeout(() => {
        if (cancelled) return;
        currentStop?.();
        currentStop = null;
        runPhase(idx + 1);
      }, totalMs);
      return;
    }

    currentStop = playFabricObjectAnimation(obj, cfg, {
      onComplete: () => {
        if (!cancelled) {
          runPhase(idx + 1);
        }
      },
    });
  };

  runPhase(0);

  return {
    hasInfinitePassive,
    stop: () => {
      cancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      currentStop?.();
      currentStop = null;
      stopObjectAnimationLoop(obj, { restore: true, clearBaseline: false });
    },
  };
}

export function playCanvasPreview(
  canvas: fabric.Canvas,
  onAllFinished?: () => void
): () => void {
  const animated = canvas
    .getObjects()
    .map((obj) => ({ obj, slots: normalizeAnimationSlots(obj) }))
    .filter((entry) => hasAnyAnimationSlot(entry.slots));

  if (animated.length === 0) {
    onAllFinished?.();
    return () => {};
  }

  let pendingFinite = animated.filter((entry) => !entry.slots.passive || Boolean(entry.slots.out)).length;

  const runners = animated.map(({ obj, slots }) =>
    playFabricObjectAnimationSequence(obj, slots, {
      onCompleteFinite: () => {
        pendingFinite = Math.max(0, pendingFinite - 1);
        if (pendingFinite === 0) {
          onAllFinished?.();
        }
      },
    })
  );

  if (pendingFinite === 0) {
    onAllFinished?.();
  }

  return () => {
    runners.forEach((runner) => runner.stop());
  };
}

export function stopCanvasPreview(canvas: fabric.Canvas): void {
  canvas.getObjects().forEach((obj) => {
    stopObjectAnimationLoop(obj, { restore: true, clearBaseline: false });
  });
}

export type PlaybackStatus = 'idle' | 'delay' | 'playing' | 'completed-hidden' | 'looping';

export interface UseObjectAnimationOptions {
  selectedObject: fabric.FabricObject | null;
  onCommitCanvasChange?: () => void;
}

/**
 * Isolated React hook managing independent In / Out / Passive AnimationConfig slots
 * on the selected object, with per-slot clearing and non-destructive Fabric.js playback.
 */
export function useObjectAnimation({
  selectedObject,
  onCommitCanvasChange,
}: UseObjectAnimationOptions) {
  const [slots, setSlots] = useState<ObjectAnimationSlots>({ ...EMPTY_ANIMATION_SLOTS });
  const [replayKey, setReplayKey] = useState<number>(0);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');

  const activeObjRef = useRef<fabric.FabricObject | null>(null);
  const activePlayingCategoryRef = useRef<AnimationCategory | null>(null);

  // Hydrate stored animation slots cleanly whenever selection changes
  useEffect(() => {
    const prev = activeObjRef.current;
    if (prev && prev !== selectedObject) {
      stopObjectAnimationLoop(prev, { restore: true, clearBaseline: true });
    }
    activeObjRef.current = selectedObject;
    activePlayingCategoryRef.current = null;

    if (!selectedObject) {
      setSlots({ ...EMPTY_ANIMATION_SLOTS });
      setPlaybackStatus('idle');
      return;
    }

    const hydrated = normalizeAnimationSlots(selectedObject);
    setSlots(hydrated);
    setPlaybackStatus('idle');

    // Keep resting baseline synced if user drags/rotates/scales/flips object directly on canvas
    const handleExternalModified = () => {
      if (!ACTIVE_RAF_MAP.has(selectedObject)) {
        refreshRestingBaseline(selectedObject);
      }
    };
    selectedObject.on('modified', handleExternalModified);
    return () => {
      selectedObject.off('modified', handleExternalModified);
    };
  }, [selectedObject]);

  // Restore resting baseline safely when unmounting
  useEffect(() => {
    return () => {
      if (activeObjRef.current) {
        stopObjectAnimationLoop(activeObjRef.current, { restore: true, clearBaseline: true });
      }
    };
  }, []);

  const triggerCanvasPlayback = useCallback(
    (obj: fabric.FabricObject, nextConfig: AnimationConfig) => {
      activePlayingCategoryRef.current = nextConfig.category;
      setReplayKey((k) => k + 1);
      playFabricObjectAnimation(obj, nextConfig, {
        onStateChange: (status) => setPlaybackStatus(status),
      });
    },
    []
  );

  const selectPreset = useCallback(
    (preset: AnimationPresetDef) => {
      if (!selectedObject) return;
      const existingSlot = slots[preset.category];
      const nextConfig: AnimationConfig = {
        id: preset.id,
        category: preset.category,
        duration: existingSlot?.duration ?? DEFAULT_ANIMATION_CONFIG.duration,
        delay: existingSlot?.delay ?? DEFAULT_ANIMATION_CONFIG.delay,
        easing: existingSlot?.easing ?? DEFAULT_ANIMATION_CONFIG.easing,
      };
      const nextSlots: ObjectAnimationSlots = {
        ...slots,
        [preset.category]: nextConfig,
      };

      // Refresh baseline only if no active animation is currently hiding/displacing the object
      if (!ACTIVE_RAF_MAP.has(selectedObject) && playbackStatus !== 'completed-hidden') {
        refreshRestingBaseline(selectedObject);
      } else {
        restoreRestingBaseline(selectedObject);
      }
      syncAnimationSlotsToObject(selectedObject, nextSlots, preset.category);
      setSlots(nextSlots);
      triggerCanvasPlayback(selectedObject, nextConfig);
      onCommitCanvasChange?.();
    },
    [
      onCommitCanvasChange,
      playbackStatus,
      selectedObject,
      slots,
      triggerCanvasPlayback,
    ]
  );

  const updateTiming = useCallback(
    (
      category: AnimationCategory,
      patch: Partial<Pick<AnimationConfig, 'duration' | 'delay' | 'easing'>>
    ) => {
      if (!selectedObject) return;
      const currentSlot = slots[category];
      if (!currentSlot) return;

      const nextConfig: AnimationConfig = {
        ...currentSlot,
        duration: patch.duration !== undefined ? clampDuration(patch.duration) : currentSlot.duration,
        delay: patch.delay !== undefined ? clampDelay(patch.delay) : currentSlot.delay,
        easing: patch.easing !== undefined ? normalizeEasing(patch.easing) : currentSlot.easing,
      };
      const nextSlots: ObjectAnimationSlots = {
        ...slots,
        [category]: nextConfig,
      };

      restoreRestingBaseline(selectedObject);
      syncAnimationSlotsToObject(selectedObject, nextSlots, category);
      setSlots(nextSlots);
      triggerCanvasPlayback(selectedObject, nextConfig);
      onCommitCanvasChange?.();
    },
    [onCommitCanvasChange, selectedObject, slots, triggerCanvasPlayback]
  );

  const replayAnimation = useCallback(
    (category?: AnimationCategory) => {
      if (!selectedObject) return;
      const target = getPrimaryAnimationSlot(slots, category);
      if (!target) return;
      restoreRestingBaseline(selectedObject);
      triggerCanvasPlayback(selectedObject, target);
    },
    [selectedObject, slots, triggerCanvasPlayback]
  );

  const clearSingleAnimation = useCallback(
    (category: AnimationCategory) => {
      if (!selectedObject || !slots[category]) return;
      const nextSlots: ObjectAnimationSlots = {
        ...slots,
        [category]: null,
      };
      const stillHasAny = hasAnyAnimationSlot(nextSlots);

      if (
        !stillHasAny ||
        activePlayingCategoryRef.current === category ||
        (category === 'out' && playbackStatus === 'completed-hidden') ||
        (category === 'passive' && playbackStatus === 'looping')
      ) {
        stopObjectAnimationLoop(selectedObject, {
          restore: true,
          clearBaseline: !stillHasAny,
        });
        activePlayingCategoryRef.current = null;
        setPlaybackStatus('idle');
      }

      syncAnimationSlotsToObject(selectedObject, nextSlots);
      setSlots(nextSlots);
      setReplayKey((k) => k + 1);
      onCommitCanvasChange?.();
    },
    [onCommitCanvasChange, playbackStatus, selectedObject, slots]
  );

  const clearAllAnimations = useCallback(() => {
    if (!selectedObject) return;
    stopObjectAnimationLoop(selectedObject, { restore: true, clearBaseline: true });
    activePlayingCategoryRef.current = null;
    syncAnimationSlotsToObject(selectedObject, EMPTY_ANIMATION_SLOTS);
    setSlots({ ...EMPTY_ANIMATION_SLOTS });
    setPlaybackStatus('idle');
    setReplayKey((k) => k + 1);
    onCommitCanvasChange?.();
  }, [onCommitCanvasChange, selectedObject]);

  return {
    slots,
    config: getPrimaryAnimationSlot(slots),
    replayKey,
    playbackStatus,
    selectPreset,
    updateTiming,
    replayAnimation,
    clearSingleAnimation,
    clearAllAnimations,
    // Keep clearAnimation alias for backwards safety
    clearAnimation: clearAllAnimations,
  };
}

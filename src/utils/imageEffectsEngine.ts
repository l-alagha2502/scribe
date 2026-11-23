import { useState, useEffect, useCallback, useRef } from 'react';
import * as fabric from 'fabric';

export type DitherAlgorithm = 'floyd-steinberg' | 'bayer-4x4';

export interface FilterSliderState {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  exposure: number; // -100 to 100 (Exposure / Highlights)
  shadows: number; // -100 to 100
  temperature: number; // -100 (cool blue) to 100 (warm amber)
  hueRotate: number; // 0 to 360 deg
  blur: number; // 0 to 40 px
  sharpen: number; // 0 to 100 %
  vignette: number; // 0 to 100 %
  dropShadowBlur: number; // 0 to 60 px
  dropShadowOffsetX: number; // -50 to 50 px
  dropShadowOffsetY: number; // -50 to 50 px
  dropShadowOpacity: number; // 0 to 100 %
  dropShadowColor: string; // hex color
  ditherIntensity: number; // 0 to 100 %
  ditherMode: DitherAlgorithm;
  /** @deprecated Legacy alias preserved for older saved documents */
  dropShadow?: number;
}

export const DEFAULT_FILTER_SLIDERS: FilterSliderState = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  shadows: 0,
  temperature: 0,
  hueRotate: 0,
  blur: 0,
  sharpen: 0,
  vignette: 0,
  dropShadowBlur: 0,
  dropShadowOffsetX: 0,
  dropShadowOffsetY: 0,
  dropShadowOpacity: 70,
  dropShadowColor: '#000000',
  ditherIntensity: 0,
  ditherMode: 'bayer-4x4',
};

function safeFinite(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeClamp(v: unknown, min: number, max: number, fallback = min): number {
  const n = safeFinite(v, fallback);
  return n < min ? min : n > max ? max : n;
}

export function normalizeFilterSliders(
  raw?: Partial<FilterSliderState> | null
): FilterSliderState {
  if (!raw) return { ...DEFAULT_FILTER_SLIDERS };
  const merged: FilterSliderState = {
    brightness: Math.round(safeClamp(raw.brightness, -100, 100, DEFAULT_FILTER_SLIDERS.brightness)),
    contrast: Math.round(safeClamp(raw.contrast, -100, 100, DEFAULT_FILTER_SLIDERS.contrast)),
    saturation: Math.round(safeClamp(raw.saturation, -100, 100, DEFAULT_FILTER_SLIDERS.saturation)),
    exposure: Math.round(safeClamp(raw.exposure, -100, 100, DEFAULT_FILTER_SLIDERS.exposure)),
    shadows: Math.round(safeClamp(raw.shadows, -100, 100, DEFAULT_FILTER_SLIDERS.shadows)),
    temperature: Math.round(safeClamp(raw.temperature, -100, 100, DEFAULT_FILTER_SLIDERS.temperature)),
    hueRotate: Math.round(safeClamp(raw.hueRotate, 0, 360, DEFAULT_FILTER_SLIDERS.hueRotate)),
    blur: Math.round(safeClamp(raw.blur, 0, 40, DEFAULT_FILTER_SLIDERS.blur)),
    sharpen: Math.round(safeClamp(raw.sharpen, 0, 100, DEFAULT_FILTER_SLIDERS.sharpen)),
    vignette: Math.round(safeClamp(raw.vignette, 0, 100, DEFAULT_FILTER_SLIDERS.vignette)),
    dropShadowBlur: Math.round(safeClamp(raw.dropShadowBlur, 0, 60, DEFAULT_FILTER_SLIDERS.dropShadowBlur)),
    dropShadowOffsetX: Math.round(safeClamp(raw.dropShadowOffsetX, -50, 50, DEFAULT_FILTER_SLIDERS.dropShadowOffsetX)),
    dropShadowOffsetY: Math.round(safeClamp(raw.dropShadowOffsetY, -50, 50, DEFAULT_FILTER_SLIDERS.dropShadowOffsetY)),
    dropShadowOpacity: Math.round(safeClamp(raw.dropShadowOpacity, 0, 100, DEFAULT_FILTER_SLIDERS.dropShadowOpacity)),
    dropShadowColor:
      typeof raw.dropShadowColor === 'string' && raw.dropShadowColor.trim()
        ? raw.dropShadowColor.trim()
        : DEFAULT_FILTER_SLIDERS.dropShadowColor,
    ditherIntensity: Math.round(safeClamp(raw.ditherIntensity, 0, 100, DEFAULT_FILTER_SLIDERS.ditherIntensity)),
    ditherMode:
      raw.ditherMode === 'floyd-steinberg' ? 'floyd-steinberg' : 'bayer-4x4',
  };
  if (
    typeof raw.dropShadow === 'number' &&
    Number.isFinite(raw.dropShadow) &&
    raw.dropShadow > 0 &&
    typeof raw.dropShadowBlur !== 'number'
  ) {
    merged.dropShadowBlur = Math.round(safeClamp(raw.dropShadow, 0, 60, 0));
    merged.dropShadowOffsetY = Math.round(merged.dropShadowBlur * 0.35);
  }
  return merged;
}

const EFFECT_ALIASES: Record<string, string> = {
  vivid: 'color-punch',
  vintage: 'vintage-film',
  invert: 'invert-colors',
  'retro-warm': 'warm-sunset',
  'cool-tone': 'cool-noir',
};

export function normalizeEffectId(effectId: string): string {
  return EFFECT_ALIASES[effectId] || effectId;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clampByte(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function mixNum(a: number, b: number, t: number): number {
  const safeT = clamp01(t);
  return safeFinite(a, 0) + (safeFinite(b, 0) - safeFinite(a, 0)) * safeT;
}

function mixRgb(
  ar: number,
  ag: number,
  ab: number,
  br: number,
  bg: number,
  bb: number,
  t: number
): [number, number, number] {
  const safeT = clamp01(t);
  return [ar + (br - ar) * safeT, ag + (bg - ag) * safeT, ab + (bb - ab) * safeT];
}

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sCurveChannel(v: number, strength: number): number {
  const c = clamp01(v);
  const s = c * c * (3 - 2 * c);
  return c + (s - c) * strength;
}

function sCurveRgb(
  r: number,
  g: number,
  b: number,
  strength: number
): [number, number, number] {
  return [
    sCurveChannel(r, strength),
    sCurveChannel(g, strength),
    sCurveChannel(b, strength),
  ];
}

function overlayChannel(base: number, blend: number): number {
  return base < 0.5 ? 2 * base * blend : 1 - 2 * (1 - base) * (1 - blend);
}

function softLightChannel(base: number, blend: number): number {
  return (1 - 2 * blend) * base * base + 2 * blend * base;
}

function blendSoftLightRgb(
  r: number,
  g: number,
  b: number,
  tr: number,
  tg: number,
  tb: number,
  weight: number
): [number, number, number] {
  return mixRgb(
    r,
    g,
    b,
    softLightChannel(clamp01(r), tr),
    softLightChannel(clamp01(g), tg),
    softLightChannel(clamp01(b), tb),
    weight
  );
}

function blendOverlayRgb(
  r: number,
  g: number,
  b: number,
  tr: number,
  tg: number,
  tb: number,
  weight: number
): [number, number, number] {
  return mixRgb(
    r,
    g,
    b,
    overlayChannel(clamp01(r), tr),
    overlayChannel(clamp01(g), tg),
    overlayChannel(clamp01(b), tb),
    weight
  );
}

function blendMultiplyRgb(
  r: number,
  g: number,
  b: number,
  tr: number,
  tg: number,
  tb: number,
  weight: number
): [number, number, number] {
  return mixRgb(r, g, b, r * tr, g * tg, b * tb, weight);
}

function blendScreenRgb(
  r: number,
  g: number,
  b: number,
  tr: number,
  tg: number,
  tb: number,
  weight: number
): [number, number, number] {
  return mixRgb(
    r,
    g,
    b,
    1 - (1 - r) * (1 - tr),
    1 - (1 - g) * (1 - tg),
    1 - (1 - b) * (1 - tb),
    weight
  );
}

function adjustSaturationRgb(
  r: number,
  g: number,
  b: number,
  satDelta: number
): [number, number, number] {
  const lum = luma(r, g, b);
  const factor = 1 + satDelta;
  return [
    clamp01(lum + (r - lum) * factor),
    clamp01(lum + (g - lum) * factor),
    clamp01(lum + (b - lum) * factor),
  ];
}

function adjustVibranceRgb(
  r: number,
  g: number,
  b: number,
  amt: number
): [number, number, number] {
  const maxC = Math.max(r, g, b);
  const avg = (r + g + b) / 3;
  const weight = (1 - clamp01((maxC - avg) * 2.2)) * amt;
  return [
    clamp01(r + (r - avg) * weight),
    clamp01(g + (g - avg) * weight),
    clamp01(b + (b - avg) * weight),
  ];
}

function splitToneRgb(
  r: number,
  g: number,
  b: number,
  sr: number,
  sg: number,
  sb: number,
  hr: number,
  hg: number,
  hb: number,
  shadowWeight: number,
  highlightWeight: number,
  balance: number = 0
): [number, number, number] {
  const lum = luma(r, g, b);
  const sMask = Math.pow(clamp01(1 - lum + balance), 1.55) * shadowWeight;
  const hMask = Math.pow(clamp01(lum - balance), 1.55) * highlightWeight;
  let [nr, ng, nb] = blendSoftLightRgb(r, g, b, sr, sg, sb, sMask);
  [nr, ng, nb] = blendSoftLightRgb(nr, ng, nb, hr, hg, hb, hMask);
  return [clamp01(nr), clamp01(ng), clamp01(nb)];
}

function hueRotateRgb(
  r: number,
  g: number,
  b: number,
  deg: number
): [number, number, number] {
  const rad = (deg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const k = Math.sqrt(1 / 3);
  const m00 = cosA + (1 - cosA) / 3;
  const m01 = (1 - cosA) / 3 - k * sinA;
  const m02 = (1 - cosA) / 3 + k * sinA;
  const m10 = (1 - cosA) / 3 + k * sinA;
  const m11 = cosA + (1 - cosA) / 3;
  const m12 = (1 - cosA) / 3 - k * sinA;
  const m20 = (1 - cosA) / 3 - k * sinA;
  const m21 = (1 - cosA) / 3 + k * sinA;
  const m22 = cosA + (1 - cosA) / 3;
  return [
    clamp01(r * m00 + g * m01 + b * m02),
    clamp01(r * m10 + g * m11 + b * m12),
    clamp01(r * m20 + g * m21 + b * m22),
  ];
}

function deterministicNoise(u: number, v: number): number {
  const n = Math.sin(u * 127.1 + v * 311.7) * 43758.5453123;
  return n - Math.floor(n) - 0.5;
}

/**
 * Computes the 100%-processed multi-pass composite pixel for a single texel.
 */
function gradePixel100(
  effectId: string,
  origR: number,
  origG: number,
  origB: number,
  u: number,
  v: number,
  neighborAvgR: number,
  neighborAvgG: number,
  neighborAvgB: number
): [number, number, number] {
  let r = origR;
  let g = origG;
  let b = origB;

  switch (effectId) {
    case 'grayscale': {
      // Panchromatic darkroom monochrome with rich S-curve micro-contrast
      const lum = clamp01(0.26 * r + 0.62 * g + 0.12 * b);
      let c = sCurveChannel(lum, 0.62);
      c = clamp01((c - 0.5) * 1.18 + 0.5);
      return [c, c, c];
    }

    case 'sepia': {
      const lum = clamp01(0.299 * r + 0.587 * g + 0.114 * b);
      const curved = sCurveChannel(lum, 0.45);
      // Warm silver base
      r = clamp01(curved * 1.07 + 0.03);
      g = clamp01(curved * 0.87 + 0.01);
      b = clamp01(curved * 0.63);
      // Deep espresso shadows + warm parchment highlights
      [r, g, b] = splitToneRgb(r, g, b, 0.22, 0.11, 0.05, 0.98, 0.86, 0.68, 0.7, 0.55);
      return [r, g, b];
    }

    case 'color-punch': {
      // High-impact Canva/Lightroom pop: vibrance + clarity high-pass + S-curve
      [r, g, b] = adjustVibranceRgb(r, g, b, 0.85);
      [r, g, b] = adjustSaturationRgb(r, g, b, 0.34);
      r = clamp01(r + (origR - neighborAvgR) * 0.38);
      g = clamp01(g + (origG - neighborAvgG) * 0.38);
      b = clamp01(b + (origB - neighborAvgB) * 0.38);
      [r, g, b] = sCurveRgb(r, g, b, 0.5);
      return [r, g, b];
    }

    case 'vintage-film': {
      // Faded analog print: matte lifted blacks + desaturated muted tones + warm split-tone + subtle grain
      [r, g, b] = adjustSaturationRgb(r, g, b, -0.26);
      r = 0.065 + r * 0.89;
      g = 0.055 + g * 0.87;
      b = 0.045 + b * 0.82;
      [r, g, b] = splitToneRgb(r, g, b, 0.32, 0.21, 0.12, 0.96, 0.88, 0.72, 0.75, 0.65);
      [r, g, b] = blendSoftLightRgb(r, g, b, 0.84, 0.64, 0.45, 0.34);
      const n = deterministicNoise(u * 400, v * 400) * 0.045;
      return [clamp01(r + n), clamp01(g + n), clamp01(b + n)];
    }

    case 'cool-noir': {
      // Moody cinema noir: deep contrast + cold steel-blue shadows + icy cyan highlights + edge vignette
      [r, g, b] = adjustSaturationRgb(r, g, b, -0.78);
      [r, g, b] = sCurveRgb(r, g, b, 0.75);
      [r, g, b] = splitToneRgb(r, g, b, 0.06, 0.22, 0.45, 0.72, 0.9, 0.99, 0.95, 0.55);
      [r, g, b] = blendOverlayRgb(r, g, b, 0.14, 0.36, 0.64, 0.3);
      const dx = (u - 0.5) * 1.414;
      const dy = (v - 0.5) * 1.414;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vig = clamp01(1 - Math.pow(dist, 2.0) * 0.42);
      return [clamp01(r * vig), clamp01(g * vig), clamp01(b * vig)];
    }

    case 'high-contrast': {
      // Ink-deep blacks, crisp highlights, subtle local clarity
      r = clamp01(r + (origR - neighborAvgR) * 0.42);
      g = clamp01(g + (origG - neighborAvgG) * 0.42);
      b = clamp01(b + (origB - neighborAvgB) * 0.42);
      [r, g, b] = sCurveRgb(r, g, b, 0.95);
      r = clamp01((r - 0.5) * 1.24 + 0.5);
      g = clamp01((g - 0.5) * 1.24 + 0.5);
      b = clamp01((b - 0.5) * 1.24 + 0.5);
      [r, g, b] = adjustVibranceRgb(r, g, b, 0.22);
      return [r, g, b];
    }

    case 'teal-orange': {
      // Hollywood 3-zone Teal & Orange blockbuster grading
      [r, g, b] = adjustVibranceRgb(r, g, b, 0.45);
      // Push shadows deep teal (#087f96) and highlights warm amber-orange (#ff8c24)
      [r, g, b] = splitToneRgb(r, g, b, 0.04, 0.54, 0.66, 0.99, 0.58, 0.18, 0.98, 0.95, 0.04);
      // Overlay pass reinforces shadow/highlight complementary split
      const lum = luma(r, g, b);
      if (lum < 0.5) {
        [r, g, b] = blendOverlayRgb(r, g, b, 0.06, 0.52, 0.62, 0.42 * (1 - lum * 2));
      } else {
        [r, g, b] = blendSoftLightRgb(r, g, b, 0.99, 0.56, 0.16, 0.48 * ((lum - 0.5) * 2));
      }
      [r, g, b] = sCurveRgb(r, g, b, 0.58);
      return [r, g, b];
    }

    case 'warm-sunset': {
      // Golden hour amber glow + plum-rose shadow warmth
      r = clamp01(r * 1.06 + 0.02);
      g = clamp01(g * 1.01 + 0.01);
      b = clamp01(b * 0.92);
      [r, g, b] = adjustVibranceRgb(r, g, b, 0.48);
      [r, g, b] = splitToneRgb(r, g, b, 0.52, 0.16, 0.34, 0.99, 0.74, 0.18, 0.62, 0.92);
      [r, g, b] = blendSoftLightRgb(r, g, b, 0.98, 0.58, 0.22, 0.36);
      [r, g, b] = sCurveRgb(r, g, b, 0.34);
      return [r, g, b];
    }

    case 'cyberpunk-neon': {
      // Electric magenta shadows + glowing cyan highlights + deep S-curve punch
      [r, g, b] = hueRotateRgb(r, g, b, -18);
      [r, g, b] = adjustVibranceRgb(r, g, b, 0.92);
      [r, g, b] = adjustSaturationRgb(r, g, b, 0.42);
      [r, g, b] = sCurveRgb(r, g, b, 0.68);
      [r, g, b] = splitToneRgb(r, g, b, 0.78, 0.08, 0.88, 0.06, 0.88, 0.98, 0.98, 0.95);
      [r, g, b] = blendOverlayRgb(r, g, b, 0.85, 0.16, 0.92, 0.24);
      [r, g, b] = blendScreenRgb(r, g, b, 0.1, 0.24, 0.34, 0.2);
      return [r, g, b];
    }

    case 'lofi-grain': {
      // Analog lofi aesthetic: crushed/lifted blacks + muted palette + heavy texture grain + vignette
      [r, g, b] = adjustSaturationRgb(r, g, b, -0.34);
      r = 0.085 + r * 0.84;
      g = 0.08 + g * 0.83;
      b = 0.075 + b * 0.82;
      [r, g, b] = blendSoftLightRgb(r, g, b, 0.78, 0.64, 0.5, 0.38);
      const n = deterministicNoise(u * 450, v * 450) * 0.14;
      const dx = (u - 0.5) * 1.414;
      const dy = (v - 0.5) * 1.414;
      const vig = clamp01(1 - Math.pow(Math.sqrt(dx * dx + dy * dy), 1.8) * 0.34);
      return [clamp01((r + n) * vig), clamp01((g + n) * vig), clamp01((b + n) * vig)];
    }

    case 'vignette': {
      // Deep studio vignette with subtle center contrast pop
      [r, g, b] = sCurveRgb(r, g, b, 0.26);
      const dx = (u - 0.5) * 1.45;
      const dy = (v - 0.5) * 1.45;
      const dist = clamp01(Math.sqrt(dx * dx + dy * dy));
      const vig = clamp01(1 - Math.pow(dist, 1.85) * 0.86);
      return [clamp01(r * vig), clamp01(g * vig), clamp01(b * vig)];
    }

    case 'invert-colors': {
      // High-definition negative inversion
      [r, g, b] = [1 - r, 1 - g, 1 - b];
      [r, g, b] = sCurveRgb(r, g, b, 0.25);
      return [r, g, b];
    }

    case 'duotone': {
      // True 3-stop Spotify/Canva gradient LUT map (Deep Indigo -> Electric Violet -> Bright Sky)
      const rawLum = clamp01(0.2126 * r + 0.7152 * g + 0.0722 * b);
      const tLum = sCurveChannel(rawLum, 0.55);
      if (tLum < 0.5) {
        const k = tLum * 2;
        return mixRgb(0.11, 0.09, 0.34, 0.48, 0.36, 0.96, k);
      }
      const k = (tLum - 0.5) * 2;
      return mixRgb(0.48, 0.36, 0.96, 0.42, 0.88, 0.99, k);
    }

    case 'pastel-dream': {
      // Airy bright gamma lift + soft lavender/rose highlight wash
      r = Math.pow(Math.max(0.0001, r), 0.8) * 0.9 + 0.08;
      g = Math.pow(Math.max(0.0001, g), 0.82) * 0.9 + 0.07;
      b = Math.pow(Math.max(0.0001, b), 0.78) * 0.9 + 0.1;
      [r, g, b] = adjustSaturationRgb(r, g, b, -0.2);
      [r, g, b] = splitToneRgb(r, g, b, 0.82, 0.74, 0.98, 0.99, 0.82, 0.92, 0.65, 0.75);
      [r, g, b] = blendScreenRgb(r, g, b, 0.98, 0.78, 0.88, 0.18);
      return [clamp01(r), clamp01(g), clamp01(b)];
    }

    case 'retro-polaroid': {
      // Classic instant film: cyan-emerald shadows, creamy warm highlights, punchy mids
      r = 0.04 + r * 0.96;
      g = 0.04 + g * 0.94;
      b = 0.05 + b * 0.9;
      [r, g, b] = sCurveRgb(r, g, b, 0.48);
      [r, g, b] = splitToneRgb(r, g, b, 0.06, 0.38, 0.34, 0.99, 0.92, 0.56, 0.78, 0.85);
      [r, g, b] = blendSoftLightRgb(r, g, b, 0.98, 0.9, 0.62, 0.32);
      const dx = (u - 0.5) * 1.4;
      const dy = (v - 0.5) * 1.4;
      const vig = clamp01(1 - Math.pow(Math.sqrt(dx * dx + dy * dy), 2.1) * 0.28);
      return [clamp01(r * vig), clamp01(g * vig), clamp01(b * vig)];
    }

    case 'matte-fade': {
      // Editorial charcoal matte blacks + compressed highlights + cool slate cast
      [r, g, b] = adjustSaturationRgb(r, g, b, -0.28);
      [r, g, b] = sCurveRgb(r, g, b, 0.32);
      r = 0.13 + r * 0.79;
      g = 0.135 + g * 0.79;
      b = 0.15 + b * 0.78;
      [r, g, b] = splitToneRgb(r, g, b, 0.22, 0.28, 0.38, 0.88, 0.9, 0.95, 0.65, 0.35);
      return [clamp01(r), clamp01(g), clamp01(b)];
    }

    case 'dramatic-hdr': {
      // High dynamic range clarity: strong local micro-contrast + shadow lift + vibrant crisp color
      const detailR = (origR - neighborAvgR) * 1.15;
      const detailG = (origG - neighborAvgG) * 1.15;
      const detailB = (origB - neighborAvgB) * 1.15;
      // Lift shadows softly while compressing highlights before adding punchy S-curve
      r = Math.pow(Math.max(0.0001, origR), 0.88);
      g = Math.pow(Math.max(0.0001, origG), 0.88);
      b = Math.pow(Math.max(0.0001, origB), 0.88);
      r = clamp01(r + detailR);
      g = clamp01(g + detailG);
      b = clamp01(b + detailB);
      [r, g, b] = adjustVibranceRgb(r, g, b, 0.62);
      [r, g, b] = sCurveRgb(r, g, b, 0.65);
      return [r, g, b];
    }

    default:
      return [origR, origG, origB];
  }
}

/**
 * Pure 2D ImageData composite processor with exact 0%->100% linear interpolation
 * between original pixels and multi-pass graded pixels.
 */
export function applyCompositeEffectToImageData(
  imageData: ImageData,
  rawEffectId: string,
  intensity: number
): void {
  if (!imageData || !imageData.data || imageData.width <= 0 || imageData.height <= 0) {
    return;
  }
  const effectId = normalizeEffectId(rawEffectId);
  const t = clamp01(safeClamp(intensity, 0, 100, 100) / 100);
  if (effectId === 'none' || t <= 0) return;

  const { data, width, height } = imageData;
  const needsNeighborhood = effectId === 'dramatic-hdr' || effectId === 'color-punch' || effectId === 'high-contrast';
  const srcCopy = needsNeighborhood ? new Uint8ClampedArray(data) : data;

  for (let y = 0; y < height; y++) {
    const v = height > 1 ? y / (height - 1) : 0.5;
    const yUp = y > 0 ? y - 1 : 0;
    const yDn = y < height - 1 ? y + 1 : height - 1;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (srcCopy[idx + 3] === 0) continue;

      const u = width > 1 ? x / (width - 1) : 0.5;
      const origR = srcCopy[idx] / 255;
      const origG = srcCopy[idx + 1] / 255;
      const origB = srcCopy[idx + 2] / 255;

      let avgR = origR;
      let avgG = origG;
      let avgB = origB;

      if (needsNeighborhood) {
        const xLt = x > 0 ? x - 1 : 0;
        const xRt = x < width - 1 ? x + 1 : width - 1;
        const iU = (yUp * width + x) * 4;
        const iD = (yDn * width + x) * 4;
        const iL = (y * width + xLt) * 4;
        const iR = (y * width + xRt) * 4;
        avgR = (srcCopy[iU] + srcCopy[iD] + srcCopy[iL] + srcCopy[iR]) / (4 * 255);
        avgG = (srcCopy[iU + 1] + srcCopy[iD + 1] + srcCopy[iL + 1] + srcCopy[iR + 1]) / (4 * 255);
        avgB = (srcCopy[iU + 2] + srcCopy[iD + 2] + srcCopy[iL + 2] + srcCopy[iR + 2]) / (4 * 255);
      }

      const [gradedR, gradedG, gradedB] = gradePixel100(
        effectId,
        origR,
        origG,
        origB,
        u,
        v,
        avgR,
        avgG,
        avgB
      );

      // True 0% -> 100% strength interpolation between unaltered original and full graded pixels
      data[idx] = clampByte(clamp01(mixNum(origR, gradedR, t)) * 255);
      data[idx + 1] = clampByte(clamp01(mixNum(origG, gradedG, t)) * 255);
      data[idx + 2] = clampByte(clamp01(mixNum(origB, gradedB, t)) * 255);
    }
  }
}

const GLSL_SHARED_PRELUDE = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uIntensity;
  uniform float uStepW;
  uniform float uStepH;
  varying vec2 vTexCoord;

  float scLuma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  float scCurve1(float v, float strength) {
    float c = clamp(v, 0.0, 1.0);
    float s = c * c * (3.0 - 2.0 * c);
    return mix(c, s, strength);
  }

  vec3 scCurve(vec3 rgb, float strength) {
    vec3 c = clamp(rgb, 0.0, 1.0);
    vec3 s = c * c * (3.0 - 2.0 * c);
    return mix(c, s, strength);
  }

  float scOverlayCh(float base, float blend) {
    return base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
  }

  vec3 scOverlay(vec3 base, vec3 blend, float w) {
    vec3 c = clamp(base, 0.0, 1.0);
    vec3 res = vec3(
      scOverlayCh(c.r, blend.r),
      scOverlayCh(c.g, blend.g),
      scOverlayCh(c.b, blend.b)
    );
    return mix(base, res, w);
  }

  vec3 scSoftLight(vec3 base, vec3 blend, float w) {
    vec3 c = clamp(base, 0.0, 1.0);
    vec3 res = (1.0 - 2.0 * blend) * c * c + 2.0 * blend * c;
    return mix(base, res, w);
  }

  vec3 scScreen(vec3 base, vec3 blend, float w) {
    vec3 res = 1.0 - (1.0 - base) * (1.0 - blend);
    return mix(base, res, w);
  }

  vec3 scSaturation(vec3 rgb, float satDelta) {
    float lum = scLuma(rgb);
    return clamp(mix(vec3(lum), rgb, 1.0 + satDelta), 0.0, 1.0);
  }

  vec3 scVibrance(vec3 rgb, float amt) {
    float maxC = max(rgb.r, max(rgb.g, rgb.b));
    float avg = (rgb.r + rgb.g + rgb.b) / 3.0;
    float w = (1.0 - clamp((maxC - avg) * 2.2, 0.0, 1.0)) * amt;
    return clamp(rgb + (rgb - vec3(avg)) * w, 0.0, 1.0);
  }

  vec3 scSplitTone(vec3 rgb, vec3 shadowCol, vec3 hiCol, float sw, float hw, float balance) {
    float lum = scLuma(rgb);
    float sMask = pow(max(clamp(1.0 - lum + balance, 0.0, 1.0), 0.0001), 1.55) * sw;
    float hMask = pow(max(clamp(lum - balance, 0.0, 1.0), 0.0001), 1.55) * hw;
    vec3 res = scSoftLight(rgb, shadowCol, sMask);
    res = scSoftLight(res, hiCol, hMask);
    return clamp(res, 0.0, 1.0);
  }

  vec3 scHueRotate(vec3 rgb, float deg) {
    float rad = deg * 0.0174532925;
    float cosA = cos(rad);
    float sinA = sin(rad);
    float k = 0.577350269;
    float onem = (1.0 - cosA) / 3.0;
    mat3 m = mat3(
      cosA + onem, onem + k * sinA, onem - k * sinA,
      onem - k * sinA, cosA + onem, onem + k * sinA,
      onem + k * sinA, onem - k * sinA, cosA + onem
    );
    return clamp(m * rgb, 0.0, 1.0);
  }

  float scNoise(vec2 uv) {
    float n = fract(sin(dot(uv, vec2(127.1, 311.7))) * 43758.5453123);
    return n - 0.5;
  }

  vec3 scNeighborAvg(vec2 uv) {
    vec2 dx = vec2(uStepW, 0.0);
    vec2 dy = vec2(0.0, uStepH);
    vec3 sum = texture2D(uTexture, uv + dx).rgb
             + texture2D(uTexture, uv - dx).rgb
             + texture2D(uTexture, uv + dy).rgb
             + texture2D(uTexture, uv - dy).rgb;
    return sum * 0.25;
  }
`;

function buildGlslEffectBody(effectId: string): string {
  switch (effectId) {
    case 'grayscale':
      return `
        float lum = clamp(dot(orig, vec3(0.26, 0.62, 0.12)), 0.0, 1.0);
        float c = scCurve1(lum, 0.62);
        c = clamp((c - 0.5) * 1.18 + 0.5, 0.0, 1.0);
        graded = vec3(c);
      `;
    case 'sepia':
      return `
        float lum = clamp(dot(orig, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
        float c = scCurve1(lum, 0.45);
        graded = clamp(vec3(c * 1.07 + 0.03, c * 0.87 + 0.01, c * 0.63), 0.0, 1.0);
        graded = scSplitTone(graded, vec3(0.22, 0.11, 0.05), vec3(0.98, 0.86, 0.68), 0.70, 0.55, 0.0);
      `;
    case 'color-punch':
      return `
        vec3 nAvg = scNeighborAvg(vTexCoord);
        graded = scVibrance(orig, 0.85);
        graded = scSaturation(graded, 0.34);
        graded = clamp(graded + (orig - nAvg) * 0.38, 0.0, 1.0);
        graded = scCurve(graded, 0.50);
      `;
    case 'vintage-film':
      return `
        graded = scSaturation(orig, -0.26);
        graded = vec3(0.065, 0.055, 0.045) + graded * vec3(0.89, 0.87, 0.82);
        graded = scSplitTone(graded, vec3(0.32, 0.21, 0.12), vec3(0.96, 0.88, 0.72), 0.75, 0.65, 0.0);
        graded = scSoftLight(graded, vec3(0.84, 0.64, 0.45), 0.34);
        graded = clamp(graded + scNoise(vTexCoord * 400.0) * 0.045, 0.0, 1.0);
      `;
    case 'cool-noir':
      return `
        graded = scSaturation(orig, -0.78);
        graded = scCurve(graded, 0.75);
        graded = scSplitTone(graded, vec3(0.06, 0.22, 0.45), vec3(0.72, 0.90, 0.99), 0.95, 0.55, 0.0);
        graded = scOverlay(graded, vec3(0.14, 0.36, 0.64), 0.30);
        vec2 d = (vTexCoord - 0.5) * 1.414;
        float vig = clamp(1.0 - pow(max(length(d), 0.0001), 2.0) * 0.42, 0.0, 1.0);
        graded = clamp(graded * vig, 0.0, 1.0);
      `;
    case 'high-contrast':
      return `
        vec3 nAvg = scNeighborAvg(vTexCoord);
        graded = clamp(orig + (orig - nAvg) * 0.42, 0.0, 1.0);
        graded = scCurve(graded, 0.95);
        graded = clamp((graded - 0.5) * 1.24 + 0.5, 0.0, 1.0);
        graded = scVibrance(graded, 0.22);
      `;
    case 'teal-orange':
      return `
        graded = scVibrance(orig, 0.45);
        graded = scSplitTone(graded, vec3(0.04, 0.54, 0.66), vec3(0.99, 0.58, 0.18), 0.98, 0.95, 0.04);
        float lum = scLuma(graded);
        if (lum < 0.5) {
          graded = scOverlay(graded, vec3(0.06, 0.52, 0.62), 0.42 * (1.0 - lum * 2.0));
        } else {
          graded = scSoftLight(graded, vec3(0.99, 0.56, 0.16), 0.48 * ((lum - 0.5) * 2.0));
        }
        graded = scCurve(graded, 0.58);
      `;
    case 'warm-sunset':
      return `
        graded = clamp(orig * vec3(1.06, 1.01, 0.92) + vec3(0.02, 0.01, 0.0), 0.0, 1.0);
        graded = scVibrance(graded, 0.48);
        graded = scSplitTone(graded, vec3(0.52, 0.16, 0.34), vec3(0.99, 0.74, 0.18), 0.62, 0.92, 0.0);
        graded = scSoftLight(graded, vec3(0.98, 0.58, 0.22), 0.36);
        graded = scCurve(graded, 0.34);
      `;
    case 'cyberpunk-neon':
      return `
        graded = scHueRotate(orig, -18.0);
        graded = scVibrance(graded, 0.92);
        graded = scSaturation(graded, 0.42);
        graded = scCurve(graded, 0.68);
        graded = scSplitTone(graded, vec3(0.78, 0.08, 0.88), vec3(0.06, 0.88, 0.98), 0.98, 0.95, 0.0);
        graded = scOverlay(graded, vec3(0.85, 0.16, 0.92), 0.24);
        graded = scScreen(graded, vec3(0.10, 0.24, 0.34), 0.20);
      `;
    case 'lofi-grain':
      return `
        graded = scSaturation(orig, -0.34);
        graded = vec3(0.085, 0.08, 0.075) + graded * vec3(0.84, 0.83, 0.82);
        graded = scSoftLight(graded, vec3(0.78, 0.64, 0.50), 0.38);
        float gn = scNoise(vTexCoord * 450.0) * 0.14;
        vec2 d = (vTexCoord - 0.5) * 1.414;
        float vig = clamp(1.0 - pow(max(length(d), 0.0001), 1.8) * 0.34, 0.0, 1.0);
        graded = clamp((graded + gn) * vig, 0.0, 1.0);
      `;
    case 'vignette':
      return `
        graded = scCurve(orig, 0.26);
        vec2 d = (vTexCoord - 0.5) * 1.45;
        float dist = clamp(length(d), 0.0, 1.0);
        float vig = clamp(1.0 - pow(max(dist, 0.0001), 1.85) * 0.86, 0.0, 1.0);
        graded = clamp(graded * vig, 0.0, 1.0);
      `;
    case 'invert-colors':
      return `
        graded = scCurve(1.0 - orig, 0.25);
      `;
    case 'duotone':
      return `
        float rawLum = clamp(scLuma(orig), 0.0, 1.0);
        float tLum = scCurve1(rawLum, 0.55);
        if (tLum < 0.5) {
          graded = mix(vec3(0.11, 0.09, 0.34), vec3(0.48, 0.36, 0.96), tLum * 2.0);
        } else {
          graded = mix(vec3(0.48, 0.36, 0.96), vec3(0.42, 0.88, 0.99), (tLum - 0.5) * 2.0);
        }
      `;
    case 'pastel-dream':
      return `
        graded = vec3(
          pow(max(orig.r, 0.0001), 0.80) * 0.90 + 0.08,
          pow(max(orig.g, 0.0001), 0.82) * 0.90 + 0.07,
          pow(max(orig.b, 0.0001), 0.78) * 0.90 + 0.10
        );
        graded = scSaturation(graded, -0.20);
        graded = scSplitTone(graded, vec3(0.82, 0.74, 0.98), vec3(0.99, 0.82, 0.92), 0.65, 0.75, 0.0);
        graded = scScreen(graded, vec3(0.98, 0.78, 0.88), 0.18);
      `;
    case 'retro-polaroid':
      return `
        graded = vec3(0.04, 0.04, 0.05) + orig * vec3(0.96, 0.94, 0.90);
        graded = scCurve(graded, 0.48);
        graded = scSplitTone(graded, vec3(0.06, 0.38, 0.34), vec3(0.99, 0.92, 0.56), 0.78, 0.85, 0.0);
        graded = scSoftLight(graded, vec3(0.98, 0.90, 0.62), 0.32);
        vec2 d = (vTexCoord - 0.5) * 1.4;
        float vig = clamp(1.0 - pow(max(length(d), 0.0001), 2.1) * 0.28, 0.0, 1.0);
        graded = clamp(graded * vig, 0.0, 1.0);
      `;
    case 'matte-fade':
      return `
        graded = scSaturation(orig, -0.28);
        graded = scCurve(graded, 0.32);
        graded = vec3(0.13, 0.135, 0.15) + graded * vec3(0.79, 0.79, 0.78);
        graded = scSplitTone(graded, vec3(0.22, 0.28, 0.38), vec3(0.88, 0.90, 0.95), 0.65, 0.35, 0.0);
      `;
    case 'dramatic-hdr':
      return `
        vec3 nAvg = scNeighborAvg(vTexCoord);
        vec3 detail = (orig - nAvg) * 1.15;
        graded = pow(max(orig, vec3(0.0001)), vec3(0.88));
        graded = clamp(graded + detail, 0.0, 1.0);
        graded = scVibrance(graded, 0.62);
        graded = scCurve(graded, 0.65);
      `;
    default:
      return `graded = orig;`;
  }
}

export type ScribeCompositeEffectProps = {
  effectId: string;
  intensity: number; // 0 to 100
};

/**
 * Custom GPU-accelerated WebGL + 2D Canvas Fabric.js v6 image filter.
 * Executes multi-pass composite grading (split-toning, S-curves, overlay/soft-light,
 * duotone LUTs, local clarity) and interpolates smoothly against unaltered source pixels
 * via uIntensity (0% original -> 100% full effect).
 */
export class ScribeCompositeEffectFilter extends fabric.filters.BaseFilter<
  'ScribeCompositeEffect',
  ScribeCompositeEffectProps
> {
  static type = 'ScribeCompositeEffect';
  static uniformLocations = ['uIntensity', 'uStepW', 'uStepH'];
  static defaults: ScribeCompositeEffectProps = {
    effectId: 'none',
    intensity: 100,
  };

  declare effectId: string;
  declare intensity: number;

  getCacheKey(): string {
    return `${this.type}_${normalizeEffectId(this.effectId || 'none')}`;
  }

  isNeutralState(): boolean {
    return normalizeEffectId(this.effectId || 'none') === 'none' || this.intensity <= 0;
  }

  getFragmentSource(): string {
    const normalized = normalizeEffectId(this.effectId || 'none');
    return `
      ${GLSL_SHARED_PRELUDE}
      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        if (color.a <= 0.0) {
          gl_FragColor = color;
          return;
        }
        vec3 orig = color.rgb;
        vec3 graded = orig;
        ${buildGlslEffectBody(normalized)}
        vec3 finalRgb = clamp(mix(orig, graded, clamp(uIntensity, 0.0, 1.0)), 0.0, 1.0);
        gl_FragColor = vec4(finalRgb, color.a);
      }
    `;
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation | null>
  ): void {
    const t = clamp01((typeof this.intensity === 'number' ? this.intensity : 100) / 100);
    if (uniformLocations.uIntensity) {
      gl.uniform1f(uniformLocations.uIntensity, t);
    }
  }

  applyTo2d(options: { imageData: ImageData }): void {
    applyCompositeEffectToImageData(options.imageData, this.effectId, this.intensity);
  }

  toObject(): {
    type: 'ScribeCompositeEffect';
    effectId: string;
    intensity: number;
  } {
    return {
      type: 'ScribeCompositeEffect',
      effectId: normalizeEffectId(this.effectId || 'none'),
      intensity: typeof this.intensity === 'number' ? this.intensity : 100,
    };
  }
}

try {
  fabric.classRegistry.setClass(ScribeCompositeEffectFilter);
} catch {
  // Safe guard in SSR / test runtimes
}

/**
 * Creates a clean, independent clone of an ImageData buffer so source pixels are never mutated.
 */
export function cloneImageData(source: ImageData): ImageData {
  const w = Math.max(1, Math.floor(safeFinite(source?.width, 1)));
  const h = Math.max(1, Math.floor(safeFinite(source?.height, 1)));
  const copy = source?.data
    ? new Uint8ClampedArray(source.data)
    : new Uint8ClampedArray(w * h * 4);
  if (typeof ImageData !== 'undefined') {
    try {
      return new ImageData(copy, w, h);
    } catch {
      // Fallback for synthetic test ImageData environments
    }
  }
  return {
    data: copy,
    width: w,
    height: h,
    colorSpace: source?.colorSpace || 'srgb',
  } as ImageData;
}

/**
 * Generates an SVG <feConvolveMatrix> filter markup string for 3x3 unsharp-mask edge sharpening.
 */
export function buildSharpenSvgFilterMarkup(
  sharpenPct: number,
  filterId: string = 'scribe-sharpen-filter'
): string {
  const s = safeClamp(sharpenPct, 0, 100, 0) / 100;
  const k = Number((s * 0.4).toFixed(4));
  const center = Number((1 + 4 * k).toFixed(4));
  const matrix = `0 ${-k} 0 ${-k} ${center} ${-k} 0 ${-k} 0`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><defs><filter id="${filterId}"><feConvolveMatrix order="3" kernelMatrix="${matrix}" preserveAlpha="true" /></filter></defs></svg>`;
}

export type TonalColorProps = {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  shadows: number;
  temperature: number;
  hueRotate: number;
};

export type SharpenProps = {
  sharpen: number;
};

export type VignetteProps = {
  vignette: number;
};

export type StudioAdjustmentsProps = TonalColorProps & SharpenProps & VignetteProps;

/**
 * STAGE 1 (Base Tonal & Color Adjustments):
 * Exposure/Highlights -> Shadows -> Brightness -> Contrast -> Temperature/Warmth -> Saturation -> Hue Rotate.
 * Guarded against NaN, division by zero, and clamped strictly [0..255].
 */
export function applyTonalColorToImageData(
  imageData: ImageData,
  adj: TonalColorProps
): void {
  if (!imageData || !imageData.data || imageData.width <= 0 || imageData.height <= 0) {
    return;
  }

  const exposure = safeClamp(adj.exposure, -100, 100, 0);
  const shadows = safeClamp(adj.shadows, -100, 100, 0);
  const brightness = safeClamp(adj.brightness, -100, 100, 0);
  const contrast = safeClamp(adj.contrast, -100, 100, 0);
  const temperature = safeClamp(adj.temperature, -100, 100, 0);
  const saturation = safeClamp(adj.saturation, -100, 100, 0);
  const hueRotate = safeClamp(adj.hueRotate, 0, 360, 0);

  const hasExposure = exposure !== 0;
  const hasShadows = shadows !== 0;
  const hasBrightness = brightness !== 0;
  const hasContrast = contrast !== 0;
  const hasTemp = temperature !== 0;
  const hasSaturation = saturation !== 0;
  const hasHue = hueRotate > 0 && hueRotate < 360;

  if (
    !hasExposure &&
    !hasShadows &&
    !hasBrightness &&
    !hasContrast &&
    !hasTemp &&
    !hasSaturation &&
    !hasHue
  ) {
    return;
  }

  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const bShift = (brightness / 100) * 0.45;
  const cNorm = contrast / 100;
  const cFactor = (1 + cNorm) / Math.max(0.05, 1 - 0.75 * cNorm);
  const satDelta = saturation / 100;
  const evMult = Math.pow(2, (exposure / 100) * 1.35);
  const expHi = exposure / 100;
  const shadAmt = shadows / 100;
  const tempAmt = temperature / 100;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    if (data[idx + 3] === 0) continue;

    let r = clamp01(data[idx] / 255);
    let g = clamp01(data[idx + 1] / 255);
    let b = clamp01(data[idx + 2] / 255);

    // 1. Exposure & Highlights
    if (hasExposure) {
      const lumPre = clamp01(luma(r, g, b));
      const hiWeight = Math.pow(lumPre, 1.4);
      r = clamp01(r * evMult + hiWeight * expHi * 0.14);
      g = clamp01(g * evMult + hiWeight * expHi * 0.14);
      b = clamp01(b * evMult + hiWeight * expHi * 0.14);
    }

    // 2. Shadows recovery / deepening
    if (hasShadows) {
      const lumShad = clamp01(luma(r, g, b));
      const sMask = Math.pow(clamp01(1 - lumShad), 2.0);
      if (shadAmt > 0) {
        const lift = sMask * shadAmt * 0.55;
        r = clamp01(r + lift * (1 - r));
        g = clamp01(g + lift * (1 - g));
        b = clamp01(b + lift * (1 - b));
      } else {
        const deepen = Math.max(0.1, 1 - sMask * (-shadAmt) * 0.72);
        r = clamp01(r * deepen);
        g = clamp01(g * deepen);
        b = clamp01(b * deepen);
      }
    }

    // 3. Brightness
    if (hasBrightness) {
      r = clamp01(r + bShift);
      g = clamp01(g + bShift);
      b = clamp01(b + bShift);
    }

    // 4. Contrast
    if (hasContrast) {
      r = clamp01((r - 0.5) * cFactor + 0.5);
      g = clamp01((g - 0.5) * cFactor + 0.5);
      b = clamp01((b - 0.5) * cFactor + 0.5);
    }

    // 5. Temperature / Warmth
    if (hasTemp) {
      r = clamp01(r + tempAmt * 0.2);
      g = clamp01(g + tempAmt * 0.04);
      b = clamp01(b - tempAmt * 0.22);
    }

    // 6. Saturation
    if (hasSaturation) {
      [r, g, b] = adjustSaturationRgb(r, g, b, satDelta);
    }

    // 7. Hue Rotate
    if (hasHue) {
      [r, g, b] = hueRotateRgb(r, g, b, hueRotate);
    }

    data[idx] = clampByte(r * 255);
    data[idx + 1] = clampByte(g * 255);
    data[idx + 2] = clampByte(b * 255);
  }
}

/**
 * STAGE 2a (Spatial Detail — Blur):
 * Fast separable 2-pass box blur on ImageData using an isolated temporary buffer.
 */
export function applyBlurToImageData(
  imageData: ImageData,
  blurPx: number
): void {
  if (!imageData || !imageData.data || imageData.width <= 0 || imageData.height <= 0) {
    return;
  }
  const safePx = safeClamp(blurPx, 0, 40, 0);
  if (safePx <= 0) return;

  const radius = Math.max(1, Math.min(20, Math.round(safePx * 0.5)));
  const { data, width, height } = imageData;
  const horiz = new Uint8ClampedArray(data.length);

  // Horizontal pass reading original data -> horiz
  for (let y = 0; y < height; y++) {
    const rowOff = y * width;
    for (let x = 0; x < width; x++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;
      const xStart = Math.max(0, x - radius);
      const xEnd = Math.min(width - 1, x + radius);
      for (let kx = xStart; kx <= xEnd; kx++) {
        const idx = (rowOff + kx) * 4;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
        aSum += data[idx + 3];
        count++;
      }
      const outIdx = (rowOff + x) * 4;
      const inv = count > 0 ? 1 / count : 1;
      horiz[outIdx] = clampByte(rSum * inv);
      horiz[outIdx + 1] = clampByte(gSum * inv);
      horiz[outIdx + 2] = clampByte(bSum * inv);
      horiz[outIdx + 3] = clampByte(aSum * inv);
    }
  }

  // Vertical pass reading horiz -> data
  for (let y = 0; y < height; y++) {
    const yStart = Math.max(0, y - radius);
    const yEnd = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;
      for (let ky = yStart; ky <= yEnd; ky++) {
        const idx = (ky * width + x) * 4;
        rSum += horiz[idx];
        gSum += horiz[idx + 1];
        bSum += horiz[idx + 2];
        aSum += horiz[idx + 3];
        count++;
      }
      const outIdx = (y * width + x) * 4;
      const inv = count > 0 ? 1 / count : 1;
      data[outIdx] = clampByte(rSum * inv);
      data[outIdx + 1] = clampByte(gSum * inv);
      data[outIdx + 2] = clampByte(bSum * inv);
      data[outIdx + 3] = clampByte(aSum * inv);
    }
  }
}

/**
 * STAGE 2b (Spatial Detail — 3x3 Unsharp-Mask Sharpen Convolution):
 * Copies pixel buffer before reading neighbors so convolution never mutates input reads.
 */
export function applySharpenToImageData(
  imageData: ImageData,
  sharpenPct: number
): void {
  if (!imageData || !imageData.data || imageData.width <= 0 || imageData.height <= 0) {
    return;
  }
  const s = safeClamp(sharpenPct, 0, 100, 0) / 100;
  if (s <= 0) return;

  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  const k = s * 0.4;
  const centerWeight = 1 + 4 * k;

  for (let y = 0; y < height; y++) {
    const yUp = y > 0 ? y - 1 : 0;
    const yDn = y < height - 1 ? y + 1 : height - 1;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (src[idx + 3] === 0) continue;

      const xLt = x > 0 ? x - 1 : 0;
      const xRt = x < width - 1 ? x + 1 : width - 1;

      const iU = (yUp * width + x) * 4;
      const iD = (yDn * width + x) * 4;
      const iL = (y * width + xLt) * 4;
      const iR = (y * width + xRt) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          src[idx + c] * centerWeight -
          k * (src[iU + c] + src[iD + c] + src[iL + c] + src[iR + c]);
        data[idx + c] = clampByte(val);
      }
    }
  }
}

/**
 * STAGE 4a (Framing — Radial Vignette):
 * Smooth radial edge darkening applied deterministically after stylistic quantization.
 */
export function applyVignetteToImageData(
  imageData: ImageData,
  vignettePct: number
): void {
  if (!imageData || !imageData.data || imageData.width <= 0 || imageData.height <= 0) {
    return;
  }
  const safeVig = safeClamp(vignettePct, 0, 100, 0);
  if (safeVig <= 0) return;

  const { data, width, height } = imageData;
  const vigAmt = (safeVig / 100) * 0.92;

  for (let y = 0; y < height; y++) {
    const v = height > 1 ? y / (height - 1) : 0.5;
    const dy = (v - 0.5) * 1.42;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] === 0) continue;
      const u = width > 1 ? x / (width - 1) : 0.5;
      const dx = (u - 0.5) * 1.42;
      const dist = clamp01(Math.sqrt(dx * dx + dy * dy));
      const vig = clamp01(1 - Math.pow(dist, 1.85) * vigAmt);
      data[idx] = clampByte(data[idx] * vig);
      data[idx + 1] = clampByte(data[idx + 1] * vig);
      data[idx + 2] = clampByte(data[idx + 2] * vig);
    }
  }
}

/**
 * Applies Stage 1 (Tonal/Color) -> Stage 2 (Sharpen) -> Stage 4 (Vignette) onto target ImageData.
 */
export function applyStudioAdjustmentsToImageData(
  imageData: ImageData,
  adj: StudioAdjustmentsProps
): void {
  applyTonalColorToImageData(imageData, adj);
  applySharpenToImageData(imageData, adj.sharpen);
  applyVignetteToImageData(imageData, adj.vignette);
}

const BAYER_4X4_THRESHOLDS = [
  0 / 16, 8 / 16, 2 / 16, 10 / 16,
  12 / 16, 4 / 16, 14 / 16, 6 / 16,
  3 / 16, 11 / 16, 1 / 16, 9 / 16,
  15 / 16, 7 / 16, 13 / 16, 5 / 16,
];

/**
 * STAGE 3 (Stylistic Quantization — Dither):
 * Pure pixel-array retro halftone dithering (Floyd-Steinberg Error Diffusion
 * or Ordered Bayer 4x4 Matrix). Strictly bypassed when intensity <= 0; crisp 0/255 output.
 */
export function applyDitherToPixelBuffer(
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  mode: DitherAlgorithm,
  intensityPct: number
): void {
  const safeW = Math.floor(safeFinite(width, 0));
  const safeH = Math.floor(safeFinite(height, 0));
  const clampedIntensity = safeClamp(intensityPct, 0, 100, 0);
  if (clampedIntensity <= 0 || safeW <= 0 || safeH <= 0 || !pixels || pixels.length < safeW * safeH * 4) {
    return;
  }

  const t = clampedIntensity / 100;
  // Clean monotonic threshold curve across 1..100 while preserving razor-sharp 0/255 dots
  const threshold = 0.78 - 0.52 * t;

  if (mode === 'bayer-4x4') {
    for (let y = 0; y < safeH; y++) {
      const rowMod = (y & 3) * 4;
      for (let x = 0; x < safeW; x++) {
        const idx = (y * safeW + x) * 4;
        if (pixels[idx + 3] === 0) continue;
        const lum =
          (0.2126 * pixels[idx] + 0.7152 * pixels[idx + 1] + 0.0722 * pixels[idx + 2]) / 255;
        const bayerBias = (BAYER_4X4_THRESHOLDS[rowMod + (x & 3)] + 0.03125 - 0.5) * 0.68;
        const outVal = lum + bayerBias >= threshold ? 255 : 0;
        pixels[idx] = outVal;
        pixels[idx + 1] = outVal;
        pixels[idx + 2] = outVal;
      }
    }
    return;
  }

  // Floyd-Steinberg Error Diffusion using Float32Array luminance buffer
  const total = safeW * safeH;
  const lumBuf = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    lumBuf[i] = clamp01(
      (0.2126 * pixels[idx] + 0.7152 * pixels[idx + 1] + 0.0722 * pixels[idx + 2]) / 255
    );
  }

  for (let y = 0; y < safeH; y++) {
    const rowOff = y * safeW;
    for (let x = 0; x < safeW; x++) {
      const p = rowOff + x;
      const idx = p * 4;
      if (pixels[idx + 3] === 0) continue;

      const oldVal = lumBuf[p];
      const newVal = oldVal >= threshold ? 1.0 : 0.0;
      const err = oldVal - newVal;

      const outByte = newVal > 0.5 ? 255 : 0;
      pixels[idx] = outByte;
      pixels[idx + 1] = outByte;
      pixels[idx + 2] = outByte;

      if (x + 1 < safeW) {
        lumBuf[p + 1] += err * (7 / 16);
      }
      if (y + 1 < safeH) {
        const nextRow = p + safeW;
        if (x > 0) lumBuf[nextRow - 1] += err * (3 / 16);
        lumBuf[nextRow] += err * (5 / 16);
        if (x + 1 < safeW) lumBuf[nextRow + 1] += err * (1 / 16);
      }
    }
  }
}

export function applyDitherToImageData(
  imageData: ImageData,
  intensityPct: number,
  mode: DitherAlgorithm
): void {
  if (!imageData || !imageData.data) return;
  applyDitherToPixelBuffer(
    imageData.data,
    imageData.width,
    imageData.height,
    mode,
    intensityPct
  );
}

/**
 * Safely reads pixel ImageData from a 2D context without throwing on cross-origin tainted canvases.
 */
export function safeGetImageData(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): ImageData | null {
  const w = Math.max(1, Math.floor(safeFinite(width, 0)));
  const h = Math.max(1, Math.floor(safeFinite(height, 0)));
  if (w <= 0 || h <= 0) return null;
  try {
    return ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }
}

/**
 * Ensures external image sources use crossOrigin="anonymous" when applicable without mutating data/blob URIs.
 */
export function ensureCrossOriginAnonymous(el: unknown): void {
  if (typeof HTMLImageElement === 'undefined' || !(el instanceof HTMLImageElement)) {
    return;
  }
  const src = el.getAttribute('src') || el.src || '';
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
  if (el.crossOrigin !== 'anonymous') {
    try {
      el.crossOrigin = 'anonymous';
    } catch {
      // Read-only in some environments
    }
  }
}

/**
 * Executes the complete non-mutating 4-stage deterministic filter pipeline on a fresh clone
 * of `sourceImageData` without modifying the original baseline pixels:
 *   0. Optional composite Effect preset
 *   1. Stage 1: Base tonal & color adjustments (Exposure, Shadows, Brightness, Contrast, Temperature, Saturation, Hue)
 *   2. Stage 2: Spatial detail & edge controls (Blur, Sharpen 3x3 convolution)
 *   3. Stage 3: Stylistic quantization (Dither Bayer 4x4 or Floyd-Steinberg, bypassed at 0)
 *   4. Stage 4: Framing (Vignette)
 */
export function renderDeterministicFilterPipelineOnImageData(
  sourceImageData: ImageData,
  rawEffectId: string,
  effectIntensity: number,
  rawFilters: Partial<FilterSliderState>
): ImageData {
  const out = cloneImageData(sourceImageData);
  const filters = normalizeFilterSliders(rawFilters);
  const effectId = normalizeEffectId(rawEffectId || 'none');
  const safeEffectIntensity = safeClamp(effectIntensity, 0, 100, 100);

  if (effectId !== 'none' && safeEffectIntensity > 0) {
    applyCompositeEffectToImageData(out, effectId, safeEffectIntensity);
  }

  // Stage 1: Base tonal & color adjustments
  applyTonalColorToImageData(out, filters);

  // Stage 2: Spatial detail & edge controls
  if (filters.blur > 0) {
    applyBlurToImageData(out, filters.blur);
  }
  if (filters.sharpen > 0) {
    applySharpenToImageData(out, filters.sharpen);
  }

  // Stage 3: Stylistic quantization (Dither)
  if (filters.ditherIntensity > 0) {
    applyDitherToImageData(out, filters.ditherIntensity, filters.ditherMode);
  }

  // Stage 4: Framing (Vignette)
  if (filters.vignette > 0) {
    applyVignetteToImageData(out, filters.vignette);
  }

  return out;
}

/**
 * Offscreen HTML5 Canvas helper that sizes to exact source pixel dimensions (avoiding aspect
 * distortion or stale sizing), guards against CORS/tainted canvas reads, and executes a non-mutating
 * deterministic filter render.
 */
export function renderDeterministicFilterPipelineOnCanvas(
  source: HTMLCanvasElement | HTMLImageElement,
  rawEffectId: string,
  effectIntensity: number,
  rawFilters: Partial<FilterSliderState>
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  const naturalW =
    source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
  const naturalH =
    source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;
  const w = Math.max(1, Math.round(safeFinite(naturalW, 1)));
  const h = Math.max(1, Math.round(safeFinite(naturalH, 1)));

  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx) return out;

  ensureCrossOriginAnonymous(source);

  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
  } catch {
    return out;
  }

  const baseImgData = safeGetImageData(ctx, w, h);
  if (!baseImgData) {
    return out;
  }

  const filtered = renderDeterministicFilterPipelineOnImageData(
    baseImgData,
    rawEffectId,
    effectIntensity,
    rawFilters
  );
  ctx.putImageData(filtered, 0, 0);
  return out;
}

/**
 * Offscreen HTML5 Canvas helper for standalone Dither processing on any canvas/source element.
 */
export function applyDitherOnOffscreenCanvas(
  sourceCanvas: HTMLCanvasElement,
  intensityPct: number,
  mode: DitherAlgorithm
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  const w = Math.max(1, Math.round(safeFinite(sourceCanvas?.width, 1)));
  const h = Math.max(1, Math.round(safeFinite(sourceCanvas?.height, 1)));
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx || !sourceCanvas) return out;
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
  } catch {
    return out;
  }
  const imgData = safeGetImageData(ctx, w, h);
  if (!imgData) return out;
  applyDitherToImageData(imgData, intensityPct, mode);
  ctx.putImageData(imgData, 0, 0);
  return out;
}

/**
 * STAGE 1 Fabric Filter (Base Tonal & Color Adjustments):
 * Exposure, Shadows, Brightness, Contrast, Temperature, Saturation, Hue Rotate.
 */
export class ScribeTonalColorFilter extends fabric.filters.BaseFilter<
  'ScribeTonalColor',
  TonalColorProps
> {
  static type = 'ScribeTonalColor';
  static uniformLocations = [
    'uBrightness',
    'uContrast',
    'uSaturation',
    'uExposure',
    'uShadows',
    'uTemperature',
    'uHueRotate',
  ];
  static defaults: TonalColorProps = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    shadows: 0,
    temperature: 0,
    hueRotate: 0,
  };

  declare brightness: number;
  declare contrast: number;
  declare saturation: number;
  declare exposure: number;
  declare shadows: number;
  declare temperature: number;
  declare hueRotate: number;

  isNeutralState(): boolean {
    const hue = safeClamp(this.hueRotate, 0, 360, 0);
    return (
      safeFinite(this.brightness, 0) === 0 &&
      safeFinite(this.contrast, 0) === 0 &&
      safeFinite(this.saturation, 0) === 0 &&
      safeFinite(this.exposure, 0) === 0 &&
      safeFinite(this.shadows, 0) === 0 &&
      safeFinite(this.temperature, 0) === 0 &&
      (hue === 0 || hue === 360)
    );
  }

  getFragmentSource(): string {
    return `
      ${GLSL_SHARED_PRELUDE}
      uniform float uBrightness;
      uniform float uContrast;
      uniform float uSaturation;
      uniform float uExposure;
      uniform float uShadows;
      uniform float uTemperature;
      uniform float uHueRotate;

      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        if (color.a <= 0.0) {
          gl_FragColor = color;
          return;
        }

        vec3 rgb = clamp(color.rgb, 0.0, 1.0);

        if (abs(uExposure) > 0.0001) {
          float evMult = pow(2.0, uExposure * 1.35);
          float hiWeight = pow(clamp(scLuma(rgb), 0.0, 1.0), 1.4);
          rgb = clamp(rgb * evMult + vec3(hiWeight * uExposure * 0.14), 0.0, 1.0);
        }

        if (abs(uShadows) > 0.0001) {
          float lumShad = scLuma(rgb);
          float sMask = pow(clamp(1.0 - lumShad, 0.0, 1.0), 2.0);
          if (uShadows > 0.0) {
            float lift = sMask * uShadows * 0.55;
            rgb = clamp(rgb + lift * (1.0 - rgb), 0.0, 1.0);
          } else {
            float deepen = max(0.1, 1.0 - sMask * (-uShadows) * 0.72);
            rgb = clamp(rgb * deepen, 0.0, 1.0);
          }
        }

        if (abs(uBrightness) > 0.0001) {
          rgb = clamp(rgb + vec3(uBrightness * 0.45), 0.0, 1.0);
        }

        if (abs(uContrast) > 0.0001) {
          float cFactor = (1.0 + uContrast) / max(0.05, 1.0 - 0.75 * uContrast);
          rgb = clamp((rgb - 0.5) * cFactor + 0.5, 0.0, 1.0);
        }

        if (abs(uTemperature) > 0.0001) {
          rgb = clamp(rgb + vec3(uTemperature * 0.20, uTemperature * 0.04, -uTemperature * 0.22), 0.0, 1.0);
        }

        if (abs(uSaturation) > 0.0001) {
          rgb = scSaturation(rgb, uSaturation);
        }

        if (uHueRotate > 0.001 && uHueRotate < 359.999) {
          rgb = scHueRotate(rgb, uHueRotate);
        }

        gl_FragColor = vec4(rgb, color.a);
      }
    `;
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation | null>
  ): void {
    const setF = (name: string, val: number) => {
      if (uniformLocations[name]) gl.uniform1f(uniformLocations[name], safeFinite(val, 0));
    };
    setF('uBrightness', safeClamp(this.brightness, -100, 100, 0) / 100);
    setF('uContrast', safeClamp(this.contrast, -100, 100, 0) / 100);
    setF('uSaturation', safeClamp(this.saturation, -100, 100, 0) / 100);
    setF('uExposure', safeClamp(this.exposure, -100, 100, 0) / 100);
    setF('uShadows', safeClamp(this.shadows, -100, 100, 0) / 100);
    setF('uTemperature', safeClamp(this.temperature, -100, 100, 0) / 100);
    setF('uHueRotate', safeClamp(this.hueRotate, 0, 360, 0));
  }

  applyTo2d(options: { imageData: ImageData }): void {
    applyTonalColorToImageData(options.imageData, {
      brightness: safeClamp(this.brightness, -100, 100, 0),
      contrast: safeClamp(this.contrast, -100, 100, 0),
      saturation: safeClamp(this.saturation, -100, 100, 0),
      exposure: safeClamp(this.exposure, -100, 100, 0),
      shadows: safeClamp(this.shadows, -100, 100, 0),
      temperature: safeClamp(this.temperature, -100, 100, 0),
      hueRotate: safeClamp(this.hueRotate, 0, 360, 0),
    });
  }

  toObject(): { type: 'ScribeTonalColor' } & TonalColorProps {
    return {
      type: 'ScribeTonalColor',
      brightness: safeClamp(this.brightness, -100, 100, 0),
      contrast: safeClamp(this.contrast, -100, 100, 0),
      saturation: safeClamp(this.saturation, -100, 100, 0),
      exposure: safeClamp(this.exposure, -100, 100, 0),
      shadows: safeClamp(this.shadows, -100, 100, 0),
      temperature: safeClamp(this.temperature, -100, 100, 0),
      hueRotate: safeClamp(this.hueRotate, 0, 360, 0),
    };
  }
}

/**
 * STAGE 2b Fabric Filter (Spatial Detail — 3x3 Unsharp-Mask Convolution Sharpen).
 */
export class ScribeSharpenFilter extends fabric.filters.BaseFilter<
  'ScribeSharpen',
  SharpenProps
> {
  static type = 'ScribeSharpen';
  static uniformLocations = ['uSharpen', 'uStepW', 'uStepH'];
  static defaults: SharpenProps = { sharpen: 0 };

  declare sharpen: number;

  isNeutralState(): boolean {
    return safeClamp(this.sharpen, 0, 100, 0) <= 0;
  }

  getFragmentSource(): string {
    return `
      ${GLSL_SHARED_PRELUDE}
      uniform float uSharpen;

      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        if (color.a <= 0.0 || uSharpen <= 0.0) {
          gl_FragColor = color;
          return;
        }
        vec3 nAvg = scNeighborAvg(vTexCoord);
        vec3 sharpened = clamp(color.rgb + (color.rgb - nAvg) * (uSharpen * 1.6), 0.0, 1.0);
        gl_FragColor = vec4(sharpened, color.a);
      }
    `;
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation | null>
  ): void {
    const s = safeClamp(this.sharpen, 0, 100, 0) / 100;
    if (uniformLocations.uSharpen) gl.uniform1f(uniformLocations.uSharpen, s);
  }

  applyTo2d(options: { imageData: ImageData }): void {
    applySharpenToImageData(options.imageData, safeClamp(this.sharpen, 0, 100, 0));
  }

  toObject(): { type: 'ScribeSharpen' } & SharpenProps {
    return {
      type: 'ScribeSharpen',
      sharpen: safeClamp(this.sharpen, 0, 100, 0),
    };
  }
}

/**
 * STAGE 4a Fabric Filter (Framing — Smooth Radial Vignette after quantization).
 */
export class ScribeVignetteFilter extends fabric.filters.BaseFilter<
  'ScribeVignette',
  VignetteProps
> {
  static type = 'ScribeVignette';
  static uniformLocations = ['uVignette'];
  static defaults: VignetteProps = { vignette: 0 };

  declare vignette: number;

  isNeutralState(): boolean {
    return safeClamp(this.vignette, 0, 100, 0) <= 0;
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uVignette;
      varying vec2 vTexCoord;

      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        if (color.a <= 0.0 || uVignette <= 0.0001) {
          gl_FragColor = color;
          return;
        }
        vec2 d = (vTexCoord - 0.5) * 1.42;
        float dist = clamp(length(d), 0.0, 1.0);
        float vig = clamp(1.0 - pow(max(dist, 0.0001), 1.85) * (uVignette * 0.92), 0.0, 1.0);
        gl_FragColor = vec4(clamp(color.rgb * vig, 0.0, 1.0), color.a);
      }
    `;
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation | null>
  ): void {
    const v = safeClamp(this.vignette, 0, 100, 0) / 100;
    if (uniformLocations.uVignette) gl.uniform1f(uniformLocations.uVignette, v);
  }

  applyTo2d(options: { imageData: ImageData }): void {
    applyVignetteToImageData(options.imageData, safeClamp(this.vignette, 0, 100, 0));
  }

  toObject(): { type: 'ScribeVignette' } & VignetteProps {
    return {
      type: 'ScribeVignette',
      vignette: safeClamp(this.vignette, 0, 100, 0),
    };
  }
}

/**
 * Combined StudioAdjustments Fabric filter preserved for backwards-compatibility.
 */
export class ScribeStudioAdjustmentsFilter extends fabric.filters.BaseFilter<
  'ScribeStudioAdjustments',
  StudioAdjustmentsProps
> {
  static type = 'ScribeStudioAdjustments';
  static uniformLocations = [
    'uBrightness',
    'uContrast',
    'uSaturation',
    'uExposure',
    'uShadows',
    'uTemperature',
    'uHueRotate',
    'uSharpen',
    'uVignette',
  ];
  static defaults: StudioAdjustmentsProps = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    shadows: 0,
    temperature: 0,
    hueRotate: 0,
    sharpen: 0,
    vignette: 0,
  };

  declare brightness: number;
  declare contrast: number;
  declare saturation: number;
  declare exposure: number;
  declare shadows: number;
  declare temperature: number;
  declare hueRotate: number;
  declare sharpen: number;
  declare vignette: number;

  isNeutralState(): boolean {
    const hue = safeClamp(this.hueRotate, 0, 360, 0);
    return (
      safeFinite(this.brightness, 0) === 0 &&
      safeFinite(this.contrast, 0) === 0 &&
      safeFinite(this.saturation, 0) === 0 &&
      safeFinite(this.exposure, 0) === 0 &&
      safeFinite(this.shadows, 0) === 0 &&
      safeFinite(this.temperature, 0) === 0 &&
      (hue === 0 || hue === 360) &&
      safeClamp(this.sharpen, 0, 100, 0) === 0 &&
      safeClamp(this.vignette, 0, 100, 0) === 0
    );
  }

  getFragmentSource(): string {
    return `
      ${GLSL_SHARED_PRELUDE}
      uniform float uBrightness;
      uniform float uContrast;
      uniform float uSaturation;
      uniform float uExposure;
      uniform float uShadows;
      uniform float uTemperature;
      uniform float uHueRotate;
      uniform float uSharpen;
      uniform float uVignette;

      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        if (color.a <= 0.0) {
          gl_FragColor = color;
          return;
        }

        vec3 rgb = color.rgb;

        if (abs(uExposure) > 0.0001) {
          float evMult = pow(2.0, uExposure * 1.35);
          float hiWeight = pow(clamp(scLuma(rgb), 0.0, 1.0), 1.4);
          rgb = clamp(rgb * evMult + vec3(hiWeight * uExposure * 0.14), 0.0, 1.0);
        }

        if (abs(uShadows) > 0.0001) {
          float lumShad = scLuma(rgb);
          float sMask = pow(clamp(1.0 - lumShad, 0.0, 1.0), 2.0);
          if (uShadows > 0.0) {
            float lift = sMask * uShadows * 0.55;
            rgb = clamp(rgb + lift * (1.0 - rgb), 0.0, 1.0);
          } else {
            float deepen = max(0.1, 1.0 - sMask * (-uShadows) * 0.72);
            rgb = clamp(rgb * deepen, 0.0, 1.0);
          }
        }

        if (abs(uBrightness) > 0.0001) {
          rgb = clamp(rgb + vec3(uBrightness * 0.45), 0.0, 1.0);
        }

        if (abs(uContrast) > 0.0001) {
          float cFactor = (1.0 + uContrast) / max(0.05, 1.0 - 0.75 * uContrast);
          rgb = clamp((rgb - 0.5) * cFactor + 0.5, 0.0, 1.0);
        }

        if (abs(uTemperature) > 0.0001) {
          rgb = clamp(rgb + vec3(uTemperature * 0.20, uTemperature * 0.04, -uTemperature * 0.22), 0.0, 1.0);
        }

        if (abs(uSaturation) > 0.0001) {
          rgb = scSaturation(rgb, uSaturation);
        }

        if (uHueRotate > 0.001 && uHueRotate < 359.999) {
          rgb = scHueRotate(rgb, uHueRotate);
        }

        if (uSharpen > 0.0) {
          vec3 nAvg = scNeighborAvg(vTexCoord);
          rgb = clamp(rgb + (rgb - nAvg) * (uSharpen * 1.6), 0.0, 1.0);
        }

        if (uVignette > 0.0001) {
          vec2 d = (vTexCoord - 0.5) * 1.42;
          float dist = clamp(length(d), 0.0, 1.0);
          float vig = clamp(1.0 - pow(max(dist, 0.0001), 1.85) * (uVignette * 0.92), 0.0, 1.0);
          rgb = clamp(rgb * vig, 0.0, 1.0);
        }

        gl_FragColor = vec4(rgb, color.a);
      }
    `;
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation | null>
  ): void {
    const setF = (name: string, val: number) => {
      if (uniformLocations[name]) gl.uniform1f(uniformLocations[name], safeFinite(val, 0));
    };
    setF('uBrightness', safeClamp(this.brightness, -100, 100, 0) / 100);
    setF('uContrast', safeClamp(this.contrast, -100, 100, 0) / 100);
    setF('uSaturation', safeClamp(this.saturation, -100, 100, 0) / 100);
    setF('uExposure', safeClamp(this.exposure, -100, 100, 0) / 100);
    setF('uShadows', safeClamp(this.shadows, -100, 100, 0) / 100);
    setF('uTemperature', safeClamp(this.temperature, -100, 100, 0) / 100);
    setF('uHueRotate', safeClamp(this.hueRotate, 0, 360, 0));
    setF('uSharpen', safeClamp(this.sharpen, 0, 100, 0) / 100);
    setF('uVignette', safeClamp(this.vignette, 0, 100, 0) / 100);
  }

  applyTo2d(options: { imageData: ImageData }): void {
    applyStudioAdjustmentsToImageData(options.imageData, {
      brightness: safeClamp(this.brightness, -100, 100, 0),
      contrast: safeClamp(this.contrast, -100, 100, 0),
      saturation: safeClamp(this.saturation, -100, 100, 0),
      exposure: safeClamp(this.exposure, -100, 100, 0),
      shadows: safeClamp(this.shadows, -100, 100, 0),
      temperature: safeClamp(this.temperature, -100, 100, 0),
      hueRotate: safeClamp(this.hueRotate, 0, 360, 0),
      sharpen: safeClamp(this.sharpen, 0, 100, 0),
      vignette: safeClamp(this.vignette, 0, 100, 0),
    });
  }

  toObject(): { type: 'ScribeStudioAdjustments' } & StudioAdjustmentsProps {
    return {
      type: 'ScribeStudioAdjustments',
      brightness: safeClamp(this.brightness, -100, 100, 0),
      contrast: safeClamp(this.contrast, -100, 100, 0),
      saturation: safeClamp(this.saturation, -100, 100, 0),
      exposure: safeClamp(this.exposure, -100, 100, 0),
      shadows: safeClamp(this.shadows, -100, 100, 0),
      temperature: safeClamp(this.temperature, -100, 100, 0),
      hueRotate: safeClamp(this.hueRotate, 0, 360, 0),
      sharpen: safeClamp(this.sharpen, 0, 100, 0),
      vignette: safeClamp(this.vignette, 0, 100, 0),
    };
  }
}

export type ScribeDitherProps = {
  intensity: number; // 0 to 100
  mode: DitherAlgorithm;
};

/**
 * STAGE 3 Fabric Filter (Stylistic Quantization — Retro Halftone Dither):
 * - Ordered Bayer 4x4 Matrix (GPU WebGL shader + 2D ImageData)
 * - Floyd-Steinberg Error Diffusion (non-mutating pixel readback -> temporary WebGL texture passthrough
 *   so final pass renders directly into default framebuffer & intermediate pass cleanly chains to Stage 4)
 */
export class ScribeDitherFilter extends fabric.filters.BaseFilter<
  'ScribeDither',
  ScribeDitherProps
> {
  static type = 'ScribeDither';
  static uniformLocations = ['uIntensity', 'uImgW', 'uImgH', 'uPassthrough'];
  static defaults: ScribeDitherProps = {
    intensity: 0,
    mode: 'bayer-4x4',
  };

  declare intensity: number;
  declare mode: DitherAlgorithm;

  private _imgWidth = 1;
  private _imgHeight = 1;
  private _passthrough = 0;

  isNeutralState(): boolean {
    return safeClamp(this.intensity, 0, 100, 0) <= 0;
  }

  getCacheKey(): string {
    return `${this.type}_quantizer`;
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uIntensity;
      uniform float uImgW;
      uniform float uImgH;
      uniform float uPassthrough;
      varying vec2 vTexCoord;

      float bayer4x4(vec2 pos) {
        int x = int(mod(pos.x, 4.0));
        int y = int(mod(pos.y, 4.0));
        int idx = y * 4 + x;
        if (idx == 0) return 0.0 / 16.0;
        if (idx == 1) return 8.0 / 16.0;
        if (idx == 2) return 2.0 / 16.0;
        if (idx == 3) return 10.0 / 16.0;
        if (idx == 4) return 12.0 / 16.0;
        if (idx == 5) return 4.0 / 16.0;
        if (idx == 6) return 14.0 / 16.0;
        if (idx == 7) return 6.0 / 16.0;
        if (idx == 8) return 3.0 / 16.0;
        if (idx == 9) return 11.0 / 16.0;
        if (idx == 10) return 1.0 / 16.0;
        if (idx == 11) return 9.0 / 16.0;
        if (idx == 12) return 15.0 / 16.0;
        if (idx == 13) return 7.0 / 16.0;
        if (idx == 14) return 13.0 / 16.0;
        return 5.0 / 16.0;
      }

      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        if (uPassthrough > 0.5 || color.a <= 0.0 || uIntensity <= 0.0) {
          gl_FragColor = color;
          return;
        }
        float lum = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec2 px = floor(vTexCoord * vec2(max(uImgW, 1.0), max(uImgH, 1.0)));
        float bayerBias = (bayer4x4(px) + 0.03125 - 0.5) * 0.68;
        float threshold = 0.78 - 0.52 * clamp(uIntensity, 0.0, 1.0);
        float outBit = step(threshold, lum + bayerBias);
        gl_FragColor = vec4(vec3(outBit), color.a);
      }
    `;
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation | null>
  ): void {
    const t = clamp01(safeClamp(this.intensity, 0, 100, 0) / 100);
    if (uniformLocations.uIntensity) gl.uniform1f(uniformLocations.uIntensity, t);
    if (uniformLocations.uImgW) gl.uniform1f(uniformLocations.uImgW, Math.max(1, this._imgWidth));
    if (uniformLocations.uImgH) gl.uniform1f(uniformLocations.uImgH, Math.max(1, this._imgHeight));
    if (uniformLocations.uPassthrough) gl.uniform1f(uniformLocations.uPassthrough, this._passthrough);
  }

  applyTo(options: any): void {
    const safeIntensity = safeClamp(this.intensity, 0, 100, 0);
    if (safeIntensity <= 0) return;

    if (options && options.webgl) {
      const w = Math.max(1, Math.floor(safeFinite(options.sourceWidth, 1)));
      const h = Math.max(1, Math.floor(safeFinite(options.sourceHeight, 1)));
      this._imgWidth = w;
      this._imgHeight = h;

      if (this.mode === 'floyd-steinberg') {
        const gl: WebGLRenderingContext = options.context;
        const inTex =
          options.pass === 0 && options.originalTexture
            ? options.originalTexture
            : options.sourceTexture;

        const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        const readFbo = gl.createFramebuffer();
        const tmpTex = gl.createTexture();
        const savedOrig = options.originalTexture;
        const savedSrc = options.sourceTexture;
        let swapped = false;

        try {
          gl.bindFramebuffer(gl.FRAMEBUFFER, readFbo);
          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            inTex,
            0
          );

          const pixels = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);

          applyDitherToPixelBuffer(pixels, w, h, 'floyd-steinberg', safeIntensity);

          // Upload processed buffer into an isolated temporary texture (never mutating originalTexture)
          gl.bindTexture(gl.TEXTURE_2D, tmpTex);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            w,
            h,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels
          );
          gl.bindTexture(gl.TEXTURE_2D, null);

          // Passthrough render into targetTexture (if passes > 1) or default framebuffer (if final pass)
          this._passthrough = 1;
          options.sourceTexture = tmpTex;
          options.originalTexture = undefined;
          this._setupFrameBuffer(options);
          this.applyToWebGL(options);
          options.originalTexture = savedOrig;
          options.sourceTexture = savedSrc;
          this._swapTextures(options);
          swapped = true;
        } finally {
          this._passthrough = 0;
          options.originalTexture = savedOrig;
          if (!swapped) {
            options.sourceTexture = savedSrc;
            gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
          }
          if (readFbo) gl.deleteFramebuffer(readFbo);
          if (tmpTex) gl.deleteTexture(tmpTex);
        }
        return;
      }

      this._passthrough = 0;
      this._setupFrameBuffer(options);
      this.applyToWebGL(options);
      this._swapTextures(options);
      return;
    }

    this.applyTo2d(options);
  }

  applyTo2d(options: { imageData: ImageData }): void {
    if (!options || !options.imageData) return;
    applyDitherToImageData(
      options.imageData,
      safeClamp(this.intensity, 0, 100, 0),
      this.mode === 'floyd-steinberg' ? 'floyd-steinberg' : 'bayer-4x4'
    );
  }

  toObject(): { type: 'ScribeDither' } & ScribeDitherProps {
    return {
      type: 'ScribeDither',
      intensity: safeClamp(this.intensity, 0, 100, 0),
      mode: this.mode === 'floyd-steinberg' ? 'floyd-steinberg' : 'bayer-4x4',
    };
  }
}

try {
  fabric.classRegistry.setClass(ScribeCompositeEffectFilter);
  fabric.classRegistry.setClass(ScribeTonalColorFilter);
  fabric.classRegistry.setClass(ScribeSharpenFilter);
  fabric.classRegistry.setClass(ScribeVignetteFilter);
  fabric.classRegistry.setClass(ScribeStudioAdjustmentsFilter);
  fabric.classRegistry.setClass(ScribeDitherFilter);
} catch {
  // Safe guard in SSR / test runtimes
}

/**
 * Builds the Fabric.js v7 filter pipeline for a preset + 0..100 intensity value.
 */
export function buildEffectFiltersForImage(
  rawEffectId: string,
  intensity: number
): fabric.filters.BaseFilter<string, any, any>[] {
  const effectId = normalizeEffectId(rawEffectId);
  const clamped = safeClamp(intensity, 0, 100, 100);
  if (effectId === 'none' || clamped <= 0) {
    return [];
  }
  return [new ScribeCompositeEffectFilter({ effectId, intensity: clamped })];
}

/**
 * Builds the complete non-destructive Fabric.js filter chain in strict deterministic sequence:
 *   0. Optional composite Effect preset
 *   1. Stage 1 — Base tonal & color adjustments (Exposure, Shadows, Brightness, Contrast, Temperature, Saturation, Hue Rotate)
 *   2. Stage 2 — Spatial detail & edge controls (Blur, Sharpen 3x3 convolution)
 *   3. Stage 3 — Stylistic quantization (Dither Bayer 4x4 or Floyd-Steinberg, completely off at 0)
 *   4. Stage 4 — Framing (Vignette; paired with buildFabricDropShadow for Drop Shadow)
 */
export function buildFullImageFilterPipeline(
  rawEffectId: string,
  effectIntensity: number,
  rawSliders: Partial<FilterSliderState>
): fabric.filters.BaseFilter<string, any, any>[] {
  const sliders = normalizeFilterSliders(rawSliders);
  const nextFilters: fabric.filters.BaseFilter<string, any, any>[] =
    buildEffectFiltersForImage(rawEffectId, effectIntensity);

  // Stage 1: Base tonal & color adjustments
  const tonalFilter = new ScribeTonalColorFilter({
    brightness: sliders.brightness,
    contrast: sliders.contrast,
    saturation: sliders.saturation,
    exposure: sliders.exposure,
    shadows: sliders.shadows,
    temperature: sliders.temperature,
    hueRotate: sliders.hueRotate,
  });
  if (!tonalFilter.isNeutralState()) {
    nextFilters.push(tonalFilter);
  }

  // Stage 2: Spatial detail & edge controls (Blur -> Sharpen)
  if (sliders.blur > 0) {
    nextFilters.push(
      new fabric.filters.Blur({
        blur: Math.min(1, Math.max(0, (sliders.blur / 40) * 0.85)),
      })
    );
  }

  if (sliders.sharpen > 0) {
    const sharpenFilter = new ScribeSharpenFilter({ sharpen: sliders.sharpen });
    if (!sharpenFilter.isNeutralState()) {
      nextFilters.push(sharpenFilter);
    }
  }

  // Stage 3: Stylistic quantization (Dither — completely omitted at 0)
  if (sliders.ditherIntensity > 0) {
    nextFilters.push(
      new ScribeDitherFilter({
        intensity: sliders.ditherIntensity,
        mode: sliders.ditherMode,
      })
    );
  }

  // Stage 4a: Framing (Vignette)
  if (sliders.vignette > 0) {
    const vignetteFilter = new ScribeVignetteFilter({ vignette: sliders.vignette });
    if (!vignetteFilter.isNeutralState()) {
      nextFilters.push(vignetteFilter);
    }
  }

  return nextFilters;
}

function hexToRgbaString(hex: string, opacityPct: number): string {
  const clean = (hex || '#000000').trim().replace(/^#/, '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const alpha = (safeClamp(opacityPct, 0, 100, 70) / 100).toFixed(2);
  if (!/^[0-9A-Fa-f]{6}$/.test(full)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * STAGE 4b (Framing & Shadow — Drop Shadow).
 */
export function buildFabricDropShadow(
  rawSliders: Partial<FilterSliderState>
): fabric.Shadow | null {
  const sliders = normalizeFilterSliders(rawSliders);
  const active =
    sliders.dropShadowOpacity > 0 &&
    (sliders.dropShadowBlur > 0 ||
      sliders.dropShadowOffsetX !== 0 ||
      sliders.dropShadowOffsetY !== 0);
  if (!active) return null;

  return new fabric.Shadow({
    color: hexToRgbaString(sliders.dropShadowColor, sliders.dropShadowOpacity),
    blur: sliders.dropShadowBlur,
    offsetX: sliders.dropShadowOffsetX,
    offsetY: sliders.dropShadowOffsetY,
  });
}

function extractShadowSliderDefaults(shadow: unknown): Partial<FilterSliderState> {
  if (!shadow || typeof shadow !== 'object') return {};
  const s = shadow as { blur?: unknown; offsetX?: unknown; offsetY?: unknown; color?: unknown };
  const patch: Partial<FilterSliderState> = {};
  if (typeof s.blur === 'number' && Number.isFinite(s.blur)) {
    patch.dropShadowBlur = Math.round(safeClamp(s.blur, 0, 60, 0));
  }
  if (typeof s.offsetX === 'number' && Number.isFinite(s.offsetX)) {
    patch.dropShadowOffsetX = Math.round(safeClamp(s.offsetX, -50, 50, 0));
  }
  if (typeof s.offsetY === 'number' && Number.isFinite(s.offsetY)) {
    patch.dropShadowOffsetY = Math.round(safeClamp(s.offsetY, -50, 50, 0));
  }
  if (typeof s.color === 'string') {
    const rgbaMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(
      s.color.trim()
    );
    if (rgbaMatch) {
      const r = Number(rgbaMatch[1]).toString(16).padStart(2, '0');
      const g = Number(rgbaMatch[2]).toString(16).padStart(2, '0');
      const b = Number(rgbaMatch[3]).toString(16).padStart(2, '0');
      patch.dropShadowColor = `#${r}${g}${b}`;
      if (rgbaMatch[4] !== undefined) {
        patch.dropShadowOpacity = Math.round(safeClamp(Number(rgbaMatch[4]) * 100, 0, 100, 70));
      }
    } else if (/^#[0-9A-Fa-f]{3,6}$/.test(s.color.trim())) {
      patch.dropShadowColor = s.color.trim();
    }
  }
  return patch;
}

function invertHexColor(hex: string): string | null {
  const match = /^#?([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!match) return null;
  const num = parseInt(match[1], 16);
  const inverted = (0xffffff ^ num).toString(16).padStart(6, '0');
  return `#${inverted}`;
}

function safeApplyFabricImageFilters(
  imgObj: fabric.FabricImage,
  nextFilters: fabric.filters.BaseFilter<string, any, any>[],
  nextEffectId: string,
  nextEffectIntensity: number,
  nextSliders: FilterSliderState
): void {
  const origEl = (imgObj as any)._originalElement ?? imgObj.getElement?.();
  if (!origEl) return;

  const w = origEl.naturalWidth ?? origEl.width ?? 0;
  const h = origEl.naturalHeight ?? origEl.height ?? 0;
  if (w <= 0 || h <= 0) return;

  ensureCrossOriginAnonymous(origEl);

  imgObj.filters = nextFilters;
  try {
    imgObj.applyFilters();
  } catch {
    // Fallback to pure Canvas2D non-mutating offscreen pipeline if WebGL / CORS errors occur
    try {
      const canvasEl = renderDeterministicFilterPipelineOnCanvas(
        origEl,
        nextEffectId,
        nextEffectIntensity,
        nextSliders
      );
      (imgObj as any)._element = canvasEl;
      (imgObj as any)._filteredEl = canvasEl;
      imgObj.set('dirty', true);
    } catch {
      // Never allow canvas/CORS exceptions to freeze slider updates
    }
  }
}

export interface UseImageEffectsOptions {
  selectedObject: fabric.FabricObject | null;
  onCommitCanvasChange?: () => void;
  onElementOpacitySynced?: (opacityPct: number) => void;
}

/**
 * React hook managing high-fidelity multi-pass Fabric effects + non-destructive Filters
 * with isolated ref-backed `filters` state (no stale-closure overwrites) and
 * requestAnimationFrame coalescing for jitter-free live slider updates.
 */
export function useImageEffects({
  selectedObject,
  onCommitCanvasChange,
  onElementOpacitySynced,
}: UseImageEffectsOptions) {
  const isImage =
    !!selectedObject &&
    (selectedObject instanceof fabric.FabricImage || selectedObject.type === 'image');

  const [activeEffectId, setActiveEffectId] = useState<string>('none');
  const [effectIntensity, setEffectIntensity] = useState<number>(100);
  const [filters, setFilters] = useState<FilterSliderState>(() => ({
    ...DEFAULT_FILTER_SLIDERS,
  }));

  // Synchronous refs eliminate stale closures during rapid drags / double-click resets
  const filtersRef = useRef<FilterSliderState>({ ...DEFAULT_FILTER_SLIDERS });
  const effectRef = useRef<{ id: string; intensity: number }>({
    id: 'none',
    intensity: 100,
  });

  const rafIdRef = useRef<number | null>(null);
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (commitTimeoutRef.current !== null) {
      clearTimeout(commitTimeoutRef.current);
      commitTimeoutRef.current = null;
    }

    if (!selectedObject) {
      const resetFilters = { ...DEFAULT_FILTER_SLIDERS };
      filtersRef.current = resetFilters;
      effectRef.current = { id: 'none', intensity: 100 };
      setActiveEffectId('none');
      setEffectIntensity(100);
      setFilters(resetFilters);
      return;
    }

    const savedEffect = normalizeEffectId((selectedObject as any).__scribeEffectId || 'none');
    const savedIntensity =
      typeof (selectedObject as any).__scribeEffectIntensity === 'number'
        ? safeClamp((selectedObject as any).__scribeEffectIntensity, 0, 100, 100)
        : 100;
    const savedSliders = (selectedObject as any).__scribeFilterSliders as
      | Partial<FilterSliderState>
      | undefined;

    const hydratedFilters = savedSliders
      ? normalizeFilterSliders(savedSliders)
      : normalizeFilterSliders(extractShadowSliderDefaults(selectedObject.shadow));

    effectRef.current = { id: savedEffect, intensity: savedIntensity };
    filtersRef.current = hydratedFilters;
    setActiveEffectId(savedEffect);
    setEffectIntensity(savedIntensity);
    setFilters(hydratedFilters);
  }, [selectedObject]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (commitTimeoutRef.current !== null) clearTimeout(commitTimeoutRef.current);
    };
  }, []);

  const scheduleCommit = useCallback(
    (immediate: boolean) => {
      if (commitTimeoutRef.current !== null) {
        clearTimeout(commitTimeoutRef.current);
        commitTimeoutRef.current = null;
      }
      if (immediate) {
        onCommitCanvasChange?.();
      } else {
        commitTimeoutRef.current = setTimeout(() => {
          onCommitCanvasChange?.();
        }, 180);
      }
    },
    [onCommitCanvasChange]
  );

  const applyPipelineNow = useCallback(
    (
      obj: fabric.FabricObject,
      rawEffectId: string,
      intensity: number,
      rawNextFilters: FilterSliderState,
      immediateCommit: boolean
    ) => {
      const effectId = normalizeEffectId(rawEffectId);
      const clamped = safeClamp(intensity, 0, 100, 100);
      const nextFilters = normalizeFilterSliders(rawNextFilters);

      if (!(obj instanceof fabric.FabricImage) && obj.type !== 'image') {
        const t = clamped / 100;
        (obj as any).__scribeEffectId = effectId;
        (obj as any).__scribeEffectIntensity = clamped;
        (obj as any).__scribeFilterSliders = nextFilters;

        if (effectId === 'invert-colors' && typeof obj.fill === 'string') {
          const inv = invertHexColor(obj.fill);
          if (inv) obj.set('fill', inv);
        }

        const shadowAlpha = (0.85 * t).toFixed(2);
        const shadowColorMap: Record<string, string> = {
          'high-contrast': `rgba(0,0,0,${shadowAlpha})`,
          'dramatic-hdr': `rgba(0,0,0,${shadowAlpha})`,
          'color-punch': `rgba(99,102,241,${shadowAlpha})`,
          duotone: `rgba(99,102,241,${shadowAlpha})`,
          'cyberpunk-neon': `rgba(217,70,239,${shadowAlpha})`,
          'warm-sunset': `rgba(245,158,11,${shadowAlpha})`,
          sepia: `rgba(180,83,9,${shadowAlpha})`,
          'vintage-film': `rgba(180,83,9,${shadowAlpha})`,
          'retro-polaroid': `rgba(245,158,11,${shadowAlpha})`,
          'cool-noir': `rgba(56,189,248,${shadowAlpha})`,
          'teal-orange': `rgba(20,184,166,${shadowAlpha})`,
          'pastel-dream': `rgba(249,168,212,${shadowAlpha})`,
          vignette: `rgba(0,0,0,${(0.92 * t).toFixed(2)})`,
        };

        if (effectId === 'none' || t <= 0) {
          // Preserve element's current opacity when editing drop shadow filters
          obj.set({
            shadow: buildFabricDropShadow(nextFilters),
          });
        } else if (
          effectId === 'grayscale' ||
          effectId === 'lofi-grain' ||
          effectId === 'matte-fade'
        ) {
          obj.set({ opacity: Number((1 - 0.32 * t).toFixed(2)), shadow: null });
        } else if (shadowColorMap[effectId]) {
          obj.set({
            opacity: effectId === 'vignette' ? Number((1 - 0.14 * t).toFixed(2)) : 1,
            shadow: new fabric.Shadow({
              color: shadowColorMap[effectId],
              blur: Math.round(32 * t),
              offsetX: 0,
              offsetY: effectId === 'high-contrast' ? Math.round(8 * t) : 0,
            }),
          });
        }

        onElementOpacitySynced?.(Math.round((obj.opacity ?? 1) * 100));
        obj.canvas?.requestRenderAll();
        scheduleCommit(immediateCommit);
        return;
      }

      const imgObj = obj as fabric.FabricImage;
      const nextChain = buildFullImageFilterPipeline(effectId, clamped, nextFilters);

      safeApplyFabricImageFilters(imgObj, nextChain, effectId, clamped, nextFilters);
      imgObj.set('shadow', buildFabricDropShadow(nextFilters));

      (imgObj as any).__scribeEffectId = effectId;
      (imgObj as any).__scribeEffectIntensity = clamped;
      (imgObj as any).__scribeFilterSliders = nextFilters;

      imgObj.canvas?.requestRenderAll();
      scheduleCommit(immediateCommit);
    },
    [onElementOpacitySynced, scheduleCommit]
  );

  const rebuildImageFilters = useCallback(
    (
      rawEffectId: string,
      intensity: number,
      nextFilters: FilterSliderState,
      options?: { coalesce?: boolean; immediateCommit?: boolean }
    ) => {
      if (!selectedObject) return;
      const coalesce = options?.coalesce ?? false;
      const immediateCommit = options?.immediateCommit ?? !coalesce;

      if (!coalesce) {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        applyPipelineNow(selectedObject, rawEffectId, intensity, nextFilters, immediateCommit);
        return;
      }

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const latestEffect = effectRef.current;
        const latestFilters = filtersRef.current;
        applyPipelineNow(
          selectedObject,
          latestEffect.id,
          latestEffect.intensity,
          latestFilters,
          false
        );
      });
    },
    [applyPipelineNow, selectedObject]
  );

  const selectEffect = useCallback(
    (rawEffectId: string, nextIntensity: number) => {
      const normalized = normalizeEffectId(rawEffectId);
      const clamped = safeClamp(nextIntensity, 0, 100, 100);
      effectRef.current = { id: normalized, intensity: clamped };
      setActiveEffectId(normalized);
      setEffectIntensity(clamped);
      rebuildImageFilters(normalized, clamped, filtersRef.current, {
        coalesce: false,
        immediateCommit: true,
      });
    },
    [rebuildImageFilters]
  );

  const updateIntensity = useCallback(
    (nextIntensity: number) => {
      const clamped = Math.round(safeClamp(nextIntensity, 0, 100, 100));
      effectRef.current = { ...effectRef.current, intensity: clamped };
      setEffectIntensity(clamped);
      rebuildImageFilters(effectRef.current.id, clamped, filtersRef.current, {
        coalesce: true,
        immediateCommit: false,
      });
    },
    [rebuildImageFilters]
  );

  const resetEffect = useCallback(() => {
    effectRef.current = { id: 'none', intensity: 100 };
    setActiveEffectId('none');
    setEffectIntensity(100);
    rebuildImageFilters('none', 100, filtersRef.current, {
      coalesce: false,
      immediateCommit: true,
    });
  }, [rebuildImageFilters]);

  const updateFilterSliders = useCallback(
    (
      patch: Partial<FilterSliderState>,
      options?: { coalesce?: boolean; immediateCommit?: boolean }
    ) => {
      const next = normalizeFilterSliders({ ...filtersRef.current, ...patch });
      filtersRef.current = next;
      setFilters(next);
      rebuildImageFilters(effectRef.current.id, effectRef.current.intensity, next, {
        coalesce: options?.coalesce ?? true,
        immediateCommit: options?.immediateCommit ?? false,
      });
    },
    [rebuildImageFilters]
  );

  const updateFilter = useCallback(
    <K extends keyof FilterSliderState>(
      key: K,
      value: FilterSliderState[K],
      options?: { coalesce?: boolean; immediateCommit?: boolean }
    ) => {
      updateFilterSliders({ [key]: value } as Partial<FilterSliderState>, options);
    },
    [updateFilterSliders]
  );

  const resetFilter = useCallback(
    <K extends keyof FilterSliderState>(key: K) => {
      updateFilterSliders(
        { [key]: DEFAULT_FILTER_SLIDERS[key] } as Partial<FilterSliderState>,
        { coalesce: false, immediateCommit: true }
      );
    },
    [updateFilterSliders]
  );

  const resetAllFilters = useCallback(() => {
    const reset = { ...DEFAULT_FILTER_SLIDERS };
    filtersRef.current = reset;
    setFilters(reset);
    rebuildImageFilters(effectRef.current.id, effectRef.current.intensity, reset, {
      coalesce: false,
      immediateCommit: true,
    });
  }, [rebuildImageFilters]);

  const setFiltersAndSync = useCallback(
    (nextOrUpdater: React.SetStateAction<FilterSliderState>) => {
      const resolved =
        typeof nextOrUpdater === 'function'
          ? normalizeFilterSliders(nextOrUpdater(filtersRef.current))
          : normalizeFilterSliders(nextOrUpdater);
      filtersRef.current = resolved;
      setFilters(resolved);
    },
    []
  );

  return {
    isImage,
    activeEffectId,
    setActiveEffectId,
    effectIntensity,
    setEffectIntensity,
    filters,
    sliders: filters,
    setFilters: setFiltersAndSync,
    setSliders: setFiltersAndSync,
    rebuildImageFilters,
    selectEffect,
    updateIntensity,
    resetEffect,
    updateFilter,
    updateFilterSliders,
    resetFilter,
    resetAllFilters,
  };
}

/**
 * Computes visual-scale-compensated local rx/ry clip radii for Smooth Edges (0..100px).
 */
export function computeSmoothEdgeClipRadii(
  visualRadiusPx: number,
  width: number,
  height: number,
  scaleX: number = 1,
  scaleY: number = 1
): { visualRadius: number; rx: number; ry: number } {
  const clamped = Math.max(0, Math.min(100, Math.round(visualRadiusPx)));
  if (clamped <= 0) {
    return { visualRadius: 0, rx: 0, ry: 0 };
  }
  const safeW = Math.max(1, width || 1);
  const safeH = Math.max(1, height || 1);
  const sx = Math.max(0.01, Math.abs(scaleX || 1));
  const sy = Math.max(0.01, Math.abs(scaleY || 1));
  return {
    visualRadius: clamped,
    rx: Math.min(safeW / 2, clamped / sx),
    ry: Math.min(safeH / 2, clamped / sy),
  };
}

/**
 * Computes Cover-fit scale & center coordinates so a background image fills
 * the entire artboard edge-to-edge without gaps while cropping overflow cleanly.
 */
export function computeCoverBackgroundTransform(
  imgWidth: number,
  imgHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { scale: number; left: number; top: number } {
  const w = Math.max(1, imgWidth || 1);
  const h = Math.max(1, imgHeight || 1);
  const artW = Math.max(1, canvasWidth || 1);
  const artH = Math.max(1, canvasHeight || 1);
  return {
    scale: Math.max(artW / w, artH / h),
    left: artW / 2,
    top: artH / 2,
  };
}


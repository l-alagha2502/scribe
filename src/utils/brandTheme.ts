import * as fabric from 'fabric';
import { BrandRecord } from '../types';

export interface VectorChildColorSnapshot {
  child: fabric.FabricObject;
  fill: any;
  stroke: any;
  fillOpacity: number;
}

export interface ObjectColorSnapshot {
  obj: fabric.FabricObject;
  fill: any;
  stroke: any;
  isVectorIcon?: boolean;
  iconColor?: string;
  iconFill?: string;
  iconFillMode?: string;
  childrenSnapshots?: VectorChildColorSnapshot[];
}

export interface AppliedBrandThemeState {
  brandId: string;
  snapshots: ObjectColorSnapshot[];
}

function parseHexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return [r, g, b];
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return [r, g, b];
  }
  return null;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const a = parseHexToRgb(hexA);
  const b = parseHexToRgb(hexB);
  if (!a || !b) return 4.5;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getBrandPaletteColors(brand: BrandRecord): string[] {
  const raw = [brand.primaryColor, ...(brand.secondaryColors || [])];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const col of raw) {
    if (typeof col !== 'string' || !col.trim()) continue;
    const normalized = col.trim();
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(normalized);
    }
  }
  return out.length > 0 ? out : ['#ffffff'];
}

export function isTextFabricObject(obj: fabric.FabricObject): boolean {
  const t = (obj.type || '').toLowerCase();
  return (
    obj instanceof fabric.Textbox ||
    t === 'textbox' ||
    t === 'text' ||
    t === 'i-text'
  );
}

export function isColorChangeableObject(obj: fabric.FabricObject): boolean {
  const t = (obj.type || '').toLowerCase();
  if (obj instanceof fabric.FabricImage || t === 'image') {
    return false;
  }
  if ((obj as any).isVectorIcon) {
    return true;
  }
  if (isTextFabricObject(obj)) {
    return true;
  }
  return (
    t === 'rect' ||
    t === 'circle' ||
    t === 'ellipse' ||
    t === 'triangle' ||
    t === 'polygon' ||
    t === 'polyline' ||
    t === 'path' ||
    t === 'line' ||
    obj instanceof fabric.Rect ||
    obj instanceof fabric.Circle ||
    obj instanceof fabric.Ellipse ||
    obj instanceof fabric.Triangle ||
    obj instanceof fabric.Polygon ||
    obj instanceof fabric.Path ||
    obj instanceof fabric.Line
  );
}

function isLineShapeObject(obj: fabric.FabricObject): boolean {
  const t = (obj.type || '').toLowerCase();
  return (
    Boolean((obj as any).isLineDivider) ||
    t === 'line' ||
    obj instanceof fabric.Line
  );
}

export function captureObjectColorSnapshot(
  obj: fabric.FabricObject
): ObjectColorSnapshot {
  const snap: ObjectColorSnapshot = {
    obj,
    fill: obj.fill,
    stroke: obj.stroke,
    isVectorIcon: Boolean((obj as any).isVectorIcon),
    iconColor: (obj as any).iconColor,
    iconFill: (obj as any).iconFill,
    iconFillMode: (obj as any).iconFillMode,
  };

  if ((obj as any).isVectorIcon && typeof (obj as any).getObjects === 'function') {
    const children = ((obj as any).getObjects() || []) as fabric.FabricObject[];
    snap.childrenSnapshots = children.map((child) => ({
      child,
      fill: child.fill,
      stroke: child.stroke,
      fillOpacity: (child as any).fillOpacity ?? 1,
    }));
  }

  return snap;
}

export function restoreBrandThemeSnapshots(
  snapshots: ObjectColorSnapshot[]
): void {
  for (const snap of snapshots) {
    const { obj } = snap;
    if (snap.isVectorIcon && snap.childrenSnapshots) {
      (obj as any).iconColor = snap.iconColor;
      (obj as any).iconFill = snap.iconFill;
      (obj as any).iconFillMode = snap.iconFillMode;
      for (const cs of snap.childrenSnapshots) {
        cs.child.set({
          fill: cs.fill,
          stroke: cs.stroke,
          fillOpacity: cs.fillOpacity,
        });
      }
      obj.set('dirty', true);
    } else {
      obj.set({
        fill: snap.fill,
        stroke: snap.stroke,
      });
      obj.set('dirty', true);
    }
    obj.setCoords();
  }
}

function applyColorDirectToObject(obj: fabric.FabricObject, color: string): void {
  if ((obj as any).isVectorIcon && typeof (obj as any).getObjects === 'function') {
    const children = ((obj as any).getObjects() || []) as fabric.FabricObject[];
    const mode = (obj as any).iconFillMode || 'none';
    (obj as any).iconColor = color;
    if (mode !== 'none') {
      (obj as any).iconFill = color;
    }
    for (const c of children) {
      if (c.stroke && c.stroke !== 'none' && c.stroke !== 'transparent') {
        c.set({ stroke: color, strokeUniform: true });
      }
      if (mode !== 'none' && (c as any).isIconFillable !== false) {
        c.set({
          fill: color,
          fillOpacity: mode === 'soft' ? 0.28 : 1,
        });
      }
    }
    obj.set('dirty', true);
  } else if (isLineShapeObject(obj)) {
    obj.set({ stroke: color, fill: color });
    obj.set('dirty', true);
  } else {
    const hasTransparentFill =
      obj.fill === 'transparent' || obj.fill === 'none' || obj.fill === '';
    if (hasTransparentFill && obj.stroke && obj.stroke !== 'none') {
      obj.set({ stroke: color });
    } else {
      obj.set({ fill: color });
      if (obj.stroke && obj.stroke !== 'none' && obj.stroke !== 'transparent') {
        obj.set({ stroke: color });
      }
    }
    obj.set('dirty', true);
  }
  obj.setCoords();
}

/**
 * Applies a BrandRecord's palette across all color-changeable objects (text, shapes, icons),
 * preserving legible contrast against the canvas background and returning exact prior snapshots
 * for undo or click-to-toggle revert.
 */
export function applyBrandThemeToObjects(
  objects: fabric.FabricObject[],
  brand: BrandRecord,
  canvasBgColor: string = '#08080a'
): ObjectColorSnapshot[] {
  const palette = getBrandPaletteColors(brand);
  const targets = objects.filter((o) => isColorChangeableObject(o));
  const snapshots = targets.map(captureObjectColorSnapshot);

  // Rank palette colors for legible text against canvasBgColor
  const legibleTextPalette = palette.filter(
    (col) => contrastRatio(col, canvasBgColor) >= 3.0
  );
  const textCandidates =
    legibleTextPalette.length > 0
      ? legibleTextPalette
      : [
          ...palette.slice().sort(
            (a, b) =>
              contrastRatio(b, canvasBgColor) - contrastRatio(a, canvasBgColor)
          ),
        ];

  // Shape / icon accents prioritize primary + legible contrasting palette colors
  const shapeCandidates = palette.filter(
    (col) => contrastRatio(col, canvasBgColor) >= 1.4
  );
  const accentPalette = shapeCandidates.length > 0 ? shapeCandidates : palette;

  let textCursor = 0;
  let shapeCursor = 0;

  for (const obj of targets) {
    if (isTextFabricObject(obj)) {
      const assigned = textCandidates[textCursor % textCandidates.length];
      applyColorDirectToObject(obj, assigned);
      textCursor++;
    } else {
      const assigned = accentPalette[shapeCursor % accentPalette.length];
      applyColorDirectToObject(obj, assigned);
      shapeCursor++;
    }
  }

  return snapshots;
}

/**
 * Computes the safe property patch when applying a single Brand color swatch to a selected object.
 * Never touches canvas background.
 */
export function getSwatchUpdatePropsForObject(
  obj: fabric.FabricObject,
  color: string
): Partial<any> {
  if ((obj as any).isVectorIcon) {
    return { stroke: color };
  }
  if (isLineShapeObject(obj)) {
    return { stroke: color, fill: color };
  }
  return { fill: color };
}

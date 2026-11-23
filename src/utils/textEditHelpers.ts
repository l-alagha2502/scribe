import * as fabric from 'fabric';

export type TextOutlineType = 'solid' | 'dashed' | 'dotted' | 'double';
export type TextCaseMode = 'normal' | 'uppercase' | 'lowercase';

export interface TextOutlineConfig {
  enabled: boolean;
  color: string;
  width: number;
  type: TextOutlineType;
}

export function isTextFabricObject(obj: fabric.FabricObject | null | undefined): boolean {
  if (!obj) return false;
  const t = (obj.type || '').toLowerCase();
  return (
    obj instanceof fabric.Textbox ||
    t === 'textbox' ||
    t === 'text' ||
    t === 'i-text'
  );
}

export function isImageFabricObject(obj: fabric.FabricObject | null | undefined): boolean {
  if (!obj) return false;
  const t = (obj.type || '').toLowerCase();
  return obj instanceof fabric.FabricImage || t === 'image';
}

export function isShapeFabricObject(obj: fabric.FabricObject | null | undefined): boolean {
  if (!obj) return false;
  if (isTextFabricObject(obj) || isImageFabricObject(obj)) return false;
  const t = (obj.type || '').toLowerCase();
  return (
    Boolean((obj as any).isVectorIcon) ||
    obj instanceof fabric.Rect ||
    obj instanceof fabric.Circle ||
    obj instanceof fabric.Ellipse ||
    obj instanceof fabric.Triangle ||
    obj instanceof fabric.Polygon ||
    obj instanceof fabric.Path ||
    obj instanceof fabric.Line ||
    t === 'rect' ||
    t === 'circle' ||
    t === 'ellipse' ||
    t === 'triangle' ||
    t === 'polygon' ||
    t === 'polyline' ||
    t === 'path' ||
    t === 'line'
  );
}

let paragraphSpacingPatched = false;

/**
 * Patches fabric.Textbox.prototype.getHeightOfLine once so `paragraphSpacing`
 * adds genuine vertical spacing (in local px) after explicit paragraph breaks.
 */
export function installFabricParagraphSpacingPatch(): void {
  if (paragraphSpacingPatched) return;
  const proto = fabric.Textbox?.prototype as any;
  if (!proto || typeof proto.getHeightOfLine !== 'function') return;

  const originalGetHeightOfLine = proto.getHeightOfLine;
  proto.getHeightOfLine = function patchedGetHeightOfLine(
    this: any,
    lineIndex: number
  ): number {
    const baseHeight = originalGetHeightOfLine.call(this, lineIndex);
    const pSpacing = Number(this.paragraphSpacing || 0);
    if (
      pSpacing > 0 &&
      Array.isArray(this._textLines) &&
      lineIndex < this._textLines.length - 1 &&
      typeof this.isEndOfWrapping === 'function' &&
      this.isEndOfWrapping(lineIndex)
    ) {
      return baseHeight + pSpacing;
    }
    return baseHeight;
  };
  paragraphSpacingPatched = true;
}

export function readTextOutlineState(obj: fabric.FabricObject): TextOutlineConfig {
  const width = Number(obj.strokeWidth || 0);
  const hasStroke =
    typeof obj.stroke === 'string' &&
    obj.stroke !== '' &&
    obj.stroke !== 'none' &&
    obj.stroke !== 'transparent' &&
    width > 0;

  const storedEnabled = (obj as any).__scribeOutlineEnabled;
  const enabled = typeof storedEnabled === 'boolean' ? storedEnabled : hasStroke;
  const color =
    typeof obj.stroke === 'string' &&
    obj.stroke !== '' &&
    obj.stroke !== 'none' &&
    obj.stroke !== 'transparent'
      ? obj.stroke
      : '#000000';
  const storedType = (obj as any).__scribeOutlineType as TextOutlineType | undefined;

  let detectedType: TextOutlineType = storedType || 'solid';
  if (!storedType) {
    if ((obj as any).__scribeOutlineGlow) {
      detectedType = 'double';
    } else if (Array.isArray(obj.strokeDashArray) && obj.strokeDashArray.length >= 2) {
      const [dash] = obj.strokeDashArray;
      detectedType = dash <= Math.max(2, width * 0.8) ? 'dotted' : 'dashed';
    }
  }

  return {
    enabled,
    color,
    width: hasStroke ? width : Math.max(0, width),
    type: detectedType,
  };
}

export function applyTextOutline(
  obj: fabric.FabricObject,
  config: TextOutlineConfig
): void {
  const width = Math.max(0, Math.min(24, Number(config.width) || 0));
  const color = config.color || '#000000';
  const enabled = Boolean(config.enabled) && width > 0;

  (obj as any).__scribeOutlineEnabled = enabled;
  (obj as any).__scribeOutlineType = config.type;

  if (!enabled) {
    obj.set({
      stroke: undefined,
      strokeWidth: 0,
      strokeDashArray: undefined,
      paintFirst: 'stroke',
    });
    if ((obj as any).__scribeOutlineGlow) {
      obj.set({ shadow: null });
      (obj as any).__scribeOutlineGlow = false;
    }
    obj.set('dirty', true);
    obj.setCoords();
    return;
  }

  let dashArray: number[] | undefined = undefined;
  let lineCap: CanvasLineCap = 'butt';
  let shadowPatch: fabric.Shadow | null | undefined = undefined;
  let hasGlow = false;

  if (config.type === 'dashed') {
    dashArray = [Math.max(6, Math.round(width * 2.5)), Math.max(4, Math.round(width * 1.4))];
    lineCap = 'butt';
  } else if (config.type === 'dotted') {
    dashArray = [Math.max(1, Math.round(width * 0.4)), Math.max(3, Math.round(width * 1.8))];
    lineCap = 'round';
  } else if (config.type === 'double') {
    hasGlow = true;
    shadowPatch = new fabric.Shadow({
      color,
      blur: Math.max(6, Math.round(width * 2.4)),
      offsetX: 0,
      offsetY: 0,
    });
  }

  const updateObj: Record<string, any> = {
    stroke: color,
    strokeWidth: width,
    strokeDashArray: dashArray,
    strokeLineCap: lineCap,
    strokeLineJoin: 'round',
    paintFirst: 'stroke',
  };

  if (hasGlow && shadowPatch) {
    updateObj.shadow = shadowPatch;
    (obj as any).__scribeOutlineGlow = true;
  } else if ((obj as any).__scribeOutlineGlow) {
    updateObj.shadow = null;
    (obj as any).__scribeOutlineGlow = false;
  }

  obj.set(updateObj);
  obj.set('dirty', true);
  obj.setCoords();
}

export function cycleTextAlignment(
  current?: string
): 'left' | 'center' | 'right' {
  const norm = (current || 'left').toLowerCase();
  if (norm === 'left') return 'center';
  if (norm === 'center') return 'right';
  return 'left';
}

const BULLET_LINE_REGEX = /^(\s*)(?:[•\-*]\s+)/;

export function isTextBulleted(text: string): boolean {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) return false;
  return lines.every((line) => BULLET_LINE_REGEX.test(line));
}

export function toggleBulletedListText(text: string): {
  nextText: string;
  isBulleted: boolean;
} {
  const currentlyBulleted = isTextBulleted(text);
  const lines = text.split('\n');

  if (currentlyBulleted) {
    const nextLines = lines.map((line) => line.replace(BULLET_LINE_REGEX, '$1'));
    return { nextText: nextLines.join('\n'), isBulleted: false };
  }

  const nextLines = lines.map((line) => {
    if (!line.trim()) return line;
    if (BULLET_LINE_REGEX.test(line)) return line;
    const leadingWs = line.match(/^\s*/)?.[0] || '';
    return `${leadingWs}• ${line.slice(leadingWs.length)}`;
  });
  return { nextText: nextLines.join('\n'), isBulleted: true };
}

export function getTextCaseMode(obj: fabric.FabricObject): TextCaseMode {
  const mode = (obj as any).__scribeTextCaseMode as TextCaseMode | undefined;
  if (mode === 'uppercase' || mode === 'lowercase' || mode === 'normal') {
    return mode;
  }
  return 'normal';
}

export function cycleTextCapitalization(obj: fabric.FabricObject): {
  nextText: string;
  mode: TextCaseMode;
} {
  const currentText = String((obj as any).text || '');
  const currentMode = getTextCaseMode(obj);

  // Cache original text before transforming away from 'normal'
  if (currentMode === 'normal' || typeof (obj as any).__scribeOriginalText !== 'string') {
    (obj as any).__scribeOriginalText = currentText;
  }

  let nextMode: TextCaseMode = 'uppercase';
  if (currentMode === 'uppercase') {
    nextMode = 'lowercase';
  } else if (currentMode === 'lowercase') {
    nextMode = 'normal';
  }

  let nextText = currentText;
  if (nextMode === 'uppercase') {
    nextText = currentText.toUpperCase();
  } else if (nextMode === 'lowercase') {
    nextText = currentText.toLowerCase();
  } else {
    const orig = (obj as any).__scribeOriginalText;
    nextText =
      typeof orig === 'string' && orig.length === currentText.length
        ? orig
        : currentText.replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  (obj as any).__scribeTextCaseMode = nextMode;
  return { nextText, mode: nextMode };
}

export function fitTextBoxWidthToContent(
  obj: fabric.FabricObject,
  maxWidth: number = 2400
): number {
  const tb = obj as fabric.Textbox;
  const rawText = String((tb as any).text || '');
  const lines = rawText.split('\n');
  let widest = 80;

  if (typeof (tb as any).measureLine === 'function') {
    for (let i = 0; i < Math.max(1, lines.length); i++) {
      // Measure width of logical paragraph lines using internal Fabric text measurement when available
      if ((tb as any)._textLines && i < (tb as any)._textLines.length) {
        const w = typeof tb.getLineWidth === 'function' ? tb.getLineWidth(i) : 0;
        if (w > widest) widest = w;
      }
    }
    // Check if wrapping occurred by comparing with font-size heuristic for unwrapped line
    const longestCharCount = Math.max(...lines.map((l) => l.length), 1);
    const estFullWidth = longestCharCount * ((tb.fontSize || 24) * 0.62);
    widest = Math.max(widest, estFullWidth);
  } else {
    const longestCharCount = Math.max(...lines.map((l) => l.length), 1);
    widest = longestCharCount * (((tb as any).fontSize || 24) * 0.62);
  }

  const nextWidth = Math.max(60, Math.min(maxWidth, Math.ceil(widest + 16)));
  tb.set({ width: nextWidth });
  if (typeof tb.initDimensions === 'function') tb.initDimensions();
  tb.setCoords();
  return nextWidth;
}

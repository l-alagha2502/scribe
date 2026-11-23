import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { icons as LUCIDE_ICONS, LucideIcon } from 'lucide-react';

export type VectorIconCategory =
  | 'All'
  | 'UI & Arrows'
  | 'Media'
  | 'Social & Communication'
  | 'Shapes & Badges'
  | 'Tools';

export type IconFillMode = 'none' | 'soft' | 'solid';

export const VECTOR_ICON_CATEGORIES: VectorIconCategory[] = [
  'All',
  'UI & Arrows',
  'Media',
  'Social & Communication',
  'Shapes & Badges',
  'Tools',
];

export interface VectorIconItem {
  id: string;
  key: string;
  name: string;
  category: Exclude<VectorIconCategory, 'All'>;
  tags: string[];
  Component: LucideIcon;
}

const PRIORITY_ICON_KEYS = [
  'Heart',
  'Star',
  'Sparkles',
  'ArrowRight',
  'ArrowUpRight',
  'ArrowLeft',
  'ArrowDown',
  'ArrowUp',
  'Check',
  'CheckCircle2',
  'Search',
  'Bell',
  'Bookmark',
  'Camera',
  'Image',
  'Video',
  'Music',
  'Play',
  'Mic',
  'Volume2',
  'Share2',
  'Send',
  'MessageCircle',
  'Mail',
  'ThumbsUp',
  'Globe',
  'User',
  'Users',
  'Zap',
  'Flame',
  'Crown',
  'Shield',
  'ShieldCheck',
  'Award',
  'Trophy',
  'BadgeCheck',
  'BadgePercent',
  'Sun',
  'Moon',
  'Compass',
  'MapPin',
  'Lock',
  'Unlock',
  'Settings',
  'Sliders',
  'SlidersHorizontal',
  'Wrench',
  'Hammer',
  'Scissors',
  'PenTool',
  'Brush',
  'Palette',
  'Layers',
  'LayoutGrid',
  'Box',
  'Hexagon',
  'Circle',
  'Triangle',
  'Square',
  'Diamond',
  'ShoppingBag',
  'ShoppingCart',
  'Tag',
  'CreditCard',
  'Rocket',
  'Target',
  'Eye',
  'Code',
  'Terminal',
  'Cpu',
  'Download',
  'Upload',
  'FolderOpen',
  'FileText',
  'Calendar',
  'Clock',
  'TrendingUp',
];

const PRIORITY_RANK = new Map<string, number>(
  PRIORITY_ICON_KEYS.map((k, idx) => [k, idx])
);

const SYNONYM_TAGS: Record<string, string[]> = {
  heart: ['love', 'like', 'favorite', 'social'],
  star: ['rating', 'favorite', 'review', 'badge'],
  search: ['find', 'lookup', 'magnifier', 'explore'],
  zap: ['lightning', 'flash', 'energy', 'power', 'fast'],
  sparkles: ['magic', 'ai', 'shine', 'glow'],
  bell: ['notification', 'alert', 'alarm'],
  send: ['paper-plane', 'message', 'share', 'dm'],
  mail: ['email', 'inbox', 'letter'],
  'message-circle': ['chat', 'comment', 'talk'],
  'pen-tool': ['vector', 'bezier', 'draw', 'design'],
  scissors: ['cut', 'trim', 'crop'],
  sliders: ['controls', 'settings', 'adjust'],
  'thumbs-up': ['approve', 'like', 'agree'],
  crown: ['vip', 'king', 'queen', 'premium'],
  award: ['prize', 'ribbon', 'winner'],
  shield: ['security', 'safe', 'trust'],
  camera: ['photo', 'picture', 'capture'],
  film: ['movie', 'cinema', 'reel', 'video'],
  tag: ['price', 'sale', 'discount', 'label'],
};

function splitPascalCase(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
    .trim()
    .split(/\s+/);
}

function classifyLucideIcon(
  id: string,
  wordsLower: string[]
): Exclude<VectorIconCategory, 'All'> {
  const joined = id;

  // 1. Media
  if (
    /(camera|image|photo|video|film|clapperboard|music|audio|disc|radio|mic|volume|headphones|speaker|play|pause|stop|skip|rewind|fast-forward|tv|monitor|cast|airplay|aperture|focus|contrast|palette|paintbrush|brush|eraser|pipette|layers|crop|gallery|album|podcast)/.test(
      joined
    )
  ) {
    return 'Media';
  }

  // 2. Social & Communication
  if (
    /(message|mail|inbox|send|share|chat|phone|call|voicemail|user|users|contact|smile|laugh|frown|meh|thumbs|heart|handshake|globe|at-sign|hash|megaphone|rss|bell|notification|podcast|quote|speech|forum|instagram|twitter|facebook|linkedin|youtube|github|twitch|slack)/.test(
      joined
    )
  ) {
    return 'Social & Communication';
  }

  // 3. Shapes & Badges
  if (
    /(badge|award|trophy|medal|crown|gem|diamond|star|sparkle|flame|sun|moon|cloud|flower|clover|leaf|circle|square|triangle|hexagon|octagon|pentagon|cone|cylinder|pyramid|box|cuboid|shield|verified|seal|ribbon|flag|bookmark|tag|tags|ticket|sticker|stamp|shapes)/.test(
      joined
    )
  ) {
    return 'Shapes & Badges';
  }

  // 4. Tools
  if (
    /(wrench|hammer|screwdriver|drill|axe|pickaxe|ruler|pencil|pen|highlighter|scissors|sliders|settings|cog|gear|filter|magnet|key|lock|unlock|flashlight|compass|calculator|terminal|code|bug|database|server|cpu|hard-drive|plug|battery|gauge|scale|anchor|paperclip|pin|briefcase|folder|file|clipboard|trash|download|upload|printer|scan|qr|barcode|search|zoom)/.test(
      joined
    )
  ) {
    return 'Tools';
  }

  // 5. UI & Arrows
  if (
    wordsLower.some((w) =>
      [
        'arrow',
        'chevron',
        'corner',
        'move',
        'undo',
        'redo',
        'refresh',
        'rotate',
        'repeat',
        'shuffle',
        'check',
        'plus',
        'minus',
        'x',
        'menu',
        'grid',
        'layout',
        'panel',
        'sidebar',
        'tab',
        'maximize',
        'minimize',
        'expand',
        'shrink',
        'align',
        'list',
        'home',
        'external',
        'link',
        'eye',
        'toggle',
        'cursor',
        'pointer',
        'hand',
        'navigation',
      ].includes(w)
    )
  ) {
    return 'UI & Arrows';
  }

  return 'UI & Arrows';
}

function buildCatalog(): VectorIconItem[] {
  const entries = Object.entries(LUCIDE_ICONS) as [string, LucideIcon][];

  const items: VectorIconItem[] = entries.map(([key, Component]) => {
    const words = splitPascalCase(key);
    const wordsLower = words.map((w) => w.toLowerCase());
    const id = wordsLower.join('-');
    const name = words.join(' ');
    const category = classifyLucideIcon(id, wordsLower);
    const extraTags = SYNONYM_TAGS[id] || [];

    return {
      id,
      key,
      name,
      category,
      tags: Array.from(new Set([...wordsLower, ...extraTags, category.toLowerCase()])),
      Component,
    };
  });

  // Sort curated high-frequency icons first, then alphabetically
  items.sort((a, b) => {
    const rankA = PRIORITY_RANK.get(a.key);
    const rankB = PRIORITY_RANK.get(b.key);
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });

  return items;
}

export const VECTOR_ICON_CATALOG: VectorIconItem[] = buildCatalog();

/**
 * Determines whether an SVG path `d` string represents a closed silhouette
 * (either explicitly via `Z/z`, or geometrically by returning within 1.5 units
 * of the subpath start point across curved/multi-segment strokes like Lucide's `heart`, `moon`, `bell`).
 * Open strokes (`arrow-right`, `check`, `lock` shackle, `mail` flap) return `false`
 * so applying a fill never creates unwanted chord/triangle blobs.
 */
export function isSvgPathClosed(d: string): boolean {
  if (!d) return false;
  if (/[zZ]/.test(d)) return true;

  const cmdRe = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  const numRe = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;

  let curX = 0;
  let curY = 0;
  let subStartX = 0;
  let subStartY = 0;
  let hasClosedSubpath = false;
  let segmentCount = 0;

  let match: RegExpExecArray | null;
  while ((match = cmdRe.exec(d)) !== null) {
    const cmd = match[1];
    const argsStr = match[2] || '';
    const isRel = cmd === cmd.toLowerCase();
    const upper = cmd.toUpperCase();

    if (upper === 'Z') {
      return true;
    }

    // Special handling for Arc flags which can be packed without whitespace
    let nums: number[] = [];
    if (upper === 'A') {
      const tokens = argsStr.match(numRe) || [];
      nums = tokens.map(Number);
    } else {
      const tokens = argsStr.match(numRe) || [];
      nums = tokens.map(Number);
    }

    let idx = 0;
    let effectiveCmd = upper;

    if (upper === 'M') {
      if (nums.length >= 2) {
        if (segmentCount >= 2 && Math.hypot(curX - subStartX, curY - subStartY) <= 1.5) {
          hasClosedSubpath = true;
        }
        curX = isRel ? curX + nums[0] : nums[0];
        curY = isRel ? curY + nums[1] : nums[1];
        subStartX = curX;
        subStartY = curY;
        idx = 2;
        segmentCount = 0;
        effectiveCmd = 'L';
      }
    }

    while (idx < nums.length) {
      switch (effectiveCmd) {
        case 'L':
        case 'T':
          if (idx + 1 >= nums.length) {
            idx = nums.length;
            break;
          }
          curX = isRel ? curX + nums[idx] : nums[idx];
          curY = isRel ? curY + nums[idx + 1] : nums[idx + 1];
          idx += 2;
          segmentCount++;
          break;
        case 'H':
          curX = isRel ? curX + nums[idx] : nums[idx];
          idx += 1;
          segmentCount++;
          break;
        case 'V':
          curY = isRel ? curY + nums[idx] : nums[idx];
          idx += 1;
          segmentCount++;
          break;
        case 'C':
          if (idx + 5 >= nums.length) {
            idx = nums.length;
            break;
          }
          curX = isRel ? curX + nums[idx + 4] : nums[idx + 4];
          curY = isRel ? curY + nums[idx + 5] : nums[idx + 5];
          idx += 6;
          segmentCount++;
          break;
        case 'S':
        case 'Q':
          if (idx + 3 >= nums.length) {
            idx = nums.length;
            break;
          }
          curX = isRel ? curX + nums[idx + 2] : nums[idx + 2];
          curY = isRel ? curY + nums[idx + 3] : nums[idx + 3];
          idx += 4;
          segmentCount++;
          break;
        case 'A':
          if (idx + 6 >= nums.length) {
            idx = nums.length;
            break;
          }
          curX = isRel ? curX + nums[idx + 5] : nums[idx + 5];
          curY = isRel ? curY + nums[idx + 6] : nums[idx + 6];
          idx += 7;
          segmentCount++;
          break;
        default:
          idx = nums.length;
          break;
      }
    }
  }

  if (segmentCount >= 2 && Math.hypot(curX - subStartX, curY - subStartY) <= 1.5) {
    hasClosedSubpath = true;
  }

  return hasClosedSubpath;
}

const CLOSED_PRIMITIVE_TAGS = new Set(['circle', 'ellipse', 'rect', 'polygon']);

/**
 * Checks whether an individual SVG child tag (`<path ...>`, `<circle ...>`, etc.)
 * can be cleanly filled without creating bogus open-stroke chords.
 */
export function isSvgShapeTagFillable(tagName: string, attrs: string): boolean {
  const lowerTag = tagName.toLowerCase();
  if (CLOSED_PRIMITIVE_TAGS.has(lowerTag)) return true;
  if (lowerTag === 'path') {
    const dMatch = attrs.match(/\bd="([^"]*)"/i);
    return dMatch ? isSvgPathClosed(dMatch[1]) : false;
  }
  return false;
}

/**
 * Post-processes Lucide SVG markup so that fillable closed shapes receive the active
 * fill color (with `'soft'` 0.28 or `'solid'` 1.0 opacity) while open strokes
 * (`line`, `polyline`, open `path` like arrowheads/checkmarks) remain crisp outlines.
 */
export function applySmartFillToIconMarkup(
  rawMarkup: string,
  fillColor: string,
  fillMode: IconFillMode
): string {
  if (fillMode === 'none' || !fillColor || fillColor === 'none' || fillColor === 'transparent') {
    return rawMarkup;
  }

  const fillOpacityAttr = fillMode === 'soft' ? ' fill-opacity="0.28"' : '';
  const rootOpenMatch = rawMarkup.match(/^<svg\b[^>]*>/i);
  if (!rootOpenMatch) return rawMarkup;

  const rootEndIdx = rootOpenMatch[0].length;
  const closeIdx = rawMarkup.lastIndexOf('</svg>');
  if (closeIdx === -1) return rawMarkup;

  // Keep root <svg> fill="none" so only explicitly fillable children inherit fill
  const normalizedRoot = /\bfill="/i.test(rootOpenMatch[0])
    ? rootOpenMatch[0].replace(/\bfill="[^"]*"/i, 'fill="none"')
    : rootOpenMatch[0].replace(/>$/, ' fill="none">');

  const inner = rawMarkup.slice(rootEndIdx, closeIdx);
  const processedInner = inner.replace(
    /<(path|circle|ellipse|rect|polygon|polyline|line)\b([^>]*?)(\/?)>/gi,
    (_full, tag: string, attrs: string, selfClose: string) => {
      const cleanAttrs = attrs
        .replace(/\sfill="[^"]*"/gi, '')
        .replace(/\sfill-opacity="[^"]*"/gi, '')
        .replace(/\sdata-fillable="[^"]*"/gi, '');

      const fillable = isSvgShapeTagFillable(tag, attrs);
      if (fillable) {
        return `<${tag}${cleanAttrs} fill="${fillColor}"${fillOpacityAttr} data-fillable="true"${selfClose}>`;
      }
      return `<${tag}${cleanAttrs} fill="none" data-fillable="false"${selfClose}>`;
    }
  );

  return `${normalizedRoot}${processedInner}</svg>`;
}

/**
 * Returns true if the icon contains at least one closed shape/path that can be filled.
 */
const fillabilityCache = new Map<string, boolean>();
export function isVectorIconFillable(icon: VectorIconItem): boolean {
  const cached = fillabilityCache.get(icon.id);
  if (cached !== undefined) return cached;

  const raw = renderToStaticMarkup(
    React.createElement(icon.Component, {
      width: 24,
      height: 24,
      viewBox: '0 0 24 24',
      fill: 'none',
    })
  );
  const matches = Array.from(
    raw.matchAll(/<(path|circle|ellipse|rect|polygon|polyline|line)\b([^>]*?)(\/?)>/gi)
  );
  const canFill = matches.some((m) => isSvgShapeTagFillable(m[1], m[2]));
  fillabilityCache.set(icon.id, canFill);
  return canFill;
}

export interface BuildIconSvgOptions {
  fill?: string;
  fillMode?: IconFillMode;
  strokeWidth?: number;
}

const svgPreviewCache = new Map<string, string>();

/**
 * Generates clean, standalone scalable `<svg>` markup for Fabric.js `loadSVGFromString`.
 */
export function buildIconSvgString(
  icon: VectorIconItem,
  color: string = '#ffffff',
  size: number = 120,
  options?: BuildIconSvgOptions
): string {
  const strokeWidth = options?.strokeWidth ?? 2;
  const fillMode: IconFillMode =
    options?.fillMode ??
    (options?.fill && options.fill !== 'none' && options.fill !== 'transparent'
      ? 'solid'
      : 'none');
  const fillColor =
    fillMode === 'none'
      ? 'none'
      : options?.fill && options.fill !== 'none' && options.fill !== 'transparent'
      ? options.fill
      : color;

  let markup = renderToStaticMarkup(
    React.createElement(icon.Component, {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      color,
      stroke: color,
      strokeWidth,
      fill: 'none',
    })
  );

  if (!markup.includes('xmlns=')) {
    markup = markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  return applySmartFillToIconMarkup(markup, fillColor, fillMode);
}

/**
 * Cached inner SVG shapes markup for fast crisp preview rendering in the Icons browser grid.
 */
export function buildIconPreviewSvgMarkup(
  icon: VectorIconItem,
  color: string,
  strokeWidth: number,
  fillMode: IconFillMode
): string {
  const cacheKey = `${icon.id}|${color}|${strokeWidth}|${fillMode}`;
  const cached = svgPreviewCache.get(cacheKey);
  if (cached) return cached;

  const full = buildIconSvgString(icon, color, 20, {
    strokeWidth,
    fillMode,
    fill: fillMode === 'none' ? 'none' : color,
  });

  if (svgPreviewCache.size > 4000) {
    svgPreviewCache.clear();
  }
  svgPreviewCache.set(cacheKey, full);
  return full;
}

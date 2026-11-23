import { AssetRecord, CustomFontRecord, ProjectRecord, SavedTemplateRecord } from '../types';
import {
  buildScribeFilename,
  createScribePackage,
  downloadScribeFile,
  parseScribePackage,
  ScribeProjectPackage,
} from './scribePackage';
import {
  getAllTemplateRecords,
  saveTemplateRecord,
  deleteTemplateRecord,
} from './db';

export type TemplateFilterMode = 'all' | 'starred' | 'custom';

export interface SyncStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY_STARRED_IDS = 'scribe_template_starred_ids_v1';
const KEY_HIDDEN_STARTER_IDS = 'scribe_template_hidden_starters_v1';
const KEY_CUSTOM_TEMPLATES_FALLBACK = 'scribe_custom_templates_v1';

const memoryStorageMap = new Map<string, string>();
const memoryStorageFallback: SyncStorageLike = {
  getItem: (key) => memoryStorageMap.get(key) ?? null,
  setItem: (key, value) => {
    memoryStorageMap.set(key, value);
  },
};

function getSyncStorage(override?: SyncStorageLike): SyncStorageLike {
  if (override) return override;
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      return window.localStorage;
    }
  } catch {
    // ignore private-browsing access issues
  }
  return memoryStorageFallback;
}

function canUseIndexedDb(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof indexedDB !== 'undefined' &&
    indexedDB !== null
  );
}

function readIdSet(key: string, storage?: SyncStorageLike): Set<string> {
  const s = getSyncStorage(storage);
  try {
    const raw = s.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return new Set(arr.filter((v): v is string => typeof v === 'string'));
    }
  } catch {
    // ignore corrupt localStorage
  }
  return new Set();
}

function writeIdSet(key: string, ids: Set<string>, storage?: SyncStorageLike): void {
  const s = getSyncStorage(storage);
  try {
    s.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore quota error
  }
}

export function buildTemplatePreviewSvg(options: {
  title: string;
  subtitle: string;
  bgColor: string;
  inkColor: string;
  accentColor: string;
  layout?: 'editorial' | 'landscape' | 'vertical' | 'quote';
}): string {
  const {
    title,
    subtitle,
    bgColor,
    inkColor,
    accentColor,
    layout = 'landscape',
  } = options;

  const esc = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  let innerShapes = '';
  if (layout === 'editorial') {
    innerShapes = `
      <rect x="115" y="18" width="170" height="224" rx="4" fill="none" stroke="${accentColor}" stroke-opacity="0.35" stroke-width="1"/>
      <line x1="132" y1="68" x2="268" y2="68" stroke="${inkColor}" stroke-opacity="0.25" stroke-width="1"/>
      <rect x="132" y="110" width="90" height="6" rx="2" fill="${accentColor}"/>
      <text x="132" y="150" fill="${inkColor}" font-family="Georgia, serif" font-size="18" font-weight="700">${esc(title)}</text>
      <text x="132" y="170" fill="${inkColor}" fill-opacity="0.65" font-family="monospace" font-size="9">${esc(subtitle)}</text>
    `;
  } else if (layout === 'vertical') {
    innerShapes = `
      <rect x="148" y="16" width="104" height="228" rx="6" fill="none" stroke="${inkColor}" stroke-opacity="0.18" stroke-width="1"/>
      <rect x="162" y="42" width="32" height="4" rx="2" fill="${accentColor}"/>
      <text x="162" y="88" fill="${inkColor}" font-family="sans-serif" font-size="15" font-weight="700">${esc(title)}</text>
      <rect x="162" y="114" width="76" height="82" rx="4" fill="${inkColor}" fill-opacity="0.06" stroke="${accentColor}" stroke-opacity="0.45" stroke-width="1"/>
      <text x="162" y="218" fill="${inkColor}" fill-opacity="0.65" font-family="monospace" font-size="8.5">${esc(subtitle)}</text>
    `;
  } else if (layout === 'quote') {
    innerShapes = `
      <rect x="92" y="22" width="216" height="216" rx="4" fill="none" stroke="${inkColor}" stroke-opacity="0.2" stroke-width="1"/>
      <circle cx="200" cy="70" r="14" fill="none" stroke="${accentColor}" stroke-width="1.5"/>
      <text x="200" y="128" text-anchor="middle" fill="${inkColor}" font-family="Georgia, serif" font-size="16" font-weight="600">${esc(title)}</text>
      <line x1="168" y1="146" x2="232" y2="146" stroke="${accentColor}" stroke-width="1.5"/>
      <text x="200" y="168" text-anchor="middle" fill="${inkColor}" fill-opacity="0.65" font-family="monospace" font-size="9">${esc(subtitle)}</text>
    `;
  } else {
    innerShapes = `
      <rect x="28" y="28" width="344" height="204" rx="6" fill="none" stroke="${inkColor}" stroke-opacity="0.14" stroke-width="1"/>
      <rect x="46" y="54" width="44" height="5" rx="2" fill="${accentColor}"/>
      <text x="46" y="106" fill="${inkColor}" font-family="sans-serif" font-size="22" font-weight="700">${esc(title)}</text>
      <text x="46" y="132" fill="${inkColor}" fill-opacity="0.68" font-family="sans-serif" font-size="11">${esc(subtitle)}</text>
      <rect x="46" y="164" width="110" height="26" rx="4" fill="${accentColor}"/>
      <circle cx="318" cy="130" r="36" fill="none" stroke="${accentColor}" stroke-opacity="0.35" stroke-width="1.5"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
    <rect width="400" height="260" fill="${bgColor}"/>
    ${innerShapes}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Default template library starts completely empty (`[]`).
 * Only templates explicitly imported or saved by the user appear.
 */
export const BUILT_IN_STARTER_TEMPLATES: SavedTemplateRecord[] = [];

async function readCustomTemplatesFromStore(
  storage?: SyncStorageLike
): Promise<SavedTemplateRecord[]> {
  if (canUseIndexedDb()) {
    try {
      const fromDb = await getAllTemplateRecords();
      if (fromDb.length > 0) return fromDb;
    } catch {
      // fall through to localStorage fallback
    }
  }

  const s = getSyncStorage(storage);
  try {
    const raw = s.getItem(KEY_CUSTOM_TEMPLATES_FALLBACK);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedTemplateRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeCustomTemplateToStore(
  record: SavedTemplateRecord,
  storage?: SyncStorageLike
): Promise<void> {
  if (canUseIndexedDb()) {
    try {
      await saveTemplateRecord(record);
    } catch {
      // ignore IndexedDB error and still mirror to localStorage below
    }
  }

  const s = getSyncStorage(storage);
  try {
    const raw = s.getItem(KEY_CUSTOM_TEMPLATES_FALLBACK);
    const existing: SavedTemplateRecord[] = raw ? JSON.parse(raw) : [];
    const next = [record, ...existing.filter((t) => t.id !== record.id)];
    s.setItem(KEY_CUSTOM_TEMPLATES_FALLBACK, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
}

async function removeCustomTemplateFromStore(
  id: string,
  storage?: SyncStorageLike
): Promise<void> {
  if (canUseIndexedDb()) {
    try {
      await deleteTemplateRecord(id);
    } catch {
      // ignore IndexedDB error
    }
  }

  const s = getSyncStorage(storage);
  try {
    const raw = s.getItem(KEY_CUSTOM_TEMPLATES_FALLBACK);
    if (!raw) return;
    const existing: SavedTemplateRecord[] = JSON.parse(raw);
    const next = existing.filter((t) => t.id !== id);
    s.setItem(KEY_CUSTOM_TEMPLATES_FALLBACK, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function countHiddenStarterTemplates(storage?: SyncStorageLike): number {
  const hidden = readIdSet(KEY_HIDDEN_STARTER_IDS, storage);
  return BUILT_IN_STARTER_TEMPLATES.filter((t) => hidden.has(t.id)).length;
}

export async function loadTemplateLibrary(
  storage?: SyncStorageLike
): Promise<SavedTemplateRecord[]> {
  const starredIds = readIdSet(KEY_STARRED_IDS, storage);
  const hiddenStarterIds = readIdSet(KEY_HIDDEN_STARTER_IDS, storage);
  const customTemplates = await readCustomTemplatesFromStore(storage);

  const visibleStarters = BUILT_IN_STARTER_TEMPLATES.filter(
    (t) => !hiddenStarterIds.has(t.id)
  ).map((t) => ({
    ...t,
    isBuiltIn: true,
    isStarred: starredIds.has(t.id),
  }));

  const normalizedCustom = customTemplates.map((t) => ({
    ...t,
    isBuiltIn: false,
    isStarred: starredIds.has(t.id) || Boolean(t.isStarred),
  }));

  return [...normalizedCustom, ...visibleStarters];
}

export function sortAndFilterTemplates(
  templates: SavedTemplateRecord[],
  options: {
    filter: TemplateFilterMode;
    searchQuery?: string;
  }
): SavedTemplateRecord[] {
  const q = (options.searchQuery || '').trim().toLowerCase();

  return templates
    .filter((tmpl) => {
      if (options.filter === 'starred' && !tmpl.isStarred) return false;
      if (options.filter === 'custom' && tmpl.isBuiltIn) return false;
      if (!q) return true;
      return (
        tmpl.name.toLowerCase().includes(q) ||
        tmpl.category.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Starred templates pinned first
      if (a.isStarred !== b.isStarred) {
        return a.isStarred ? -1 : 1;
      }
      // Custom/imported templates before starter defaults or newest updated first
      if (a.isBuiltIn !== b.isBuiltIn) {
        return a.isBuiltIn ? 1 : -1;
      }
      return b.updatedAt - a.updatedAt;
    });
}

function extractBackgroundColorFromFabricJson(fabricJson: string): string {
  try {
    const parsed = JSON.parse(fabricJson);
    if (typeof parsed?.background === 'string' && parsed.background.trim()) {
      return parsed.background;
    }
    if (typeof parsed?.backgroundColor === 'string' && parsed.backgroundColor.trim()) {
      return parsed.backgroundColor;
    }
  } catch {
    // ignore
  }
  return '#08080a';
}

export async function importScribeTextAsTemplate(
  rawJson: string,
  storage?: SyncStorageLike
): Promise<{ template: SavedTemplateRecord; pkg: ScribeProjectPackage }> {
  const pkg = parseScribePackage(rawJson);
  const now = Date.now();
  const bg = extractBackgroundColorFromFabricJson(pkg.project.fabricJson);
  const w = pkg.project.width || pkg.meta.canvasWidth || 1080;
  const h = pkg.project.height || pkg.meta.canvasHeight || 1080;
  const name = (pkg.project.name || 'Imported .scribe').trim();

  const thumb =
    pkg.project.thumbnail && pkg.project.thumbnail.trim()
      ? pkg.project.thumbnail
      : pkg.meta.previewUrl && pkg.meta.previewUrl.trim()
      ? pkg.meta.previewUrl
      : buildTemplatePreviewSvg({
          title: name,
          subtitle: `${w} × ${h} · Imported .scribe`,
          bgColor: bg.startsWith('#') ? bg : '#0d0f17',
          inkColor: bg.toLowerCase() === '#ffffff' || bg.toLowerCase().startsWith('#f') ? '#111216' : '#f8fafc',
          accentColor: '#6366f1',
          layout: h > w ? 'editorial' : 'landscape',
        });

  const record: SavedTemplateRecord = {
    id: `tmpl_scribe_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    category: 'Imported .scribe',
    width: w,
    height: h,
    unit: pkg.project.unit || 'px',
    dpi: pkg.project.dpi || 72,
    type: pkg.project.type || 'graphic',
    fabricJson: pkg.project.fabricJson,
    backgroundColor: bg,
    thumbnail: thumb,
    isBuiltIn: false,
    isStarred: false,
    createdAt: now,
    updatedAt: now,
    scribeJson: JSON.stringify(pkg),
  };

  await writeCustomTemplateToStore(record, storage);
  return { template: record, pkg };
}

export async function saveProjectAsLibraryTemplate(
  project: ProjectRecord,
  storage?: SyncStorageLike,
  allAssets: AssetRecord[] = [],
  allFonts: CustomFontRecord[] = []
): Promise<SavedTemplateRecord> {
  const now = Date.now();
  const pkg = createScribePackage(project, allAssets, allFonts);
  const bg = extractBackgroundColorFromFabricJson(project.fabricJson);
  const w = project.width || 1080;
  const h = project.height || 1080;
  const name = (project.name || 'Saved Artboard').trim();

  const thumb =
    project.thumbnail && project.thumbnail.trim()
      ? project.thumbnail
      : buildTemplatePreviewSvg({
          title: name,
          subtitle: `${w} × ${h} · Saved`,
          bgColor: bg.startsWith('#') ? bg : '#0b0d12',
          inkColor: '#f8fafc',
          accentColor: '#10b981',
          layout: h > w ? 'editorial' : 'landscape',
        });

  const record: SavedTemplateRecord = {
    id: `tmpl_saved_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    category: 'Saved Artboard',
    width: w,
    height: h,
    unit: project.unit || 'px',
    dpi: project.dpi || 72,
    type: project.type || 'graphic',
    fabricJson: project.fabricJson,
    backgroundColor: bg,
    thumbnail: thumb,
    isBuiltIn: false,
    isStarred: false,
    createdAt: now,
    updatedAt: now,
    scribeJson: JSON.stringify(pkg),
  };

  await writeCustomTemplateToStore(record, storage);
  return record;
}

export async function saveTemplateLocallyAndDownload(
  project: ProjectRecord,
  allAssets: AssetRecord[] = [],
  allFonts: CustomFontRecord[] = [],
  options?: {
    storage?: SyncStorageLike;
    triggerDownload?: boolean;
  }
): Promise<{ record: SavedTemplateRecord; filename: string }> {
  const record = await saveProjectAsLibraryTemplate(
    project,
    options?.storage,
    allAssets,
    allFonts
  );
  const filename = buildScribeFilename(project.name);

  const shouldDownload = options?.triggerDownload !== false;
  if (
    shouldDownload &&
    typeof document !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  ) {
    downloadScribeFile(project, allAssets, allFonts);
  }

  return { record, filename };
}

export async function toggleStarTemplate(
  templateId: string,
  storage?: SyncStorageLike
): Promise<boolean> {
  const starred = readIdSet(KEY_STARRED_IDS, storage);
  const nextStarred = !starred.has(templateId);
  if (nextStarred) {
    starred.add(templateId);
  } else {
    starred.delete(templateId);
  }
  writeIdSet(KEY_STARRED_IDS, starred, storage);

  // Sync flag on custom template record if stored
  const customs = await readCustomTemplatesFromStore(storage);
  const match = customs.find((t) => t.id === templateId);
  if (match) {
    await writeCustomTemplateToStore(
      { ...match, isStarred: nextStarred, updatedAt: Date.now() },
      storage
    );
  }

  return nextStarred;
}

export async function deleteTemplateFromLibrary(
  template: Pick<SavedTemplateRecord, 'id' | 'isBuiltIn'>,
  storage?: SyncStorageLike
): Promise<void> {
  const starred = readIdSet(KEY_STARRED_IDS, storage);
  if (starred.has(template.id)) {
    starred.delete(template.id);
    writeIdSet(KEY_STARRED_IDS, starred, storage);
  }

  if (template.isBuiltIn) {
    const hidden = readIdSet(KEY_HIDDEN_STARTER_IDS, storage);
    hidden.add(template.id);
    writeIdSet(KEY_HIDDEN_STARTER_IDS, hidden, storage);
    return;
  }

  await removeCustomTemplateFromStore(template.id, storage);
}

export function restoreStarterTemplates(storage?: SyncStorageLike): void {
  writeIdSet(KEY_HIDDEN_STARTER_IDS, new Set(), storage);
}

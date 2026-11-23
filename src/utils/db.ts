import {
  ProjectRecord,
  AssetRecord,
  BrandRecord,
  CustomFontRecord,
  SavedTemplateRecord,
} from '../types';

const DB_NAME = 'scribe_design_studio_db';
const DB_VERSION = 3;

const STORES = {
  PROJECTS: 'projects',
  ASSETS: 'assets',
  BRANDS: 'brands',
  FONTS: 'custom_fonts',
  TEMPLATES: 'templates',
} as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        projectStore.createIndex('isFavorite', 'isFavorite', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.ASSETS)) {
        const assetStore = db.createObjectStore(STORES.ASSETS, { keyPath: 'id' });
        assetStore.createIndex('createdAt', 'createdAt', { unique: false });
        assetStore.createIndex('category', 'category', { unique: false });
        assetStore.createIndex('isFavorite', 'isFavorite', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.BRANDS)) {
        const brandStore = db.createObjectStore(STORES.BRANDS, { keyPath: 'id' });
        brandStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.FONTS)) {
        const fontStore = db.createObjectStore(STORES.FONTS, { keyPath: 'id' });
        fontStore.createIndex('name', 'name', { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
        const templateStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
        templateStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (event.oldVersion < 3 && db.objectStoreNames.contains(STORES.ASSETS)) {
        const assetStore = (event.target as IDBOpenDBRequest).transaction?.objectStore(STORES.ASSETS);
        if (assetStore) {
          for (const legacyId of [
            'asset_scribe_logo_white',
            'asset_scribe_logo_black',
            'asset_brutalist_star',
            'asset_raw_hero_photo',
          ]) {
            assetStore.delete(legacyId);
          }
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generic transaction helpers
async function performTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest | void
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);

    tx.oncomplete = () => {
      if (request) {
        resolve(request.result);
      } else {
        resolve(undefined as unknown as T);
      }
    };
    tx.onerror = () => reject(tx.error);
  });
}

// ----------------- Projects API -----------------

export async function getAllProjects(): Promise<ProjectRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PROJECTS, 'readonly');
    const store = tx.objectStore(STORES.PROJECTS);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = (request.result || []) as ProjectRecord[];
      // Sort by updatedAt descending
      results.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PROJECTS, 'readonly');
    const store = tx.objectStore(STORES.PROJECTS);
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as ProjectRecord) || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: ProjectRecord): Promise<void> {
  await performTx(STORES.PROJECTS, 'readwrite', (store) => {
    store.put(project);
  });
}

export async function deleteProject(id: string): Promise<void> {
  await performTx(STORES.PROJECTS, 'readwrite', (store) => {
    store.delete(id);
  });
}

export async function toggleFavoriteProject(id: string): Promise<boolean> {
  const project = await getProjectById(id);
  if (!project) return false;
  project.isFavorite = !project.isFavorite;
  project.updatedAt = Date.now();
  await saveProject(project);
  return project.isFavorite;
}

// ----------------- Assets & Files API -----------------

export async function getAllAssets(): Promise<AssetRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ASSETS, 'readonly');
    const store = tx.objectStore(STORES.ASSETS);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = (request.result || []) as AssetRecord[];
      results.sort((a, b) => b.createdAt - a.createdAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveAsset(asset: AssetRecord): Promise<void> {
  await performTx(STORES.ASSETS, 'readwrite', (store) => {
    store.put(asset);
  });
}

export async function deleteAsset(id: string): Promise<void> {
  await performTx(STORES.ASSETS, 'readwrite', (store) => {
    store.delete(id);
  });
}

export async function toggleFavoriteAsset(id: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ASSETS, 'readwrite');
    const store = tx.objectStore(STORES.ASSETS);
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result as AssetRecord | undefined;
      if (!item) {
        resolve(false);
        return;
      }
      item.isFavorite = !item.isFavorite;
      store.put(item);
      resolve(item.isFavorite);
    };
    req.onerror = () => reject(req.error);
  });
}

// ----------------- Brands API -----------------

export async function getAllBrands(): Promise<BrandRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.BRANDS, 'readonly');
    const store = tx.objectStore(STORES.BRANDS);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = (request.result || []) as BrandRecord[];
      results.sort((a, b) => b.createdAt - a.createdAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveBrand(brand: BrandRecord): Promise<void> {
  await performTx(STORES.BRANDS, 'readwrite', (store) => {
    store.put(brand);
  });
}

export async function deleteBrand(id: string): Promise<void> {
  await performTx(STORES.BRANDS, 'readwrite', (store) => {
    store.delete(id);
  });
}

// ----------------- Custom Fonts API -----------------

export async function getAllCustomFonts(): Promise<CustomFontRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FONTS, 'readonly');
    const store = tx.objectStore(STORES.FONTS);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result || []) as CustomFontRecord[]);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomFont(font: CustomFontRecord): Promise<void> {
  await performTx(STORES.FONTS, 'readwrite', (store) => {
    store.put(font);
  });
}

export async function deleteCustomFont(id: string): Promise<void> {
  await performTx(STORES.FONTS, 'readwrite', (store) => {
    store.delete(id);
  });
}

// ----------------- Templates API -----------------

export async function getAllTemplateRecords(): Promise<SavedTemplateRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TEMPLATES, 'readonly');
    const store = tx.objectStore(STORES.TEMPLATES);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = (request.result || []) as SavedTemplateRecord[];
      results.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTemplateRecord(template: SavedTemplateRecord): Promise<void> {
  await performTx(STORES.TEMPLATES, 'readwrite', (store) => {
    store.put(template);
  });
}

export async function deleteTemplateRecord(id: string): Promise<void> {
  await performTx(STORES.TEMPLATES, 'readwrite', (store) => {
    store.delete(id);
  });
}

// Helper to register stored custom fonts into document.fonts
export async function loadSavedCustomFonts(): Promise<string[]> {
  try {
    const fonts = await getAllCustomFonts();
    const loadedNames: string[] = [];
    for (const f of fonts) {
      try {
        const fontFace = new FontFace(f.name, `url(${f.fontDataUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        loadedNames.push(f.name);
      } catch (err) {
        console.warn(`Could not load custom font ${f.name}:`, err);
      }
    }
    return loadedNames;
  } catch {
    return [];
  }
}

// ----------------- Initial Seed Data Generator -----------------

function createSvgThumbnail(bg: string, title: string, subtitle: string, accent: string = '#ffffff'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
    <rect width="400" height="260" fill="${bg}"/>
    <line x1="24" y1="24" x2="376" y2="24" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <line x1="24" y1="236" x2="376" y2="236" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <circle cx="36" cy="42" r="3" fill="${accent}"/>
    <text x="48" y="45" fill="rgba(255,255,255,0.5)" font-family="monospace" font-size="10" letter-spacing="1">SCRIBE CANVAS</text>
    <text x="30" y="115" fill="#f8fafc" font-family="'Inter', sans-serif" font-size="20" font-weight="600">${title}</text>
    <text x="30" y="142" fill="#64748b" font-family="'Inter', sans-serif" font-size="12">${subtitle}</text>
    <circle cx="340" cy="90" r="24" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
    <rect x="30" y="195" width="70" height="20" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="40" y="209" fill="#94a3b8" font-family="monospace" font-size="9">LOCAL</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const existingProjects = await getAllProjects();
    if (existingProjects.length > 0) return; // already seeded

    const now = Date.now();

    // 1. Initial Projects (5 realistic projects to populate the Recent Projects section)
    const seedProjects: ProjectRecord[] = [
      {
        id: 'proj_launch_campaign',
        name: 'Scribe Studio Launch Banner',
        width: 1200,
        height: 630,
        unit: 'px',
        dpi: 72,
        fabricJson: JSON.stringify({
          version: '6.0.0',
          objects: [
            {
              type: 'rect',
              left: 0,
              top: 0,
              width: 1200,
              height: 630,
              fill: '#0d0f17',
              selectable: false,
            },
            {
              type: 'rect',
              left: 80,
              top: 100,
              width: 14,
              height: 80,
              fill: '#ccff00',
            },
            {
              type: 'textbox',
              left: 110,
              top: 100,
              width: 800,
              text: 'SCRIBE DESIGN STUDIO',
              fontSize: 54,
              fontFamily: 'Outfit',
              fontWeight: 'bold',
              fill: '#ffffff',
            },
            {
              type: 'textbox',
              left: 110,
              top: 170,
              width: 700,
              text: 'Zero-Backend • Local-First • Fabric.js Architecture',
              fontSize: 24,
              fontFamily: 'Space Grotesk',
              fill: '#8e98b0',
            },
            {
              type: 'rect',
              left: 110,
              top: 240,
              width: 220,
              height: 48,
              fill: '#ccff00',
              rx: 4,
              ry: 4,
            },
            {
              type: 'textbox',
              left: 130,
              top: 254,
              width: 180,
              text: 'START CREATING',
              fontSize: 14,
              fontFamily: 'Space Mono',
              fontWeight: 'bold',
              fill: '#0b0c10',
            },
          ],
        }),
        thumbnail: createSvgThumbnail('#0d0f17', 'Launch Banner', '1200 × 630 px • Social Landscape', '#ccff00'),
        createdAt: now - 3600000 * 2,
        updatedAt: now - 3600000 * 2,
        isFavorite: true,
        type: 'graphic',
        tags: ['social', 'launch', 'landscape'],
      },
      {
        id: 'proj_luqa_identity',
        name: 'Luqa Brand Instagram Carousel',
        width: 1080,
        height: 1080,
        unit: 'px',
        dpi: 72,
        fabricJson: JSON.stringify({
          version: '6.0.0',
          objects: [
            {
              type: 'rect',
              left: 0,
              top: 0,
              width: 1080,
              height: 1080,
              fill: '#12141e',
              selectable: false,
            },
            {
              type: 'circle',
              left: 390,
              top: 240,
              radius: 150,
              fill: '#8b5cf6',
              opacity: 0.85,
            },
            {
              type: 'textbox',
              left: 100,
              top: 560,
              width: 880,
              text: 'DESIGN FREEDOM',
              fontSize: 64,
              fontFamily: 'Outfit',
              fontWeight: 'bold',
              fill: '#ffffff',
            },
            {
              type: 'textbox',
              left: 100,
              top: 650,
              width: 880,
              text: 'No cloud locks. Permanent IndexedDB storage.',
              fontSize: 28,
              fontFamily: 'Outfit',
              fill: '#ccff00',
            },
          ],
        }),
        thumbnail: createSvgThumbnail('#12141e', 'Luqa Carousel', '1080 × 1080 px • Square Post', '#8b5cf6'),
        createdAt: now - 3600000 * 8,
        updatedAt: now - 3600000 * 5,
        isFavorite: true,
        type: 'graphic',
        tags: ['instagram', 'branding'],
      },
      {
        id: 'proj_yt_tech_review',
        name: 'YouTube Tech Thumbnail 1080p',
        width: 1280,
        height: 720,
        unit: 'px',
        dpi: 72,
        fabricJson: JSON.stringify({
          version: '6.0.0',
          objects: [
            {
              type: 'rect',
              left: 0,
              top: 0,
              width: 1280,
              height: 720,
              fill: '#08090d',
              selectable: false,
            },
            {
              type: 'textbox',
              left: 80,
              top: 120,
              width: 900,
              text: 'CANVA ALTERNATIVE?',
              fontSize: 68,
              fontFamily: 'Outfit',
              fontWeight: 'bold',
              fill: '#ff5c35',
            },
          ],
        }),
        thumbnail: createSvgThumbnail('#08090d', 'YouTube Thumb', '1280 × 720 px • High-CTR Cover', '#ff5c35'),
        createdAt: now - 3600000 * 24,
        updatedAt: now - 3600000 * 12,
        isFavorite: false,
        type: 'graphic',
        tags: ['video', 'youtube'],
      },
      {
        id: 'proj_a4_event_flyer',
        name: 'A4 Indie Music Fest Flyer',
        width: 2480,
        height: 3508,
        unit: 'mm',
        dpi: 300,
        fabricJson: JSON.stringify({
          version: '6.0.0',
          objects: [
            {
              type: 'rect',
              left: 0,
              top: 0,
              width: 2480,
              height: 3508,
              fill: '#0f1015',
              selectable: false,
            },
            {
              type: 'textbox',
              left: 200,
              top: 300,
              width: 2080,
              text: 'BRUTAL SOUNDS 2026',
              fontSize: 160,
              fontFamily: 'Outfit',
              fontWeight: 'bold',
              fill: '#ffffff',
            },
          ],
        }),
        thumbnail: createSvgThumbnail('#0f1015', 'Indie Fest Flyer', 'A4 Print • 210 × 297 mm 300 DPI', '#00e5ff'),
        createdAt: now - 3600000 * 48,
        updatedAt: now - 3600000 * 20,
        isFavorite: false,
        type: 'print',
        tags: ['print', 'poster', 'a4'],
      },
      {
        id: 'proj_tiktok_story',
        name: 'Vertical Reel Promo 9:16',
        width: 1080,
        height: 1920,
        unit: 'px',
        dpi: 72,
        fabricJson: JSON.stringify({
          version: '6.0.0',
          objects: [
            {
              type: 'rect',
              left: 0,
              top: 0,
              width: 1080,
              height: 1920,
              fill: '#151722',
              selectable: false,
            },
            {
              type: 'textbox',
              left: 80,
              top: 300,
              width: 920,
              text: 'NEXT GEN UI',
              fontSize: 72,
              fontFamily: 'Outfit',
              fontWeight: 'bold',
              fill: '#ccff00',
            },
          ],
        }),
        thumbnail: createSvgThumbnail('#151722', 'Vertical Story Promo', '1080 × 1920 px • Mobile 9:16', '#ccff00'),
        createdAt: now - 3600000 * 72,
        updatedAt: now - 3600000 * 28,
        isFavorite: true,
        type: 'video',
        tags: ['story', 'reel', 'tiktok'],
      },
    ];

    for (const p of seedProjects) {
      await saveProject(p);
    }

    // 2. Initial Brands (including Luqa Core featuring user uploaded Scribe logo!)
    const seedBrands: BrandRecord[] = [
      {
        id: 'brand_luqa_core',
        name: 'Luqa Ecosystem Core',
        primaryColor: '#ccff00', // Luqa Lime
        secondaryColors: ['#0b0c10', '#8b5cf6', '#ffffff', '#ff5c35'],
        fonts: ['Outfit', 'Space Grotesk', 'Space Mono'],
        logoUrl: '/assets/aistudio/scribe-logo-white_7951e577.png',
        createdAt: now - 3600000 * 200,
        notes: 'Primary brand guidelines with signature Scribe logo and high-voltage contrast.',
      },
      {
        id: 'brand_cyber_obsidian',
        name: 'Obsidian & Cyan',
        primaryColor: '#00e5ff',
        secondaryColors: ['#0e1017', '#1a1d28', '#ffffff', '#ff0055'],
        fonts: ['Space Grotesk', 'Space Mono'],
        logoUrl: '/assets/aistudio/scribe-logo-noir_53887179.png',
        createdAt: now - 3600000 * 150,
        notes: 'Tech aesthetic with vibrant cyber accents for posters and digital covers.',
      },
    ];

    for (const b of seedBrands) {
      await saveBrand(b);
    }
  } catch (err) {
    console.warn('Initial seeding encountered an error:', err);
  }
}

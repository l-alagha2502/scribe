import {
  ProjectRecord,
  AssetRecord,
  BrandRecord,
  CustomFontRecord,
  SavedTemplateRecord,
} from '../types';

const DB_NAME = 'scribe_design_studio_db';
const DB_VERSION = 4;

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

      if (event.oldVersion < 4) {
        const tx = (event.target as IDBOpenDBRequest).transaction;
        const demoProjects = [
          'proj_launch_campaign',
          'proj_luqa_identity',
          'proj_yt_tech_review',
          'proj_a4_event_flyer',
          'proj_tiktok_story',
        ];
        const demoBrands = ['brand_luqa_core', 'brand_cyber_obsidian'];
        const demoAssets = [
          'asset_scribe_logo_white',
          'asset_scribe_logo_black',
          'asset_brutalist_star',
          'asset_raw_hero_photo',
        ];

        if (tx && db.objectStoreNames.contains(STORES.PROJECTS)) {
          const projectStore = tx.objectStore(STORES.PROJECTS);
          for (const id of demoProjects) projectStore.delete(id);
        }
        if (tx && db.objectStoreNames.contains(STORES.BRANDS)) {
          const brandStore = tx.objectStore(STORES.BRANDS);
          for (const id of demoBrands) brandStore.delete(id);
        }
        if (tx && db.objectStoreNames.contains(STORES.ASSETS)) {
          const assetStore = tx.objectStore(STORES.ASSETS);
          for (const id of demoAssets) assetStore.delete(id);
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

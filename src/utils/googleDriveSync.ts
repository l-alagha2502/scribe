import { ProjectRecord, AssetRecord, CustomFontRecord } from '../types';
import { createScribePackage, parseScribePackage, ScribeProjectPackage } from './scribePackage';

export type SyncState = 'guest' | 'connecting' | 'connected' | 'syncing' | 'synced' | 'error';

export interface DriveUser {
  email: string;
  name: string;
  picture?: string;
}

export interface DriveBackupItem {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  projectId?: string;
  layersCount?: number;
}

export interface GoogleJwtPayload {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}

// Hardcoded developer Client ID as configured
export const GOOGLE_CLIENT_ID = "522842438682-p5dnk2v5qh2dd98mg71qvt17aogeokc2.apps.googleusercontent.com";

const STORAGE_KEYS = {
  CLIENT_ID: 'scribe_google_client_id',
  AUTO_SYNC: 'scribe_auto_sync_drive',
  USER_CACHE: 'scribe_drive_user_cache',
  MOCK_DRIVE: 'scribe_mock_drive_store',
  USE_SIMULATION: 'scribe_use_drive_simulation',
} as const;

const DRIVE_FOLDER_NAME = 'Scribe Design Studio';
export const DRIVE_SCOPES = 'openid profile email https://www.googleapis.com/auth/drive.file';

// In-memory token storage (never saved to localStorage for security)
let inMemoryAccessToken: string | null = null;
let tokenExpiresAt: number = 0;
let tokenClientInstance: any = null;

// Subscribers for sync state changes
type SyncListener = (state: SyncState, user: DriveUser | null) => void;
const listeners = new Set<SyncListener>();

function notifyListeners(state: SyncState, user: DriveUser | null) {
  listeners.forEach((fn) => {
    try {
      fn(state, user);
    } catch (e) {
      console.warn('Sync listener error:', e);
    }
  });
}

export function subscribeToDriveSync(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ------------------- JWT Decoding Utility -------------------

/**
 * Decodes a Google JWT ID token completely on the client side
 * without sending tokens to any backend server.
 */
export function decodeGoogleIdToken(token: string): GoogleJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as GoogleJwtPayload;
  } catch (err) {
    console.warn('Error parsing Google ID token JWT:', err);
    return null;
  }
}

// ------------------- Client ID & Settings -------------------

export function getStoredGoogleClientId(): string {
  return localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || GOOGLE_CLIENT_ID;
}

export function setStoredGoogleClientId(id: string): void {
  if (id.trim()) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, id.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
  }
}

export function getAutoSyncEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.AUTO_SYNC) === 'true';
}

export function setAutoSyncEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, enabled ? 'true' : 'false');
}

export function getCachedDriveUser(): DriveUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isDriveSimulationMode(): boolean {
  return localStorage.getItem(STORAGE_KEYS.USE_SIMULATION) === 'true';
}

export function setDriveSimulationMode(sim: boolean): void {
  localStorage.setItem(STORAGE_KEYS.USE_SIMULATION, sim ? 'true' : 'false');
}

// ------------------- Script Loading & GIS Token Client -------------------

let gisScriptLoadingPromise: Promise<boolean> | null = null;

export async function loadGisScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((window as any).google?.accounts?.oauth2) return true;

  if (gisScriptLoadingPromise) return gisScriptLoadingPromise;

  gisScriptLoadingPromise = new Promise((resolve) => {
    // Check if already injected
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      if ((window as any).google?.accounts?.oauth2) {
        resolve(true);
        return;
      }
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Google Identity Services (GIS) client script.');
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return gisScriptLoadingPromise;
}

/**
 * Extracts and persists user profile from Google userinfo endpoint or JWT token
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<DriveUser | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const info = await res.json();
      const user: DriveUser = {
        name: info.name || info.given_name || 'Google User',
        email: info.email || 'user@google.com',
        picture: info.picture,
      };
      localStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(user));
      return user;
    }
  } catch (err) {
    console.warn('Could not fetch user profile from userinfo:', err);
  }
  return null;
}

/**
 * Initializes GIS Token Client and triggers OAuth popup.
 * Requests profile and Google Drive file scopes.
 */
export async function connectGoogleDrive(
  customClientId?: string,
  options?: { prompt?: string }
): Promise<{ success: boolean; user?: DriveUser; error?: string }> {
  const clientId = (customClientId || getStoredGoogleClientId() || GOOGLE_CLIENT_ID).trim();

  // If running in explicit simulation mode
  if (isDriveSimulationMode()) {
    notifyListeners('connecting', null);
    await new Promise((r) => setTimeout(r, 600));

    const mockUser: DriveUser = {
      email: 'judgeblake01@gmail.com',
      name: 'Blake Judge',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face',
    };

    inMemoryAccessToken = 'mock_gdrive_access_token_' + Date.now();
    tokenExpiresAt = Date.now() + 3600000;
    localStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(mockUser));
    notifyListeners('connected', mockUser);
    return { success: true, user: mockUser };
  }

  notifyListeners('connecting', null);

  const gisLoaded = await loadGisScript();
  if (!gisLoaded || !(window as any).google?.accounts?.oauth2) {
    notifyListeners('error', null);
    return { success: false, error: 'Failed to load Google Identity Services script. Check internet connection.' };
  }

  return new Promise((resolve) => {
    try {
      tokenClientInstance = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPES,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('Google OAuth error:', tokenResponse.error);
            notifyListeners('error', null);
            resolve({ success: false, error: tokenResponse.error });
            return;
          }

          inMemoryAccessToken = tokenResponse.access_token;
          const expiresInSec = Number(tokenResponse.expires_in) || 3599;
          tokenExpiresAt = Date.now() + expiresInSec * 1000;

          // 1. Try decoding ID token if present in response
          let extractedUser: DriveUser | null = null;
          if (tokenResponse.id_token) {
            const decoded = decodeGoogleIdToken(tokenResponse.id_token);
            if (decoded && decoded.email) {
              extractedUser = {
                name: decoded.name || 'Google User',
                email: decoded.email,
                picture: decoded.picture,
              };
            }
          }

          // 2. Fetch or augment with userinfo endpoint
          if ((!extractedUser || !extractedUser.picture) && inMemoryAccessToken) {
            const fetchedUser = await fetchGoogleUserProfile(inMemoryAccessToken);
            if (fetchedUser) {
              extractedUser = fetchedUser;
            }
          }

          // 3. Fallback user identity if profile fetching was blocked by ad-blocker
          if (!extractedUser) {
            extractedUser = {
              email: 'Connected Google Account',
              name: 'Google User',
            };
          }

          localStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(extractedUser));
          notifyListeners('connected', extractedUser);
          resolve({ success: true, user: extractedUser });
        },
        error_callback: (err: any) => {
          console.error('GIS Error Callback:', err);
          notifyListeners('error', null);
          resolve({ success: false, error: err?.message || 'Google Sign-In popup was closed or cancelled.' });
        },
      });

      // Request access token with prompt parameter (e.g. 'select_account' or default)
      tokenClientInstance.requestAccessToken({ prompt: options?.prompt ?? '' });
    } catch (initErr: any) {
      console.error('Failed to initialize GIS token client:', initErr);
      notifyListeners('error', null);
      resolve({ success: false, error: initErr.message || 'Initialization failed' });
    }
  });
}

/**
 * Switches Google Account by prompting the Google account chooser.
 */
export async function switchGoogleAccount(customClientId?: string): Promise<{ success: boolean; user?: DriveUser; error?: string }> {
  disconnectGoogleDrive();
  return connectGoogleDrive(customClientId, { prompt: 'select_account' });
}

/**
 * Disconnects Google Drive account and reverts instantly to offline Guest Mode.
 */
export function disconnectGoogleDrive(): void {
  if (typeof window !== 'undefined' && inMemoryAccessToken && (window as any).google?.accounts?.oauth2?.revoke) {
    try {
      (window as any).google.accounts.oauth2.revoke(inMemoryAccessToken, () => {});
    } catch {
      // ignore revoke error
    }
  }

  inMemoryAccessToken = null;
  tokenExpiresAt = 0;
  localStorage.removeItem(STORAGE_KEYS.USER_CACHE);
  notifyListeners('guest', null);
}

export function isDriveAuthenticated(): boolean {
  if (!inMemoryAccessToken) return false;
  return Date.now() < tokenExpiresAt - 30000; // 30s buffer
}

export function getCurrentSyncState(): { state: SyncState; user: DriveUser | null } {
  if (isDriveAuthenticated()) {
    return { state: 'connected', user: getCachedDriveUser() };
  }
  return { state: 'guest', user: null };
}

// ------------------- Google Drive REST API v3 Integration -------------------

let cachedDriveFolderId: string | null = null;

/**
 * Finds or creates the dedicated "Scribe Design Studio" folder in user's Drive.
 */
export async function getOrCreateScribeFolder(): Promise<string> {
  if (cachedDriveFolderId) return cachedDriveFolderId;

  if (isDriveSimulationMode()) {
    cachedDriveFolderId = 'mock_scribe_folder_id';
    return cachedDriveFolderId;
  }

  if (!isDriveAuthenticated() || !inMemoryAccessToken) {
    throw new Error('Not authenticated with Google Drive.');
  }

  // 1. Search for existing folder
  const query = encodeURIComponent(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`, {
    headers: { Authorization: `Bearer ${inMemoryAccessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      cachedDriveFolderId = data.files[0].id;
      return cachedDriveFolderId!;
    }
  }

  // 2. Create the folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${inMemoryAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Dedicated cloud backup folder for Scribe Design Studio projects (vastx.app).',
    }),
  });

  if (!createRes.ok) {
    throw new Error('Failed to create Scribe folder in Google Drive.');
  }

  const folderData = await createRes.json();
  cachedDriveFolderId = folderData.id;
  return cachedDriveFolderId!;
}

/**
 * Uploads or updates a project package into Google Drive.
 */
export async function uploadProjectToDrive(
  project: ProjectRecord,
  allAssets: AssetRecord[] = [],
  allFonts: CustomFontRecord[] = []
): Promise<{ fileId: string; modifiedTime: string }> {
  notifyListeners('syncing', getCachedDriveUser());

  const pkg = createScribePackage(project, allAssets, allFonts);
  const pkgContent = JSON.stringify(pkg, null, 2);
  const fileName = `${project.name || 'Untitled'}.scribe`;

  // Simulation mode
  if (isDriveSimulationMode() || !inMemoryAccessToken) {
    await new Promise((r) => setTimeout(r, 700)); // realistic network latency
    const mockBackups = getMockDriveStore();
    const existingIdx = mockBackups.findIndex((b) => b.projectId === project.id || b.name === fileName);

    const nowIso = new Date().toISOString();
    const item: DriveBackupItem = {
      id: existingIdx >= 0 ? mockBackups[existingIdx].id : `mock_file_${Date.now()}`,
      name: fileName,
      size: new Blob([pkgContent]).size,
      modifiedTime: nowIso,
      projectId: project.id,
      layersCount: pkg.meta.layersCount,
    };

    if (existingIdx >= 0) {
      mockBackups[existingIdx] = item;
    } else {
      mockBackups.unshift(item);
    }
    saveMockDriveStore(mockBackups);

    // Save package data into mock storage
    localStorage.setItem(`mock_drive_content_${item.id}`, pkgContent);

    notifyListeners('synced', getCachedDriveUser());
    return { fileId: item.id, modifiedTime: nowIso };
  }

  const folderId = await getOrCreateScribeFolder();

  // Search if file already exists in folder
  const fileQuery = encodeURIComponent(`'${folderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`);
  const existingRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${fileQuery}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${inMemoryAccessToken}` },
  });

  let existingFileId: string | null = null;
  if (existingRes.ok) {
    const listData = await existingRes.json();
    if (listData.files && listData.files.length > 0) {
      existingFileId = listData.files[0].id;
    }
  }

  // Prepare Multipart body
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/x-scribe-project',
    ...(!existingFileId ? { parents: [folderId] } : {}),
    properties: {
      scribeProjectId: project.id,
      scribeVersion: '2.0.0',
      ecosystem: 'vastx.app',
      layersCount: String(pkg.meta.layersCount),
      canvasDimensions: `${project.width}x${project.height}`,
    },
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/x-scribe-project\r\n\r\n' +
    pkgContent +
    closeDelimiter;

  const uploadEndpoint = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,modifiedTime`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime`;

  const uploadRes = await fetch(uploadEndpoint, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${inMemoryAccessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!uploadRes.ok) {
    notifyListeners('error', getCachedDriveUser());
    const errText = await uploadRes.text();
    throw new Error(`Google Drive sync failed: ${errText}`);
  }

  const resultData = await uploadRes.json();
  notifyListeners('synced', getCachedDriveUser());
  return { fileId: resultData.id, modifiedTime: resultData.modifiedTime };
}

/**
 * Lists all .scribe design backups in the user's Scribe folder.
 */
export async function listDriveBackups(): Promise<DriveBackupItem[]> {
  if (isDriveSimulationMode() || !inMemoryAccessToken) {
    return getMockDriveStore();
  }

  const folderId = await getOrCreateScribeFolder();
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false and (name contains '.scribe' or mimeType = 'application/x-scribe-project')`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, size, modifiedTime, webViewLink, properties)&orderBy=modifiedTime desc`, {
    headers: { Authorization: `Bearer ${inMemoryAccessToken}` },
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve backup list from Google Drive.');
  }

  const data = await res.json();
  const files: any[] = data.files || [];

  return files.map((f) => ({
    id: f.id,
    name: f.name,
    size: Number(f.size) || 0,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    projectId: f.properties?.scribeProjectId,
    layersCount: f.properties?.layersCount ? Number(f.properties.layersCount) : undefined,
  }));
}

/**
 * Downloads and parses a remote .scribe project from Google Drive.
 */
export async function downloadProjectFromDrive(fileId: string): Promise<ScribeProjectPackage> {
  if (isDriveSimulationMode() || !inMemoryAccessToken) {
    const raw = localStorage.getItem(`mock_drive_content_${fileId}`);
    if (!raw) throw new Error('Simulated file not found in local mock cloud store.');
    return parseScribePackage(raw);
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${inMemoryAccessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download project file from Google Drive: ${res.statusText}`);
  }

  const text = await res.text();
  return parseScribePackage(text);
}

/**
 * Deletes a backup from Google Drive.
 */
export async function deleteDriveBackup(fileId: string): Promise<void> {
  if (isDriveSimulationMode() || !inMemoryAccessToken) {
    const mockBackups = getMockDriveStore().filter((b) => b.id !== fileId);
    saveMockDriveStore(mockBackups);
    localStorage.removeItem(`mock_drive_content_${fileId}`);
    return;
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${inMemoryAccessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error('Failed to delete backup file from Google Drive.');
  }
}

// ------------------- Local Mock Storage Helpers (Zero-Config Simulation) -------------------

function getMockDriveStore(): DriveBackupItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOCK_DRIVE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'mock_backup_1',
      name: 'Launch Banner Cloud Backup.scribe',
      size: 14280,
      modifiedTime: new Date(Date.now() - 3600000 * 2).toISOString(),
      projectId: 'proj_launch_campaign',
      layersCount: 6,
    },
    {
      id: 'mock_backup_2',
      name: 'Luqa Carousel Brand Master.scribe',
      size: 28400,
      modifiedTime: new Date(Date.now() - 3600000 * 18).toISOString(),
      projectId: 'proj_luqa_identity',
      layersCount: 4,
    },
  ];
}

function saveMockDriveStore(items: DriveBackupItem[]): void {
  localStorage.setItem(STORAGE_KEYS.MOCK_DRIVE, JSON.stringify(items));
}

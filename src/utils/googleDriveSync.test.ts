import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOGLE_CLIENT_ID,
  setStoredGoogleClientId,
  getStoredGoogleClientId,
  setAutoSyncEnabled,
  getAutoSyncEnabled,
  setDriveSimulationMode,
  isDriveSimulationMode,
  connectGoogleDrive,
  getCurrentSyncState,
  uploadProjectToDrive,
  listDriveBackups,
  downloadProjectFromDrive,
  disconnectGoogleDrive,
  decodeGoogleIdToken,
} from './googleDriveSync.ts';
import { ProjectRecord } from '../types/index.ts';

// Mock localStorage for node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: 0,
  } as unknown as Storage;
}

test('Google Drive Sync settings getters, setters, and developer Client ID', () => {
  assert.equal(GOOGLE_CLIENT_ID, '763145999539-tn1sleh8rkjti2fqv6eg0erbgjes8hkm.apps.googleusercontent.com');

  setStoredGoogleClientId('custom-test-client-id.apps.googleusercontent.com');
  assert.equal(getStoredGoogleClientId(), 'custom-test-client-id.apps.googleusercontent.com');

  setStoredGoogleClientId('');
  assert.equal(getStoredGoogleClientId(), GOOGLE_CLIENT_ID);

  setAutoSyncEnabled(true);
  assert.equal(getAutoSyncEnabled(), true);

  setAutoSyncEnabled(false);
  assert.equal(getAutoSyncEnabled(), false);

  setDriveSimulationMode(true);
  assert.equal(isDriveSimulationMode(), true);
});

test('decodeGoogleIdToken parses JWT payload on client side', () => {
  // Construct synthetic JWT with base64url payload
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g, '');
  const payloadData = {
    sub: '10987654321',
    name: 'Blake Judge',
    email: 'judgeblake01@gmail.com',
    picture: 'https://lh3.googleusercontent.com/a/sample-pfp',
    email_verified: true,
  };
  const payload = btoa(JSON.stringify(payloadData)).replace(/=/g, '');
  const dummyJwt = `${header}.${payload}.signature`;

  const decoded = decodeGoogleIdToken(dummyJwt);
  assert.ok(decoded);
  assert.equal(decoded?.name, 'Blake Judge');
  assert.equal(decoded?.email, 'judgeblake01@gmail.com');
  assert.equal(decoded?.picture, 'https://lh3.googleusercontent.com/a/sample-pfp');

  // Corrupted or invalid token returns null
  assert.equal(decodeGoogleIdToken('invalid-jwt-token'), null);
});

test('Google Drive simulation mode allows zero-config cloud backup and restore', async () => {
  setDriveSimulationMode(true);

  const connResult = await connectGoogleDrive();
  assert.equal(connResult.success, true);
  assert.ok(connResult.user?.email);

  const syncState = getCurrentSyncState();
  assert.equal(syncState.state, 'connected');

  const sampleProject: ProjectRecord = {
    id: 'proj_cloud_test_1',
    name: 'Cloud Synchronized Banner',
    width: 1200,
    height: 630,
    unit: 'px',
    dpi: 72,
    fabricJson: JSON.stringify({
      version: '6.0.0',
      objects: [{ type: 'rect', fill: '#000000' }],
    }),
    thumbnail: 'data:image/svg+xml;utf8,<svg></svg>',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false,
    type: 'graphic',
  };

  const uploadResult = await uploadProjectToDrive(sampleProject, [], []);
  assert.ok(uploadResult.fileId);

  const backups = await listDriveBackups();
  assert.ok(backups.length >= 1);
  const found = backups.find((b) => b.projectId === 'proj_cloud_test_1');
  assert.ok(found);
  assert.equal(found?.name, 'Cloud Synchronized Banner.scribe');

  const restored = await downloadProjectFromDrive(uploadResult.fileId);
  assert.equal(restored.magic, 'SCRIBE_DESIGN_PROJECT');
  assert.equal(restored.project.name, 'Cloud Synchronized Banner');

  disconnectGoogleDrive();
  const disconnectedState = getCurrentSyncState();
  assert.equal(disconnectedState.state, 'guest');
});

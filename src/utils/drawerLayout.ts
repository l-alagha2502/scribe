export const DEFAULT_LEFT_DRAWER_WIDTH = 320;
export const MIN_LEFT_DRAWER_WIDTH = 260;
export const MAX_LEFT_DRAWER_WIDTH = 520;
export const LEFT_DRAWER_WIDTH_STORAGE_KEY = 'scribe_left_drawer_width';

export function clampDrawerWidth(width: number): number {
  if (!Number.isFinite(width)) return DEFAULT_LEFT_DRAWER_WIDTH;
  return Math.max(
    MIN_LEFT_DRAWER_WIDTH,
    Math.min(MAX_LEFT_DRAWER_WIDTH, Math.round(width))
  );
}

export function getSavedDrawerWidth(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LEFT_DRAWER_WIDTH_STORAGE_KEY);
      if (raw !== null) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          return clampDrawerWidth(parsed);
        }
      }
    }
  } catch {
    // ignore storage access issues
  }
  return DEFAULT_LEFT_DRAWER_WIDTH;
}

export function saveDrawerWidth(width: number): number {
  const clamped = clampDrawerWidth(width);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEFT_DRAWER_WIDTH_STORAGE_KEY, String(clamped));
    }
  } catch {
    // ignore storage access issues
  }
  return clamped;
}

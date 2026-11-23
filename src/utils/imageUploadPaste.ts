/**
 * Client-side image upload, clipboard paste, and drag-and-drop helpers
 * for Scribe Design Studio.
 */

export const ACCEPTED_IMAGE_MIME_TYPES =
  'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';

const SUPPORTED_MIME_SET = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const SUPPORTED_EXT_RE = /\.(png|jpe?g|webp|gif|svg)$/i;

export function isSupportedImageFile(file: File | null | undefined): file is File {
  if (!file) return false;
  if (file.type && SUPPORTED_MIME_SET.has(file.type.toLowerCase())) {
    return true;
  }
  if (file.type && file.type.toLowerCase().startsWith('image/')) {
    return true;
  }
  return SUPPORTED_EXT_RE.test(file.name || '');
}

export function readImageFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result;
      if (typeof res === 'string' && res.length > 0) {
        resolve(res);
      } else {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export function extractImageFilesFromClipboard(
  clipboardData: DataTransfer | null | undefined
): File[] {
  if (!clipboardData) return [];
  const files: File[] = [];

  if (clipboardData.items && clipboardData.items.length > 0) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (isSupportedImageFile(f)) {
          files.push(f);
        }
      }
    }
  }

  if (files.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const f = clipboardData.files[i];
      if (isSupportedImageFile(f)) {
        files.push(f);
      }
    }
  }

  return files;
}

export function extractImageFilesFromDrop(
  dataTransfer: DataTransfer | null | undefined
): File[] {
  if (!dataTransfer) return [];
  const files: File[] = [];
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const f = dataTransfer.files[i];
      if (isSupportedImageFile(f)) {
        files.push(f);
      }
    }
  }
  return files;
}

export function computeCanvasDropCoordinates(
  clientX: number,
  clientY: number,
  canvasRect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  zoomLevel: number,
  canvasWidth: number,
  canvasHeight: number
): { left: number; top: number } {
  const safeZoom = zoomLevel > 0 ? zoomLevel : 1;
  const rawX = (clientX - canvasRect.left) / safeZoom;
  const rawY = (clientY - canvasRect.top) / safeZoom;

  return {
    left: Math.round(Math.max(0, Math.min(canvasWidth, rawX))),
    top: Math.round(Math.max(0, Math.min(canvasHeight, rawY))),
  };
}

import { CustomFontRecord } from '../types';

export type UploadedFileCategory = 'image' | 'audio' | 'font' | 'unsupported';

export const ACCEPTED_FILES_UPLOAD_TYPES =
  'image/*,audio/*,.mp3,.wav,.ogg,.m4a,.ttf,.otf,.woff,.woff2';

const FONT_EXTENSIONS = new Set(['ttf', 'otf', 'woff', 'woff2']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif']);

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().trim().split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

export function classifyUploadedFile(file: Pick<File, 'name' | 'type'>): UploadedFileCategory {
  const mime = (file.type || '').toLowerCase();
  const ext = getFileExtension(file.name || '');

  if (FONT_EXTENSIONS.has(ext) || mime.startsWith('font/')) {
    return 'font';
  }
  if (AUDIO_EXTENSIONS.has(ext) || mime.startsWith('audio/')) {
    return 'audio';
  }
  if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith('image/')) {
    return 'image';
  }
  return 'unsupported';
}

export function parseCustomFontFormat(
  fileName: string
): CustomFontRecord['format'] {
  const ext = getFileExtension(fileName);
  if (ext === 'otf') return 'opentype';
  if (ext === 'woff') return 'woff';
  if (ext === 'woff2') return 'woff2';
  return 'truetype';
}

export function deriveCustomFontFamilyName(fileName: string): string {
  const stripped = fileName.replace(/\.[^/.]+$/, '').trim();
  return stripped || 'Custom Font';
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read file contents.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed reading file.'));
    reader.readAsDataURL(file);
  });
}

export function extractImageDimensionsFromUrl(
  dataUrl: string
): Promise<string | undefined> {
  if (typeof Image === 'undefined') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(`${img.naturalWidth} × ${img.naturalHeight}`);
      } else {
        resolve(undefined);
      }
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
  });
}

export function formatFileSizeShort(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

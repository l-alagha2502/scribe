export interface ExtractedColor {
  hex: string;
  r: number;
  g: number;
  b: number;
  count: number;
  percentage: number;
  isDark: boolean;
}

/**
 * Converts RGB tuple to Hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(c)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates relative luminance according to WCAG 2.1
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Color distance in RGB space
 */
export function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Pure color quantizer: receives raw Uint8ClampedArray (RGBA) and extracts dominant colors
 */
export function extractPaletteFromRgba(
  data: Uint8ClampedArray | number[],
  maxColors: number = 6,
  quantizeStep: number = 24
): ExtractedColor[] {
  if (!data || data.length < 4) {
    return [
      { hex: '#000000', r: 0, g: 0, b: 0, count: 1, percentage: 50, isDark: true },
      { hex: '#ffffff', r: 255, g: 255, b: 255, count: 1, percentage: 50, isDark: false },
    ];
  }

  const buckets = new Map<string, { rSum: number; gSum: number; bSum: number; count: number }>();
  let totalSampled = 0;

  // Step across pixels for fast processing (sample every 4th pixel for speed)
  const pixelStride = 16; // 4 channels * 4 pixels
  for (let i = 0; i < data.length; i += pixelStride) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Ignore transparent pixels
    if (a < 128) continue;

    const qr = Math.floor(r / quantizeStep) * quantizeStep;
    const qg = Math.floor(g / quantizeStep) * quantizeStep;
    const qb = Math.floor(b / quantizeStep) * quantizeStep;
    const key = `${qr},${qg},${qb}`;

    const existing = buckets.get(key);
    if (existing) {
      existing.rSum += r;
      existing.gSum += g;
      existing.bSum += b;
      existing.count += 1;
    } else {
      buckets.set(key, { rSum: r, gSum: g, bSum: b, count: 1 });
    }
    totalSampled++;
  }

  if (totalSampled === 0) {
    return [{ hex: '#11131a', r: 17, g: 19, b: 26, count: 1, percentage: 100, isDark: true }];
  }

  // Sort buckets by count descending
  const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count);

  const distinctColors: ExtractedColor[] = [];
  const minDistance = 45; // Minimum color distance to ensure variety in palette

  for (const bucket of sorted) {
    const avgR = Math.round(bucket.rSum / bucket.count);
    const avgG = Math.round(bucket.gSum / bucket.count);
    const avgB = Math.round(bucket.bSum / bucket.count);

    // Check if too close to an already selected color
    const tooClose = distinctColors.some(
      (c) => colorDistance([c.r, c.g, c.b], [avgR, avgG, avgB]) < minDistance
    );

    if (!tooClose) {
      const hex = rgbToHex(avgR, avgG, avgB);
      const lum = getLuminance(avgR, avgG, avgB);
      distinctColors.push({
        hex,
        r: avgR,
        g: avgG,
        b: avgB,
        count: bucket.count,
        percentage: Math.round((bucket.count / totalSampled) * 100),
        isDark: lum < 0.35,
      });
    }

    if (distinctColors.length >= maxColors) break;
  }

  return distinctColors;
}

/**
 * Extracts palette from an HTMLImageElement or Canvas in browser
 */
export async function extractPaletteFromImageUrl(imageUrl: string, maxColors: number = 6): Promise<ExtractedColor[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([]);
          return;
        }
        // Downscale for instant client-side performance
        const maxDim = 150;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const palette = extractPaletteFromRgba(imgData.data, maxColors);
        resolve(palette);
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = imageUrl;
  });
}

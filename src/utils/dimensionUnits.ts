import { DimensionUnit, SizePreset } from '../types';

/**
 * Standard unit conversion math.
 * 1 inch = 25.4 mm = 2.54 cm
 * pixels = (value_in_inches) * dpi
 */
export function convertToPixels(value: number, unit: DimensionUnit, dpi: number = 72): number {
  if (value <= 0) return 0;
  switch (unit) {
    case 'px':
      return Math.round(value);
    case 'in':
      return Math.round(value * dpi);
    case 'cm':
      return Math.round((value / 2.54) * dpi);
    case 'mm':
      return Math.round((value / 25.4) * dpi);
    default:
      return Math.round(value);
  }
}

export function convertFromPixels(pixels: number, targetUnit: DimensionUnit, dpi: number = 72): number {
  if (pixels <= 0) return 0;
  switch (targetUnit) {
    case 'px':
      return Math.round(pixels);
    case 'in':
      return Number((pixels / dpi).toFixed(2));
    case 'cm':
      return Number(((pixels / dpi) * 2.54).toFixed(2));
    case 'mm':
      return Number(((pixels / dpi) * 25.4).toFixed(1));
    default:
      return Math.round(pixels);
  }
}

/**
 * Greatest common divisor for aspect ratio reduction
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height || width <= 0 || height <= 0) return 'Custom';
  const divisor = gcd(Math.round(width), Math.round(height));
  const wRatio = Math.round(width / divisor);
  const hRatio = Math.round(height / divisor);

  // Common approximation checks
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.02) return '1:1';
  if (Math.abs(ratio - 16 / 9) < 0.03) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.03) return '9:16';
  if (Math.abs(ratio - 4 / 3) < 0.03) return '4:3';
  if (Math.abs(ratio - 3 / 4) < 0.03) return '3:4';
  if (Math.abs(ratio - 3 / 2) < 0.03) return '3:2';
  if (Math.abs(ratio - 2 / 3) < 0.03) return '2:3';
  if (Math.abs(ratio - 21 / 9) < 0.05) return '21:9';

  if (wRatio > 50 || hRatio > 50) {
    return `${ratio.toFixed(2)}:1`;
  }
  return `${wRatio}:${hRatio}`;
}

export const SIZE_PRESETS: SizePreset[] = [
  // Suggested
  {
    id: 'ig-post-square',
    name: 'Instagram Square Post',
    category: 'Suggested',
    width: 1080,
    height: 1080,
    unit: 'px',
    dpi: 72,
    aspectRatio: '1:1',
    description: '1080 × 1080 px • Classic square feed post',
    isPopular: true,
  },
  {
    id: 'ig-post-portrait',
    name: 'Instagram Portrait Post',
    category: 'Suggested',
    width: 1080,
    height: 1350,
    unit: 'px',
    dpi: 72,
    aspectRatio: '4:5',
    description: '1080 × 1350 px • Tall feed post',
    isPopular: true,
  },
  {
    id: 'ig-story-reel-tiktok',
    name: 'Instagram Story / Reel / TikTok',
    category: 'Suggested',
    width: 1080,
    height: 1920,
    unit: 'px',
    dpi: 72,
    aspectRatio: '9:16',
    description: '1080 × 1920 px • Fullscreen vertical video & story',
    isPopular: true,
  },
  {
    id: 'yt-thumbnail',
    name: 'YouTube Thumbnail',
    category: 'Suggested',
    width: 1280,
    height: 720,
    unit: 'px',
    dpi: 72,
    aspectRatio: '16:9',
    description: '1280 × 720 px • Widescreen video cover',
    isPopular: true,
  },
  {
    id: 'twitter-x-post',
    name: 'Twitter / X Post',
    category: 'Suggested',
    width: 1200,
    height: 675,
    unit: 'px',
    dpi: 72,
    aspectRatio: '16:9',
    description: '1200 × 675 px • Crisp timeline post',
    isPopular: true,
  },

  // Social Media
  {
    id: 'fb-post',
    name: 'Facebook Post',
    category: 'Social Media',
    width: 1200,
    height: 630,
    unit: 'px',
    dpi: 72,
    aspectRatio: '1.90:1',
    description: '1200 × 630 px • Feed & link share image',
  },
  {
    id: 'fb-cover',
    name: 'Facebook Cover',
    category: 'Social Media',
    width: 820,
    height: 312,
    unit: 'px',
    dpi: 72,
    aspectRatio: '2.63:1',
    description: '820 × 312 px • Page & profile header',
  },
  {
    id: 'linkedin-post',
    name: 'LinkedIn Post',
    category: 'Social Media',
    width: 1200,
    height: 627,
    unit: 'px',
    dpi: 72,
    aspectRatio: '1.91:1',
    description: '1200 × 627 px • Feed article & update graphic',
  },
  {
    id: 'linkedin-banner',
    name: 'LinkedIn Banner',
    category: 'Social Media',
    width: 1584,
    height: 396,
    unit: 'px',
    dpi: 72,
    aspectRatio: '4:1',
    description: '1584 × 396 px • Personal & company cover',
  },
  {
    id: 'pinterest-pin',
    name: 'Pinterest Pin',
    category: 'Social Media',
    width: 1000,
    height: 1500,
    unit: 'px',
    dpi: 72,
    aspectRatio: '2:3',
    description: '1000 × 1500 px • Standard vertical pin',
  },

  // Print
  {
    id: 'print-a4-document',
    name: 'A4 Document',
    category: 'Print',
    width: 2480,
    height: 3508,
    unit: 'px',
    dpi: 300,
    aspectRatio: '1:1.41',
    description: '2480 × 3508 px (300 DPI) • International standard',
  },
  {
    id: 'print-us-letter',
    name: 'US Letter',
    category: 'Print',
    width: 2550,
    height: 3300,
    unit: 'px',
    dpi: 300,
    aspectRatio: '17:22',
    description: '2550 × 3300 px (300 DPI) • Standard 8.5 × 11 in',
  },
  {
    id: 'print-business-card',
    name: 'Business Card',
    category: 'Print',
    width: 1050,
    height: 600,
    unit: 'px',
    dpi: 300,
    aspectRatio: '7:4',
    description: '1050 × 600 px (300 DPI) • Standard 3.5 × 2 in card',
  },
  {
    id: 'print-flyer-a5',
    name: 'Flyer (A5)',
    category: 'Print',
    width: 1748,
    height: 2480,
    unit: 'px',
    dpi: 300,
    aspectRatio: '1:1.42',
    description: '1748 × 2480 px (300 DPI) • Compact handout flyer',
  },
  {
    id: 'print-poster-a3',
    name: 'Poster (A3)',
    category: 'Print',
    width: 3508,
    height: 4961,
    unit: 'px',
    dpi: 300,
    aspectRatio: '1:1.41',
    description: '3508 × 4961 px (300 DPI) • Large display poster',
  },

  // Ads
  {
    id: 'ad-medium-rectangle',
    name: 'Medium Rectangle Ad (Display)',
    category: 'Ads',
    width: 300,
    height: 250,
    unit: 'px',
    dpi: 72,
    aspectRatio: '6:5',
    description: '300 × 250 px • Standard IAB inline display',
  },
  {
    id: 'ad-leaderboard',
    name: 'Leaderboard Ad',
    category: 'Ads',
    width: 728,
    height: 90,
    unit: 'px',
    dpi: 72,
    aspectRatio: '8.09:1',
    description: '728 × 90 px • Top header web banner',
  },
  {
    id: 'ad-skyscraper',
    name: 'Skyscraper Ad',
    category: 'Ads',
    width: 160,
    height: 600,
    unit: 'px',
    dpi: 72,
    aspectRatio: '4:15',
    description: '160 × 600 px • Wide vertical sidebar ad',
  },
  {
    id: 'ad-google-display-square',
    name: 'Google Display Square',
    category: 'Ads',
    width: 250,
    height: 250,
    unit: 'px',
    dpi: 72,
    aspectRatio: '1:1',
    description: '250 × 250 px • Square display network ad',
  },
  {
    id: 'ad-fb-ig-carousel',
    name: 'Facebook / IG Carousel Ad',
    category: 'Ads',
    width: 1080,
    height: 1080,
    unit: 'px',
    dpi: 72,
    aspectRatio: '1:1',
    description: '1080 × 1080 px • Social carousel card ad',
  },
];

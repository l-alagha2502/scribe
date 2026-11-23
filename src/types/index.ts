export type NavigationTab = 'home' | 'new-project' | 'my-files' | 'brandings' | 'editor';

export type DimensionUnit = 'px' | 'cm' | 'mm' | 'in';

export interface SizePreset {
  id: string;
  name: string;
  category: 'Suggested' | 'Social Media' | 'Print' | 'Ads';
  width: number;
  height: number;
  unit: DimensionUnit;
  dpi: number;
  aspectRatio: string;
  description?: string;
  isPopular?: boolean;
}

export interface ProjectPageRecord {
  id: string;
  name: string;
  fabricJson: string;
  thumbnail?: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: DimensionUnit;
  dpi: number;
  fabricJson: string; // JSON string representation of fabric canvas
  thumbnail: string; // Base64 data URL
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  type: 'graphic' | 'video' | 'print';
  tags?: string[];
  pages?: ProjectPageRecord[];
  audioTrack?: {
    id: string;
    name: string;
    url: string;
  };
}

export interface AssetRecord {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'graphic';
  url: string; // Data URL or object URL
  size?: number; // bytes
  dimensions?: string;
  createdAt: number;
  isFavorite: boolean;
  category: 'files' | 'assets'; // raw standalone vs reusable assets repository
  mimeType?: string;
}

export interface BrandRecord {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColors: string[];
  fonts: string[];
  logoUrl?: string;
  createdAt: number;
  notes?: string;
}

export interface CustomFontRecord {
  id: string;
  name: string;
  format: 'truetype' | 'opentype' | 'woff' | 'woff2';
  fontDataUrl: string;
  createdAt: number;
}

export interface SavedTemplateRecord {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  unit: DimensionUnit;
  dpi: number;
  type: 'graphic' | 'video' | 'print';
  fabricJson: string;
  backgroundColor?: string;
  thumbnail: string;
  isBuiltIn: boolean;
  isStarred: boolean;
  createdAt: number;
  updatedAt: number;
  scribeJson?: string;
}


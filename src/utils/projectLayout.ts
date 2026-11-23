/**
 * Utility to calculate dynamic aspect ratio, orientation category,
 * and adaptive layout sizing for canvas projects.
 */
export interface ProjectLayout {
  orientation: 'horizontal' | 'vertical' | 'square';
  aspectRatio: number;
  badge: 'Landscape' | 'Portrait' | 'Square';
  previewAspectClass: string;
  gridSpanClass: string;
}

export function getProjectLayout(width: number, height: number): ProjectLayout {
  const w = Number(width) > 0 ? Number(width) : 1080;
  const h = Number(height) > 0 ? Number(height) : 1080;
  const ratio = w / h;

  // Horizontal / Landscape (e.g. 1920x1080, 1200x630, 16:9, 16:10, 2:1)
  if (ratio >= 1.2) {
    return {
      orientation: 'horizontal',
      aspectRatio: ratio,
      badge: 'Landscape',
      previewAspectClass: 'aspect-[16/9] w-full',
      gridSpanClass: 'card-span-2', // Expands horizontally!
    };
  }

  // Vertical / Portrait (e.g. 1080x1920 Reel/Story, 1080x1350 Instagram Portrait, 9:16)
  if (ratio <= 0.85) {
    return {
      orientation: 'vertical',
      aspectRatio: ratio,
      badge: 'Portrait',
      previewAspectClass: 'aspect-[9/16] max-h-[380px] w-full',
      gridSpanClass: 'col-span-1 sm:col-span-1 lg:col-span-1', // Vertical tall card!
    };
  }

  // Square (e.g. 1080x1080 Instagram Post, 1:1)
  return {
    orientation: 'square',
    aspectRatio: ratio,
    badge: 'Square',
    previewAspectClass: 'aspect-square max-h-[320px] w-full',
    gridSpanClass: 'col-span-1 sm:col-span-1 lg:col-span-1', // Square card!
  };
}

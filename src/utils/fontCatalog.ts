export type BuiltInFontCategory =
  | 'Sans-Serif'
  | 'Display & Bold'
  | 'Serif'
  | 'Pixel, Retro & Mono'
  | 'Script & Expressive';

export type FontFilterCategory = 'All' | BuiltInFontCategory | 'Custom';

export const FONT_FILTER_CATEGORIES: FontFilterCategory[] = [
  'All',
  'Sans-Serif',
  'Display & Bold',
  'Serif',
  'Pixel, Retro & Mono',
  'Script & Expressive',
  'Custom',
];

export interface CuratedFontItem {
  family: string;
  category: BuiltInFontCategory;
  weights: number[];
  fallbackStack: string;
  tags: string[];
}

const SANS_FALLBACK = "'Inter', system-ui, -apple-system, sans-serif";
const DISPLAY_FALLBACK = "'Space Grotesk', 'Inter', system-ui, sans-serif";
const SERIF_FALLBACK = "Georgia, 'Times New Roman', serif";
const MONO_FALLBACK = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
const SCRIPT_FALLBACK = "'Brush Script MT', cursive, serif";

function makeFont(
  family: string,
  category: BuiltInFontCategory,
  weights: number[],
  tags: string[] = []
): CuratedFontItem {
  let genericFallback = SANS_FALLBACK;
  if (category === 'Display & Bold') genericFallback = DISPLAY_FALLBACK;
  else if (category === 'Serif') genericFallback = SERIF_FALLBACK;
  else if (category === 'Pixel, Retro & Mono') genericFallback = MONO_FALLBACK;
  else if (category === 'Script & Expressive') genericFallback = SCRIPT_FALLBACK;

  return {
    family,
    category,
    weights,
    fallbackStack: `'${family}', ${genericFallback}`,
    tags: [family.toLowerCase(), category.toLowerCase(), ...tags],
  };
}

export const CURATED_FONT_CATALOG: CuratedFontItem[] = [
  // --- SANS-SERIF (16) ---
  makeFont('Inter', 'Sans-Serif', [400, 700], ['ui', 'clean', 'modern']),
  makeFont('Space Grotesk', 'Sans-Serif', [400, 700], ['geometric', 'tech', 'modern']),
  makeFont('Plus Jakarta Sans', 'Sans-Serif', [400, 700], ['saas', 'clean', 'geometric']),
  makeFont('DM Sans', 'Sans-Serif', [400, 700], ['minimal', 'ui', 'grotesque']),
  makeFont('Poppins', 'Sans-Serif', [400, 700], ['geometric', 'friendly', 'rounded']),
  makeFont('Montserrat', 'Sans-Serif', [400, 700], ['brand', 'poster', 'urban']),
  makeFont('Manrope', 'Sans-Serif', [400, 700], ['modern', 'dashboard', 'clean']),
  makeFont('Outfit', 'Sans-Serif', [400, 700], ['geometric', 'logo', 'sleek']),
  makeFont('Work Sans', 'Sans-Serif', [400, 700], ['editorial', 'clean', 'body']),
  makeFont('Rubik', 'Sans-Serif', [400, 700], ['rounded', 'ui', 'friendly']),
  makeFont('Lato', 'Sans-Serif', [400, 700], ['corporate', 'readable', 'humanist']),
  makeFont('Open Sans', 'Sans-Serif', [400, 700], ['readable', 'body', 'neutral']),
  makeFont('Nunito', 'Sans-Serif', [400, 700], ['soft', 'rounded', 'friendly']),
  makeFont('Raleway', 'Sans-Serif', [400, 700], ['elegant', 'headline', 'fashion']),
  makeFont('Figtree', 'Sans-Serif', [400, 700], ['clean', 'product', 'ui']),
  makeFont('Urbanist', 'Sans-Serif', [400, 700], ['minimal', 'geometric', 'modern']),

  // --- DISPLAY & BOLD (14) ---
  makeFont('Syne', 'Display & Bold', [400, 700], ['avant-garde', 'poster', 'wide']),
  makeFont('Bebas Neue', 'Display & Bold', [400], ['condensed', 'poster', 'tall']),
  makeFont('Anton', 'Display & Bold', [400], ['heavy', 'headline', 'impact']),
  makeFont('Archivo Black', 'Display & Bold', [400], ['bold', 'streetwear', 'grotesk']),
  makeFont('Oswald', 'Display & Bold', [400, 700], ['condensed', 'editorial', 'title']),
  makeFont('Barlow Condensed', 'Display & Bold', [400, 700], ['tall', 'sport', 'clean']),
  makeFont('Righteous', 'Display & Bold', [400], ['retro', 'geometric', 'badge']),
  makeFont('Unbounded', 'Display & Bold', [400, 700], ['wide', 'futuristic', 'display']),
  makeFont('Big Shoulders Display', 'Display & Bold', [400, 700], ['athletic', 'condensed', 'poster']),
  makeFont('Russo One', 'Display & Bold', [400], ['gaming', 'bold', 'sport']),
  makeFont('Bricolage Grotesque', 'Display & Bold', [400, 700], ['quirky', 'editorial', 'brand']),
  makeFont('Black Ops One', 'Display & Bold', [400], ['stencil', 'military', 'streetwear']),
  makeFont('Chakra Petch', 'Display & Bold', [400, 700], ['cyber', 'mecha', 'angular']),
  makeFont('Titan One', 'Display & Bold', [400], ['chunky', 'bubble', 'title']),

  // --- SERIF (12) ---
  makeFont('Playfair Display', 'Serif', [400, 700], ['luxury', 'editorial', 'high-contrast']),
  makeFont('Lora', 'Serif', [400, 700], ['book', 'contemporary', 'readable']),
  makeFont('Merriweather', 'Serif', [400, 700], ['press', 'article', 'classic']),
  makeFont('Cormorant Garamond', 'Serif', [400, 700], ['fashion', 'luxury', 'delicate']),
  makeFont('Libre Baskerville', 'Serif', [400, 700], ['classic', 'print', 'authoritative']),
  makeFont('Fraunces', 'Serif', [400, 700], ['soft-serif', 'editorial', 'warm']),
  makeFont('Cinzel', 'Serif', [400, 700], ['roman', 'monumental', 'caps']),
  makeFont('Newsreader', 'Serif', [400, 700], ['journal', 'article', 'sharp']),
  makeFont('DM Serif Display', 'Serif', [400], ['headline', 'magazine', 'bold']),
  makeFont('Bodoni Moda', 'Serif', [400, 700], ['vogue', 'fashion', 'high-fashion']),
  makeFont('EB Garamond', 'Serif', [400, 700], ['literature', 'timeless', 'print']),
  makeFont('Instrument Serif', 'Serif', [400], ['editorial', 'condensed', 'modern']),

  // --- PIXEL, RETRO & MONO (10) ---
  makeFont('Pixelify Sans', 'Pixel, Retro & Mono', [400, 700], ['pixel', 'arcade', 'game']),
  makeFont('Press Start 2P', 'Pixel, Retro & Mono', [400], ['8-bit', 'retro', 'nes']),
  makeFont('Silkscreen', 'Pixel, Retro & Mono', [400, 700], ['bitmap', 'crisp', 'pixel']),
  makeFont('VT323', 'Pixel, Retro & Mono', [400], ['terminal', 'crt', 'retro']),
  makeFont('JetBrains Mono', 'Pixel, Retro & Mono', [400, 700], ['code', 'monospace', 'dev']),
  makeFont('Space Mono', 'Pixel, Retro & Mono', [400, 700], ['tech', 'editorial', 'mono']),
  makeFont('IBM Plex Mono', 'Pixel, Retro & Mono', [400, 700], ['lab', 'data', 'mono']),
  makeFont('Fira Code', 'Pixel, Retro & Mono', [400, 700], ['developer', 'ligatures', 'code']),
  makeFont('Share Tech Mono', 'Pixel, Retro & Mono', [400], ['sci-fi', 'hud', 'mono']),
  makeFont('Audiowide', 'Pixel, Retro & Mono', [400], ['synthwave', 'techno', 'wide']),

  // --- SCRIPT & EXPRESSIVE (8) ---
  makeFont('Pacifico', 'Script & Expressive', [400], ['brush', 'surf', 'retro']),
  makeFont('Caveat', 'Script & Expressive', [400, 700], ['handwriting', 'note', 'casual']),
  makeFont('Dancing Script', 'Script & Expressive', [400, 700], ['cursive', 'invitation', 'flowing']),
  makeFont('Lobster', 'Script & Expressive', [400], ['bold-script', 'signage', 'retro']),
  makeFont('Permanent Marker', 'Script & Expressive', [400], ['marker', 'graffiti', 'street']),
  makeFont('Shadows Into Light', 'Script & Expressive', [400], ['neat-hand', 'sketch', 'journal']),
  makeFont('Satisfy', 'Script & Expressive', [400], ['signature', 'brush', 'warm']),
  makeFont('Great Vibes', 'Script & Expressive', [400], ['calligraphy', 'formal', 'wedding']),
];

const CURATED_BY_FAMILY = new Map<string, CuratedFontItem>(
  CURATED_FONT_CATALOG.map((item) => [item.family.toLowerCase(), item])
);

// Session-level font loading caches
const loadedFontsCache = new Set<string>(['Inter', 'JetBrains Mono', 'Arial', 'Georgia']);
const requestedStylesheetsCache = new Set<string>(['Inter', 'JetBrains Mono']);
const inFlightFontLoads = new Map<string, Promise<boolean>>();
const hoverDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const fontLoadListeners = new Set<(family: string) => void>();

export function getCuratedFontItem(family: string): CuratedFontItem | undefined {
  return CURATED_BY_FAMILY.get(family.trim().toLowerCase());
}

/**
 * Always returns a clean fallback CSS font stack so text never flashes blank boxes while loading.
 */
export function getFontFallbackStack(family: string): string {
  const clean = family.trim();
  const curated = getCuratedFontItem(clean);
  if (curated) return curated.fallbackStack;
  return `'${clean}', ${SANS_FALLBACK}`;
}

/**
 * Builds a minimal Google Fonts CSS2 URL requesting only essential weights (e.g. 400;700 or 400).
 */
export function buildGoogleFontCssUrl(family: string, weights?: number[]): string {
  const curated = getCuratedFontItem(family);
  const wList = (weights && weights.length > 0 ? weights : curated?.weights || [400, 700])
    .slice()
    .sort((a, b) => a - b);
  const encodedFamily = encodeURIComponent(curated?.family || family).replace(/%20/g, '+');
  return `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${wList.join(';')}&display=swap`;
}

export function isFontCachedLoaded(family: string): boolean {
  return loadedFontsCache.has(family);
}

export function getLoadedFontsSnapshot(): string[] {
  return Array.from(loadedFontsCache);
}

export function subscribeFontLoaded(listener: (family: string) => void): () => void {
  fontLoadListeners.add(listener);
  return () => {
    fontLoadListeners.delete(listener);
  };
}

function notifyFontLoaded(family: string): void {
  fontLoadListeners.forEach((cb) => {
    try {
      cb(family);
    } catch {
      // ignore subscriber failure
    }
  });
}

function waitForStylesheet(url: string, family: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLLinkElement>(
      `link[data-scribe-font="${CSS.escape ? CSS.escape(family) : family}"]`
    );
    if (existing) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.setAttribute('data-scribe-font', family);

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timer = setTimeout(done, 4500);
    link.onload = () => {
      clearTimeout(timer);
      done();
    };
    link.onerror = () => {
      clearTimeout(timer);
      done();
    };

    document.head.appendChild(link);
  });
}

/**
 * Lazy-loads a single font family on demand (minimal essential weights 400/700)
 * and caches it so each font is requested at most once per session.
 */
export async function loadFontOnDemand(family: string): Promise<boolean> {
  const cleanFamily = family.trim();
  if (!cleanFamily) return false;

  const curated = getCuratedFontItem(cleanFamily);
  const canonicalName = curated?.family || cleanFamily;

  if (loadedFontsCache.has(canonicalName)) {
    return true;
  }

  const existingPromise = inFlightFontLoads.get(canonicalName);
  if (existingPromise) {
    return existingPromise;
  }

  if (typeof document === 'undefined') {
    loadedFontsCache.add(canonicalName);
    return true;
  }

  const promise = (async () => {
    try {
      // Check if font is already registered via FontFace API (e.g. user-uploaded custom fonts)
      if (document.fonts && typeof document.fonts.check === 'function') {
        const alreadyInDocumentFonts = Array.from(document.fonts).some(
          (ff) => ff.family.replace(/['"]/g, '').toLowerCase() === canonicalName.toLowerCase() && ff.status === 'loaded'
        );
        if (alreadyInDocumentFonts) {
          loadedFontsCache.add(canonicalName);
          notifyFontLoaded(canonicalName);
          return true;
        }
      }

      if (curated && !requestedStylesheetsCache.has(canonicalName)) {
        requestedStylesheetsCache.add(canonicalName);
        const cssUrl = buildGoogleFontCssUrl(canonicalName, curated.weights);
        await waitForStylesheet(cssUrl, canonicalName);
      }

      if (document.fonts && typeof document.fonts.load === 'function') {
        const weightsToLoad = curated?.weights || [400];
        await Promise.allSettled(
          weightsToLoad.map((w) => document.fonts.load(`${w} 16px "${canonicalName}"`))
        );
        await document.fonts.ready;
      }

      loadedFontsCache.add(canonicalName);
      notifyFontLoaded(canonicalName);
      return true;
    } catch {
      return false;
    } finally {
      inFlightFontLoads.delete(canonicalName);
    }
  })();

  inFlightFontLoads.set(canonicalName, promise);
  return promise;
}

/**
 * Preloads multiple fonts on demand (e.g. when opening an existing saved project).
 */
export async function ensureFontsLoaded(families: string[]): Promise<void> {
  const unique = Array.from(new Set(families.map((f) => f.trim()).filter(Boolean)));
  await Promise.allSettled(unique.map((f) => loadFontOnDemand(f)));
}

/**
 * Debounced hover/focus preloader so fast scrolling through the font list does not spam requests.
 */
export function scheduleHoverFontLoad(family: string, delayMs: number = 140): void {
  const clean = family.trim();
  if (!clean || loadedFontsCache.has(clean)) return;

  const existingTimer = hoverDebounceTimers.get(clean);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    hoverDebounceTimers.delete(clean);
    void loadFontOnDemand(clean);
  }, delayMs);

  hoverDebounceTimers.set(clean, timer);
}

export function cancelHoverFontLoad(family?: string): void {
  if (family) {
    const clean = family.trim();
    const t = hoverDebounceTimers.get(clean);
    if (t) {
      clearTimeout(t);
      hoverDebounceTimers.delete(clean);
    }
    return;
  }
  hoverDebounceTimers.forEach((t) => clearTimeout(t));
  hoverDebounceTimers.clear();
}

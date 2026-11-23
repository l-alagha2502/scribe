import { ProjectRecord, AssetRecord, CustomFontRecord } from '../types';

export interface ScribeProjectPackage {
  magic: 'SCRIBE_DESIGN_PROJECT';
  scribeVersion: '2.0.0';
  ecosystem: 'vastx.app';
  timestamp: number;
  project: ProjectRecord;
  embeddedAssets: AssetRecord[];
  customFonts: CustomFontRecord[];
  meta: {
    generator: string;
    canvasWidth: number;
    canvasHeight: number;
    layersCount: number;
    previewUrl?: string;
  };
}

/**
 * Creates a structured .scribe package object from project state,
 * embedding any referenced assets and custom fonts.
 */
export function createScribePackage(
  project: ProjectRecord,
  allAssets: AssetRecord[] = [],
  allFonts: CustomFontRecord[] = []
): ScribeProjectPackage {
  // Count layers in fabricJson safely
  let layersCount = 0;
  try {
    const parsed = JSON.parse(project.fabricJson);
    if (Array.isArray(parsed?.objects)) {
      layersCount = parsed.objects.length;
    }
  } catch {
    layersCount = 0;
  }

  // Find assets referenced in this project's fabricJson or all assets if specific
  const fabricStr = project.fabricJson || '';
  const embeddedAssets = allAssets.filter(
    (asset) =>
      fabricStr.includes(asset.id) ||
      (asset.url && fabricStr.includes(asset.url)) ||
      asset.isFavorite
  );

  // Find custom fonts referenced in project text objects
  const embeddedFonts = allFonts.filter((font) =>
    fabricStr.includes(font.name)
  );

  return {
    magic: 'SCRIBE_DESIGN_PROJECT',
    scribeVersion: '2.0.0',
    ecosystem: 'vastx.app',
    timestamp: Date.now(),
    project: {
      ...project,
      updatedAt: Date.now(),
    },
    embeddedAssets,
    customFonts: embeddedFonts,
    meta: {
      generator: 'Scribe Design Studio (vastx.app)',
      canvasWidth: project.width,
      canvasHeight: project.height,
      layersCount,
      previewUrl: project.thumbnail,
    },
  };
}

/**
 * Generates a deterministic filesystem-safe `.scribe` filename for a project.
 */
export function buildScribeFilename(projectName?: string): string {
  const safeName = (projectName || 'untitled_project')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${safeName || 'scribe_design'}.scribe`;
}

/**
 * Serializes the Scribe package to JSON and triggers an automatic browser download.
 */
export function downloadScribeFile(
  project: ProjectRecord,
  allAssets: AssetRecord[] = [],
  allFonts: CustomFontRecord[] = []
): ScribeProjectPackage {
  const pkg = createScribePackage(project, allAssets, allFonts);
  const jsonString = JSON.stringify(pkg, null, 2);
  const blob = new Blob([jsonString], { type: 'application/x-scribe-project;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildScribeFilename(project.name);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return pkg;
}

function assertValidFabricJson(fabricJson: string): void {
  let canvasObj: unknown;
  try {
    canvasObj = JSON.parse(fabricJson);
  } catch {
    throw new Error('Corrupt .scribe file: fabricJson is not valid JSON.');
  }
  if (!canvasObj || typeof canvasObj !== 'object' || Array.isArray(canvasObj)) {
    throw new Error('Corrupt .scribe file: Canvas state must be a JSON object.');
  }
  const candidate = canvasObj as { objects?: unknown };
  if (candidate.objects !== undefined && !Array.isArray(candidate.objects)) {
    throw new Error('Corrupt .scribe file: Canvas objects field must be an array.');
  }
}

/**
 * Validates and extracts a .scribe package from raw file content.
 */
export function parseScribePackage(rawJson: string): ScribeProjectPackage {
  if (typeof rawJson !== 'string' || !rawJson.trim()) {
    throw new Error('Invalid file format: File content is empty.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid file format: File content is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid .scribe file: Payload must be a structured object.');
  }

  const pkg = parsed as Partial<ScribeProjectPackage>;

  if (pkg.magic !== 'SCRIBE_DESIGN_PROJECT') {
    // Check if it's a raw ProjectRecord exported inside wrapper
    if (pkg.project && typeof pkg.project.id === 'string' && typeof pkg.project.fabricJson === 'string') {
      assertValidFabricJson(pkg.project.fabricJson);
      return {
        magic: 'SCRIBE_DESIGN_PROJECT',
        scribeVersion: '2.0.0',
        ecosystem: 'vastx.app',
        timestamp: Date.now(),
        project: {
          ...pkg.project,
          width: Number.isFinite(Number(pkg.project.width)) && Number(pkg.project.width) > 0 ? Number(pkg.project.width) : 1080,
          height: Number.isFinite(Number(pkg.project.height)) && Number(pkg.project.height) > 0 ? Number(pkg.project.height) : 1080,
        } as ProjectRecord,
        embeddedAssets: Array.isArray(pkg.embeddedAssets) ? pkg.embeddedAssets : [],
        customFonts: Array.isArray(pkg.customFonts) ? pkg.customFonts : [],
        meta: {
          generator: 'Scribe Design Studio (Legacy)',
          canvasWidth: pkg.project.width || 1080,
          canvasHeight: pkg.project.height || 1080,
          layersCount: 1,
        },
      };
    }

    // Check if it's a raw ProjectRecord directly
    const rawProj = parsed as Partial<ProjectRecord>;
    if (typeof rawProj.name === 'string' && typeof rawProj.fabricJson === 'string') {
      assertValidFabricJson(rawProj.fabricJson);
      const width = Number.isFinite(Number(rawProj.width)) && Number(rawProj.width) > 0 ? Number(rawProj.width) : 1080;
      const height = Number.isFinite(Number(rawProj.height)) && Number(rawProj.height) > 0 ? Number(rawProj.height) : 1080;
      return {
        magic: 'SCRIBE_DESIGN_PROJECT',
        scribeVersion: '2.0.0',
        ecosystem: 'vastx.app',
        timestamp: Date.now(),
        project: {
          id: rawProj.id || `proj_${Date.now()}`,
          name: rawProj.name,
          width,
          height,
          unit: rawProj.unit || 'px',
          dpi: rawProj.dpi || 72,
          fabricJson: rawProj.fabricJson,
          thumbnail: rawProj.thumbnail || '',
          createdAt: rawProj.createdAt || Date.now(),
          updatedAt: Date.now(),
          isFavorite: !!rawProj.isFavorite,
          type: rawProj.type || 'graphic',
        },
        embeddedAssets: [],
        customFonts: [],
        meta: {
          generator: 'Scribe Import',
          canvasWidth: width,
          canvasHeight: height,
          layersCount: 1,
        },
      };
    }

    throw new Error('Invalid .scribe package: Missing SCRIBE_DESIGN_PROJECT signature.');
  }

  if (
    !pkg.project ||
    typeof pkg.project !== 'object' ||
    typeof pkg.project.fabricJson !== 'string' ||
    !pkg.project.fabricJson.trim()
  ) {
    throw new Error('Corrupt .scribe file: Missing valid project canvas state.');
  }

  assertValidFabricJson(pkg.project.fabricJson);

  const normalizedWidth =
    Number.isFinite(Number(pkg.project.width)) && Number(pkg.project.width) > 0
      ? Number(pkg.project.width)
      : Number(pkg.meta?.canvasWidth) > 0
      ? Number(pkg.meta?.canvasWidth)
      : 1080;
  const normalizedHeight =
    Number.isFinite(Number(pkg.project.height)) && Number(pkg.project.height) > 0
      ? Number(pkg.project.height)
      : Number(pkg.meta?.canvasHeight) > 0
      ? Number(pkg.meta?.canvasHeight)
      : 1080;

  return {
    ...(pkg as ScribeProjectPackage),
    project: {
      ...pkg.project,
      name: (pkg.project.name || 'Imported Design').trim(),
      width: normalizedWidth,
      height: normalizedHeight,
      unit: pkg.project.unit || 'px',
      dpi: pkg.project.dpi || 72,
      type: pkg.project.type || 'graphic',
      thumbnail: pkg.project.thumbnail || pkg.meta?.previewUrl || '',
    },
    embeddedAssets: Array.isArray(pkg.embeddedAssets) ? pkg.embeddedAssets : [],
    customFonts: Array.isArray(pkg.customFonts) ? pkg.customFonts : [],
  };
}

/**
 * Builds a pre-filled GitHub Issue URL allowing creators to submit their `.scribe` template.
 * Safely caps inline JSON length so the query string never exceeds URL limits.
 */
export function buildGitHubScribeSubmissionUrl(
  pkg: ScribeProjectPackage,
  options?: { owner?: string; repo?: string }
): string {
  const owner = (options?.owner || 'scribe-studio').trim();
  const repo = (options?.repo || 'community-templates').trim();
  const name = pkg.project.name || 'Untitled Template';
  const filename = buildScribeFilename(name);
  const title = `[Template Submission]: ${name} (${pkg.meta.canvasWidth}x${pkg.meta.canvasHeight})`;

  const compactPkg = {
    magic: pkg.magic,
    scribeVersion: pkg.scribeVersion,
    project: {
      name: pkg.project.name,
      width: pkg.project.width,
      height: pkg.project.height,
      unit: pkg.project.unit,
      dpi: pkg.project.dpi,
      type: pkg.project.type,
      fabricJson: pkg.project.fabricJson,
    },
    meta: {
      generator: pkg.meta.generator,
      canvasWidth: pkg.meta.canvasWidth,
      canvasHeight: pkg.meta.canvasHeight,
      layersCount: pkg.meta.layersCount,
    },
  };

  const compactJson = JSON.stringify(compactPkg);
  const bodyLines = [
    `### Scribe Community Template Submission`,
    ``,
    `- **Template Name:** ${name}`,
    `- **Dimensions:** ${pkg.meta.canvasWidth} × ${pkg.meta.canvasHeight} ${pkg.project.unit || 'px'}`,
    `- **Layers:** ${pkg.meta.layersCount}`,
    `- **Suggested File:** \`${filename}\``,
    ``,
  ];

  if (compactJson.length <= 2800) {
    bodyLines.push('#### `.scribe` JSON Payload', '```json', compactJson, '```');
  } else {
    bodyLines.push(
      '#### Attach `.scribe` File',
      `Please drag & drop your exported \`${filename}\` file directly into this GitHub issue comment box before submitting.`
    );
  }

  return `https://github.com/${owner}/${repo}/issues/new?title=${encodeURIComponent(
    title
  )}&body=${encodeURIComponent(bodyLines.join('\n'))}&labels=community-template`;
}

/**
 * Reads a File instance, parses the .scribe package, and returns the project and embedded items.
 */
export async function readScribeFile(file: File): Promise<ScribeProjectPackage> {
  const text = await file.text();
  return parseScribePackage(text);
}

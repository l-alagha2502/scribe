import { ProjectRecord, AssetRecord, CustomFontRecord } from '../types';
import { createScribePackage, ScribeProjectPackage } from './scribePackage';

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token?: string;
  authorAlias?: string;
}

export interface CommunityTemplatePayload {
  version: '1.0.0';
  id: string;
  name: string;
  author: string;
  authorHandle?: string;
  description: string;
  category: string;
  tags: string[];
  timestamp: number;
  publishedAt: string;
  canvas: {
    width: number;
    height: number;
    unit: string;
    dpi: number;
    type: 'graphic' | 'video' | 'print';
  };
  thumbnail: string;
  projectData: {
    fabricJson: string;
    embeddedAssetsCount: number;
  };
  scribePackage: ScribeProjectPackage;
}

export interface PublishResult {
  success: boolean;
  isSimulated?: boolean;
  commitSha?: string;
  commitUrl?: string;
  fileUrl?: string;
  rawUrl?: string;
  filePath: string;
  template: CommunityTemplatePayload;
}

const STORAGE_KEY_GITHUB_CONFIG = 'scribe_github_config';
const STORAGE_KEY_COMMUNITY_PUBLISHED = 'scribe_community_published';

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  owner: 'scribe-studio',
  repo: 'community-templates',
  branch: 'main',
  token: '',
  authorAlias: '',
};

/**
 * Retrieve saved GitHub configuration from localStorage
 */
export function getSavedGitHubConfig(): GitHubConfig {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_GITHUB_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_GITHUB_CONFIG,
          ...parsed,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved GitHub config:', err);
  }
  return { ...DEFAULT_GITHUB_CONFIG };
}

/**
 * Persist GitHub configuration to localStorage
 */
export function saveGitHubConfig(config: Partial<GitHubConfig>): GitHubConfig {
  const current = getSavedGitHubConfig();
  const updated: GitHubConfig = {
    ...current,
    ...config,
    owner: (config.owner || current.owner).trim().replace(/^\/+|\/+$/g, ''),
    repo: (config.repo || current.repo).trim().replace(/^\/+|\/+$/g, ''),
    branch: (config.branch || current.branch || 'main').trim(),
  };
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_GITHUB_CONFIG, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to save GitHub config to localStorage:', err);
  }
  return updated;
}

/**
 * Creates safe slug from text for filename generation
 */
export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'template';
}

/**
 * Packages project, metadata, and author into a standardized Community Template payload
 */
export function createCommunityTemplatePayload(params: {
  project: ProjectRecord;
  name: string;
  author: string;
  authorHandle?: string;
  description: string;
  category?: string;
  tags?: string[];
  allAssets?: AssetRecord[];
  allFonts?: CustomFontRecord[];
}): CommunityTemplatePayload {
  const {
    project,
    name,
    author,
    authorHandle,
    description,
    category = 'General',
    tags = [],
    allAssets = [],
    allFonts = [],
  } = params;

  if (!name.trim()) {
    throw new Error('Template name is required.');
  }
  if (!author.trim()) {
    throw new Error('Author name or handle is required.');
  }

  const cleanName = name.trim();
  const cleanAuthor = author.trim();
  const timestamp = Date.now();
  const safeSlug = `${slugifyText(cleanName)}-${timestamp}`;
  const templateId = `scribe_tmpl_${safeSlug}`;

  // Package project into .scribe payload structure
  const scribePkg = createScribePackage(
    {
      ...project,
      name: cleanName,
    },
    allAssets,
    allFonts
  );

  return {
    version: '1.0.0',
    id: templateId,
    name: cleanName,
    author: cleanAuthor,
    authorHandle: authorHandle?.trim() || undefined,
    description: description.trim(),
    category,
    tags: tags.map((t) => t.trim()).filter(Boolean),
    timestamp,
    publishedAt: new Date(timestamp).toISOString(),
    canvas: {
      width: project.width,
      height: project.height,
      unit: project.unit,
      dpi: project.dpi,
      type: project.type,
    },
    thumbnail: project.thumbnail || '',
    projectData: {
      fabricJson: project.fabricJson,
      embeddedAssetsCount: scribePkg.embeddedAssets.length,
    },
    scribePackage: scribePkg,
  };
}

/**
 * UTF-8 safe Base64 encoder for browser and Node environments
 */
export function utf8ToBase64(str: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  }
  // Node.js fallback
  return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * UTF-8 safe Base64 decoder
 */
export function base64ToUtf8(b64: string): string {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const raw = window.atob(b64);
    const percentEncoded = Array.from(raw)
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('');
    return decodeURIComponent(percentEncoded);
  }
  // Node.js fallback
  return Buffer.from(b64, 'base64').toString('utf-8');
}

/**
 * Builds the repository path where the template will be stored
 */
export function buildTemplateFilePath(author: string, templateName: string, timestamp: number): string {
  const authorSlug = slugifyText(author);
  const nameSlug = slugifyText(templateName);
  return `templates/community/${authorSlug}_${nameSlug}_${timestamp}.json`;
}

/**
 * Saves successfully published template to local storage history
 */
export function recordPublishedTemplateLocally(record: PublishResult): void {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_COMMUNITY_PUBLISHED);
      const list: PublishResult[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((item) => item.template.id !== record.template.id);
      filtered.unshift(record);
      localStorage.setItem(STORAGE_KEY_COMMUNITY_PUBLISHED, JSON.stringify(filtered.slice(0, 30)));
    }
  } catch (err) {
    console.warn('Failed to record published template locally:', err);
  }
}

/**
 * Retrieves all locally recorded published templates
 */
export function getLocallyPublishedTemplates(): PublishResult[] {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_COMMUNITY_PUBLISHED);
      return raw ? JSON.parse(raw) : [];
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * Client-Side GitHub REST API Submission.
 * Submits the template directly to GitHub repository contents via PUT /repos/{owner}/{repo}/contents/{path}
 */
export async function publishTemplateToGitHub(
  payload: CommunityTemplatePayload,
  config: GitHubConfig,
  options?: { isDemoMode?: boolean }
): Promise<PublishResult> {
  const owner = config.owner?.trim() || DEFAULT_GITHUB_CONFIG.owner;
  const repo = config.repo?.trim() || DEFAULT_GITHUB_CONFIG.repo;
  const branch = config.branch?.trim() || 'main';
  const token = config.token?.trim();
  const filePath = buildTemplateFilePath(payload.author, payload.name, payload.timestamp);

  // If Demo / Sandbox mode is explicitly selected or no token with demo requested:
  if (options?.isDemoMode) {
    // Simulate real async GitHub commit network latency
    await new Promise((resolve) => setTimeout(resolve, 950));
    const simulatedSha = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const result: PublishResult = {
      success: true,
      isSimulated: true,
      commitSha: simulatedSha,
      commitUrl: `https://github.com/${owner}/${repo}/commit/${simulatedSha}`,
      fileUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`,
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`,
      filePath,
      template: payload,
    };
    recordPublishedTemplateLocally(result);
    return result;
  }

  if (!token) {
    throw new Error(
      'GitHub Personal Access Token is required to commit directly to the repository. Please enter a token or switch to Sandbox / PR mode.'
    );
  }

  const jsonContent = JSON.stringify(payload, null, 2);
  const base64Content = utf8ToBase64(jsonContent);

  // 1. Check if file already exists to obtain SHA for update, or verify repo access
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
  let existingSha: string | undefined = undefined;

  try {
    const checkRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (checkRes.ok) {
      const checkData = await checkRes.json();
      existingSha = checkData.sha;
    } else if (checkRes.status === 401) {
      throw new Error('GitHub Authorization Failed: The provided token is invalid or expired.');
    } else if (checkRes.status === 404) {
      // 404 can mean file does not exist yet (normal) OR repo doesn't exist
      // If we cannot verify repository access, the upcoming PUT will clarify
    }
  } catch (err: any) {
    if (err.message?.includes('Authorization Failed')) {
      throw err;
    }
    // Network or harmless 404 file not found
  }

  // 2. Commit file via PUT /repos/{owner}/{repo}/contents/{path}
  const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const commitMessage = `feat(templates): submit community template "${payload.name}" by @${payload.author}`;

  const requestBody: Record<string, any> = {
    message: commitMessage,
    content: base64Content,
    branch,
  };

  if (existingSha) {
    requestBody.sha = existingSha;
  }

  const response = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = `GitHub API Error (${response.status} ${response.statusText})`;
    try {
      const errorJson = await response.json();
      if (errorJson.message) {
        if (response.status === 401) {
          errorMessage = 'Invalid or expired GitHub token. Ensure your token has repo contents write access.';
        } else if (response.status === 404) {
          errorMessage = `Repository "${owner}/${repo}" was not found or your token lacks write permission.`;
        } else if (response.status === 403) {
          errorMessage = `GitHub rate limit exceeded or insufficient permissions: ${errorJson.message}`;
        } else {
          errorMessage = errorJson.message;
        }
      }
    } catch {
      // fallback to status code message
    }
    throw new Error(errorMessage);
  }

  const responseData = await response.json();
  const result: PublishResult = {
    success: true,
    isSimulated: false,
    commitSha: responseData.commit?.sha,
    commitUrl: responseData.commit?.html_url || `https://github.com/${owner}/${repo}/commit/${responseData.commit?.sha}`,
    fileUrl: responseData.content?.html_url || `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`,
    rawUrl: responseData.content?.download_url,
    filePath,
    template: payload,
  };

  // Record into local published log
  recordPublishedTemplateLocally(result);

  return result;
}

/**
 * Generates a pre-filled GitHub Issue URL for submission if direct commit token is not preferred
 */
export function generateGitHubIssueUrl(
  payload: CommunityTemplatePayload,
  config: GitHubConfig
): string {
  const owner = config.owner || DEFAULT_GITHUB_CONFIG.owner;
  const repo = config.repo || DEFAULT_GITHUB_CONFIG.repo;
  const title = encodeURIComponent(`[Template Submission]: ${payload.name} by @${payload.author}`);
  const summary = [
    `### Community Template Submission`,
    `**Template Name:** ${payload.name}`,
    `**Author:** ${payload.author}${payload.authorHandle ? ` (@${payload.authorHandle})` : ''}`,
    `**Category:** ${payload.category}`,
    `**Dimensions:** ${payload.canvas.width} × ${payload.canvas.height} ${payload.canvas.unit} (${payload.canvas.type})`,
    `**Description:** ${payload.description}`,
    ``,
    `#### Template JSON Payload`,
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  ].join('\n');

  return `https://github.com/${owner}/${repo}/issues/new?title=${title}&body=${encodeURIComponent(
    summary
  )}&labels=community-template`;
}

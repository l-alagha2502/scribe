import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  Download,
  ExternalLink,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  AssetRecord,
  CustomFontRecord,
  ProjectRecord,
  SavedTemplateRecord,
} from '../../types';
import {
  buildScribeFilename,
  downloadScribeFile,
} from '../../utils/scribePackage';
import {
  deleteTemplateFromLibrary,
  importScribeTextAsTemplate,
  loadTemplateLibrary,
  saveProjectAsLibraryTemplate,
  saveTemplateLocallyAndDownload,
  sortAndFilterTemplates,
  TemplateFilterMode,
  toggleStarTemplate,
} from '../../utils/templateLibrary';

export const GITHUB_TEMPLATES_URL = 'https://github.com/l-alagha2502/scribe';

export interface LoadedTemplatePayload {
  fabricJson: string;
  name: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

interface TemplatesPanelProps {
  getLiveProjectSnapshot: () => ProjectRecord;
  allAssets: AssetRecord[];
  allFonts: CustomFontRecord[];
  onLoadTemplate: (payload: LoadedTemplatePayload) => void | Promise<void>;
  onInsertTemplateAsNewPage: (payload: LoadedTemplatePayload) => void;
  onOpenShareModal?: (snapshot: ProjectRecord, savedFilename: string) => void;
  templateLibraryRevision?: number;
}

export const TemplatesPanel: React.FC<TemplatesPanelProps> = ({
  getLiveProjectSnapshot,
  allAssets,
  allFonts,
  onLoadTemplate,
  onInsertTemplateAsNewPage,
  onOpenShareModal,
  templateLibraryRevision = 0,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [templates, setTemplates] = useState<SavedTemplateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<TemplateFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
    importedTemplate?: SavedTemplateRecord;
  } | null>(null);

  const refreshLibrary = async () => {
    const loaded = await loadTemplateLibrary();
    setTemplates(loaded);
    setIsLoading(false);
  };

  useEffect(() => {
    void refreshLibrary();
  }, [templateLibraryRevision]);

  const filteredTemplates = useMemo(
    () =>
      sortAndFilterTemplates(templates, {
        filter: filterMode,
        searchQuery,
      }),
    [templates, filterMode, searchQuery]
  );

  const starredCount = useMemo(
    () => templates.filter((t) => t.isStarred).length,
    [templates]
  );

  const handleExportScribe = () => {
    const liveProject = getLiveProjectSnapshot();
    downloadScribeFile(liveProject, allAssets, allFonts);
    const filename = buildScribeFilename(liveProject.name);
    setStatusBanner({
      type: 'success',
      message: `Exported ${filename} with live canvas layers, styles, effects, and animations.`,
    });
  };

  const handleSaveCurrentToLibrary = async () => {
    const liveProject = getLiveProjectSnapshot();
    const saved = await saveProjectAsLibraryTemplate(liveProject, undefined, allAssets, allFonts);
    await refreshLibrary();
    setStatusBanner({
      type: 'success',
      message: `Saved "${saved.name}" to your template library.`,
    });
  };

  const handleSubmitToGitHub = async () => {
    const liveProject = getLiveProjectSnapshot();
    const { record, filename } = await saveTemplateLocallyAndDownload(
      liveProject,
      allAssets,
      allFonts
    );
    await refreshLibrary();
    setStatusBanner({
      type: 'success',
      message: `Saved "${record.name}" locally and prepared ${filename}.`,
    });
    onOpenShareModal?.(liveProject, filename);
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const { template } = await importScribeTextAsTemplate(text);
      await refreshLibrary();
      setFilterMode('all');
      setStatusBanner({
        type: 'success',
        message: `Imported "${template.name}" into your local library.`,
        importedTemplate: template,
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Could not import file: malformed .scribe schema.';
      setStatusBanner({
        type: 'error',
        message: msg,
      });
    }
  };

  const handleToggleStar = async (templateId: string) => {
    await toggleStarTemplate(templateId);
    await refreshLibrary();
  };

  const handleDeleteTemplate = async (template: SavedTemplateRecord) => {
    await deleteTemplateFromLibrary(template);
    await refreshLibrary();
    setStatusBanner({
      type: 'success',
      message: `Removed "${template.name}" from persistent library.`,
    });
  };

  const applyTemplateToCanvas = (template: SavedTemplateRecord) => {
    void onLoadTemplate({
      fabricJson: template.fabricJson,
      name: template.name,
      width: template.width,
      height: template.height,
      backgroundColor: template.backgroundColor,
    });
  };

  const insertTemplateAsNewPage = (template: SavedTemplateRecord) => {
    onInsertTemplateAsNewPage({
      fabricJson: template.fabricJson,
      name: template.name,
      width: template.width,
      height: template.height,
      backgroundColor: template.backgroundColor,
    });
  };

  return (
    <div className="space-y-3.5" data-testid="templates-panel">
      {/* Primary .scribe Actions */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            data-testid="export-scribe-btn"
            onClick={handleExportScribe}
            className="py-2 px-2.5 rounded-xl bg-white text-[#08080a] hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Save .scribe</span>
          </button>

          <button
            type="button"
            data-testid="import-scribe-btn"
            onClick={() => fileInputRef.current?.click()}
            className="py-2 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>Import .scribe</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".scribe,.json,application/json"
            data-testid="import-scribe-input"
            onChange={handleImportFileChange}
            className="hidden"
          />
        </div>

        {/* Secondary Actions: Save Copy & Submit to GitHub */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            data-testid="save-to-library-btn"
            onClick={() => void handleSaveCurrentToLibrary()}
            className="py-1.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <BookmarkPlus className="w-3 h-3 shrink-0" />
            <span>Save to Library</span>
          </button>

          <button
            type="button"
            data-testid="submit-github-scribe-link"
            onClick={() => void handleSubmitToGitHub()}
            className="py-1.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[11px] font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span>Submit to GitHub</span>
          </button>
        </div>
      </div>

      {/* Inline Feedback / Validation Banner */}
      {statusBanner && (
        <div
          role="status"
          data-testid="templates-status-banner"
          className={`p-2.5 rounded-xl border text-[11px] space-y-2 ${
            statusBanner.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-100'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5">
              {statusBanner.type === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{statusBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {statusBanner.importedTemplate && (
            <button
              type="button"
              data-testid="apply-imported-now-btn"
              onClick={() => applyTemplateToCanvas(statusBanner.importedTemplate!)}
              className="w-full py-1.5 px-2 rounded-lg bg-white text-[#08080a] hover:bg-slate-200 text-[11px] font-semibold transition-colors"
            >
              Apply to Canvas Now
            </button>
          )}
        </div>
      )}

      {/* Search & Filter Library Bar */}
      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-[11px] tabular-nums">
          <span className="font-medium text-slate-300">Saved Templates</span>
          <span className="text-slate-400">{templates.length} saved</span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            data-testid="template-search-input"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved templates..."
            className="w-full py-2 pl-8 pr-8 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-white/25"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear template search"
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Segmented Tabs */}
        <div
          role="tablist"
          aria-label="Filter templates"
          className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[10px]"
        >
          {(
            [
              { id: 'all', label: `All (${templates.length})` },
              { id: 'starred', label: `Starred (${starredCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filterMode === tab.id}
              data-testid={`template-filter-${tab.id}`}
              onClick={() => setFilterMode(tab.id)}
              className={`py-1 px-1.5 rounded-lg font-medium transition-colors whitespace-nowrap truncate tabular-nums ${
                filterMode === tab.id
                  ? 'bg-white text-[#08080a] font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Cards List */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1].map((n) => (
            <div
              key={n}
              className="h-32 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div
          data-testid="templates-empty-state"
          className="py-8 px-3 rounded-xl border border-dashed border-white/[0.08] text-center space-y-1.5"
        >
          <div className="text-xs font-medium text-slate-300">
            {filterMode === 'starred'
              ? 'No starred templates yet'
              : searchQuery.trim()
              ? 'No matching templates'
              : 'No templates saved yet'}
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            {filterMode === 'starred'
              ? 'Star a saved template to pin it here.'
              : 'Import a .scribe file or save your current canvas to build your local library.'}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5" data-testid="templates-list">
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              data-testid={`template-card-${tmpl.id}`}
              className="p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.07] hover:border-white/[0.16] transition-colors space-y-2"
            >
              {/* Local Preview Thumbnail */}
              <div
                onClick={() => applyTemplateToCanvas(tmpl)}
                className="aspect-[16/10] rounded-lg overflow-hidden border border-white/[0.05] bg-[#08080a] cursor-pointer relative group"
                title={`Click to use ${tmpl.name}`}
              >
                {tmpl.thumbnail ? (
                  <img
                    src={tmpl.thumbnail}
                    alt={tmpl.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400 px-3 text-center">
                    {tmpl.name}
                  </div>
                )}
              </div>

              {/* Card Header: Name + Metadata + Star & Delete Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-xs font-semibold text-white truncate">
                    {tmpl.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate tabular-nums">
                    {tmpl.width} × {tmpl.height} · {tmpl.category}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    data-testid={`template-star-${tmpl.id}`}
                    onClick={() => void handleToggleStar(tmpl.id)}
                    aria-label={tmpl.isStarred ? `Unstar ${tmpl.name}` : `Star ${tmpl.name}`}
                    title={tmpl.isStarred ? 'Remove star' : 'Star & pin to top'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      tmpl.isStarred
                        ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                        : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-amber-300 hover:border-white/20'
                    }`}
                  >
                    <Star
                      className="w-3.5 h-3.5"
                      fill={tmpl.isStarred ? 'currentColor' : 'none'}
                    />
                  </button>

                  <button
                    type="button"
                    data-testid={`template-delete-${tmpl.id}`}
                    onClick={() => void handleDeleteTemplate(tmpl)}
                    aria-label={`Delete template ${tmpl.name}`}
                    title="Delete saved template permanently"
                    className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-slate-400 hover:text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  data-testid={`template-use-${tmpl.id}`}
                  onClick={() => applyTemplateToCanvas(tmpl)}
                  className="py-1.5 px-2 rounded-lg bg-white text-[#08080a] hover:bg-slate-200 text-[11px] font-semibold transition-colors whitespace-nowrap"
                >
                  Use Template
                </button>
                <button
                  type="button"
                  data-testid={`template-newpage-${tmpl.id}`}
                  onClick={() => insertTemplateAsNewPage(tmpl)}
                  className="py-1.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 hover:text-white text-[11px] font-medium border border-white/[0.07] transition-colors whitespace-nowrap"
                >
                  + New Page
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

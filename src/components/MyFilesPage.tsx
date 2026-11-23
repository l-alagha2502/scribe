import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FolderOpen,
  Layers,
  Star,
  Package,
  Upload,
  ArrowUpDown,
  Download,
  Trash2,
  Copy,
  Plus,
  Video,
  Music,
  Cloud,
  FileCode,
  Share2,
} from 'lucide-react';
import { ProjectRecord, AssetRecord, CustomFontRecord } from '../types';
import { saveAsset, deleteAsset, toggleFavoriteAsset, saveProject, saveCustomFont } from '../utils/db';
import { downloadDataUrl } from '../utils/imageTools';
import { downloadScribeFile, readScribeFile } from '../utils/scribePackage';
import { saveTemplateLocallyAndDownload } from '../utils/templateLibrary';
import { PublishCommunityModal } from './PublishCommunityModal';

export type MyFilesTab = 'files' | 'projects' | 'saved' | 'assets';

interface MyFilesPageProps {
  projects: ProjectRecord[];
  assets: AssetRecord[];
  customFonts?: CustomFontRecord[];
  initialTab?: MyFilesTab;
  onOpenProject: (project: ProjectRecord) => void;
  onToggleFavoriteProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (project: ProjectRecord) => void;
  onRefreshAssets: () => void;
  onCreateNewProject: (width: number, height: number, name?: string) => void;
  onOpenCloudSync?: () => void;
  onProjectImported?: (project: ProjectRecord) => void;
}

export const MyFilesPage: React.FC<MyFilesPageProps> = ({
  projects,
  assets,
  customFonts = [],
  initialTab = 'projects',
  onOpenProject,
  onToggleFavoriteProject,
  onDeleteProject,
  onDuplicateProject,
  onRefreshAssets,
  onCreateNewProject,
  onOpenCloudSync,
  onProjectImported,
}) => {
  const [activeTab, setActiveTab] = useState<MyFilesTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSortBy, setFilterSortBy] = useState<'name' | 'date' | 'type'>('date');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [projectToPublish, setProjectToPublish] = useState<ProjectRecord | null>(null);
  const [shareFilename, setShareFilename] = useState<string | undefined>(undefined);
  const scribeInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleShareProject = async (project: ProjectRecord) => {
    const { filename } = await saveTemplateLocallyAndDownload(
      project,
      assets,
      customFonts
    );
    setShareFilename(filename);
    setProjectToPublish(project);
  };

  const handleImportScribe = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const pkg = await readScribeFile(file);
      for (const a of pkg.embeddedAssets || []) {
        await saveAsset(a);
      }
      for (const f of pkg.customFonts || []) {
        await saveCustomFont(f);
      }

      const imported: ProjectRecord = {
        ...pkg.project,
        id: `proj_import_${Date.now()}`,
        name: `${pkg.project.name} (Imported)`,
        updatedAt: Date.now(),
      };
      await saveProject(imported);
      onProjectImported?.(imported);
      if (scribeInputRef.current) scribeInputRef.current.value = '';
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    }
  };

  const tabs = [
    { id: 'projects' as const, label: 'Projects', count: projects.length, icon: Layers },
    { id: 'files' as const, label: 'Files', count: assets.filter((a) => a.category === 'files').length, icon: FolderOpen },
    { id: 'assets' as const, label: 'Assets', count: assets.filter((a) => a.category === 'assets').length, icon: Package },
    {
      id: 'saved' as const,
      label: 'Saved',
      count:
        projects.filter((p) => p.isFavorite).length +
        assets.filter((a) => a.isFavorite).length,
      icon: Star,
    },
  ];

  const handleUploadAsset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (typeof ev.target?.result === 'string') {
        const dataUrl = ev.target.result;
        const type: 'image' | 'video' | 'audio' | 'graphic' = file.type.startsWith('video')
          ? 'video'
          : file.type.startsWith('audio')
          ? 'audio'
          : 'image';

        const newAsset: AssetRecord = {
          id: `asset_${Date.now()}`,
          name: file.name,
          type,
          url: dataUrl,
          size: file.size,
          dimensions: 'Uploaded File',
          createdAt: Date.now(),
          isFavorite: false,
          category: activeTab === 'assets' ? 'assets' : 'files',
          mimeType: file.type,
        };

        await saveAsset(newAsset);
        onRefreshAssets();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAsset = async (id: string) => {
    await deleteAsset(id);
    onRefreshAssets();
  };

  const handleToggleFavoriteAsset = async (id: string) => {
    await toggleFavoriteAsset(id);
    onRefreshAssets();
  };

  const filteredProjects = useMemo(() => {
    let list = projects.filter((p) => {
      if (activeTab === 'saved') return p.isFavorite;
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (filterSortBy === 'name') {
        return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (filterSortBy === 'type') {
        return sortDirection === 'asc' ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
      }
      return sortDirection === 'asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
    });

    return list;
  }, [projects, activeTab, searchQuery, filterSortBy, sortDirection]);

  const filteredAssets = useMemo(() => {
    let list = assets.filter((a) => {
      if (activeTab === 'saved') return a.isFavorite;
      if (activeTab === 'assets') return a.category === 'assets';
      if (activeTab === 'files') return a.category === 'files';
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (filterSortBy === 'name') {
        return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (filterSortBy === 'type') {
        return sortDirection === 'asc' ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
      }
      return sortDirection === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
    });

    return list;
  }, [assets, activeTab, searchQuery, filterSortBy, sortDirection]);

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 max-w-6xl mx-auto w-full space-y-8">
      {/* 1. Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.05] pb-4">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            My Files
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Local browser repository for designs, raw media, and reusable assets
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 hover:text-white text-xs font-medium border border-white/[0.14] hover:border-white/[0.24] cursor-pointer transition-all shadow-sm">
            <FileCode className="w-3.5 h-3.5 text-slate-300" />
            <span>Import .scribe</span>
            <input
              ref={scribeInputRef}
              type="file"
              accept=".scribe,.json"
              onChange={handleImportScribe}
              className="hidden"
            />
          </label>
          <button
            onClick={onOpenCloudSync}
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 hover:text-white text-xs font-medium border border-white/[0.14] hover:border-white/[0.24] transition-all shadow-sm cursor-pointer"
            title="Google Drive Cloud Sync"
          >
            <Cloud className="w-3.5 h-3.5 text-slate-300" />
            <span>Cloud Sync</span>
          </button>
          <label className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 hover:text-white text-xs font-medium border border-white/[0.14] hover:border-white/[0.24] cursor-pointer transition-all shadow-sm">
            <Upload className="w-3.5 h-3.5 text-slate-300" />
            <span>Upload {activeTab === 'assets' ? 'Asset' : 'File'}</span>
            <input type="file" onChange={handleUploadAsset} className="hidden" />
          </label>
          <button
            onClick={() => onCreateNewProject(1080, 1080, 'New Design')}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white text-[#08080a] hover:bg-slate-200 text-xs font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-SECTIONS / TABS & SEARCH */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Segmented Glass Tabs */}
        <div className="flex rounded-2xl p-1 bg-white/[0.06] border border-white/[0.12]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-[#08080a] shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="glass-input w-full rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3 h-3 text-slate-400 shrink-0" />
            <select
              value={filterSortBy}
              onChange={(e) => setFilterSortBy(e.target.value as 'name' | 'date' | 'type')}
              className="bg-transparent text-slate-300 text-xs outline-none cursor-pointer"
              aria-label="Sort files by"
            >
              <option value="date" className="bg-[#121318]">Date</option>
              <option value="name" className="bg-[#121318]">Name</option>
              <option value="type" className="bg-[#121318]">Type</option>
            </select>
            <button
              onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="p-0.5 text-slate-400 hover:text-white"
              title={`Toggle sort order (${sortDirection})`}
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. PROJECTS GRID */}
      {(activeTab === 'projects' || (activeTab === 'saved' && filteredProjects.length > 0)) && (
        <section className="space-y-3">
          {activeTab === 'saved' && (
            <h2 className="text-[11px] font-mono tracking-widest uppercase text-slate-500">
              Favorited Projects ({filteredProjects.length})
            </h2>
          )}

          {filteredProjects.length === 0 && activeTab === 'projects' ? (
            <div className="p-12 text-center rounded-3xl glass-panel space-y-3 border border-white/[0.06]">
              <Layers className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">No projects matching your search.</p>
              <button
                onClick={() => onCreateNewProject(1080, 1080, 'New Canvas Project')}
                className="py-2 px-4 rounded-xl bg-white text-[#08080a] text-xs font-semibold hover:bg-slate-200 shadow-md"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="glass-card flex flex-col rounded-3xl overflow-hidden group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
                >
                  <div
                    onClick={() => onOpenProject(project)}
                    className="relative aspect-[16/10] bg-black/40 overflow-hidden cursor-pointer border-b border-white/[0.08] flex items-center justify-center"
                  >
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-[11px] font-mono text-slate-200 border border-white/[0.15] shadow-sm">
                      {project.width} × {project.height}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    <div className="min-w-0">
                      <h3
                        onClick={() => onOpenProject(project)}
                        className="text-sm font-semibold text-white hover:text-slate-300 transition-colors truncate cursor-pointer"
                        title={project.name}
                      >
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5 font-mono">
                        <span>
                          {new Date(project.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{project.type}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                      <button
                        onClick={() => onToggleFavoriteProject(project.id)}
                        className={`p-2 rounded-xl transition-all border cursor-pointer ${
                          project.isFavorite
                            ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
                            : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white'
                        }`}
                        title={project.isFavorite ? 'Unfavorite' : 'Add to favorites'}
                      >
                        <Star className={`w-4 h-4 ${project.isFavorite ? 'fill-amber-400' : ''}`} />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          data-testid={`myfiles-share-project-${project.id}`}
                          onClick={() => void handleShareProject(project)}
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white transition-all cursor-pointer"
                          title="Share / Submit Template"
                          aria-label="Share / Submit Template"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadScribeFile(project, assets, customFonts)}
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white transition-all cursor-pointer"
                          title="Export .scribe package"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDuplicateProject(project)}
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white transition-all cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteProject(project.id)}
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 border border-white/[0.12] hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. FILES & ASSETS GRID */}
      {(activeTab === 'files' || activeTab === 'assets' || (activeTab === 'saved' && filteredAssets.length > 0)) && (
        <section className="space-y-3">
          {activeTab === 'saved' && (
            <h2 className="text-[11px] font-mono tracking-widest uppercase text-slate-500 pt-4">
              Favorited Assets ({filteredAssets.length})
            </h2>
          )}

          {filteredAssets.length === 0 ? (
            <div className="p-12 text-center rounded-2xl glass-panel-subtle space-y-3">
              <Package className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                No items in {activeTab}. Upload media or graphics to store them locally.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="glass-card flex flex-col rounded-3xl overflow-hidden group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
                >
                  <div className="relative aspect-[16/10] bg-black/40 flex items-center justify-center p-3 border-b border-white/[0.08] overflow-hidden">
                    {asset.type === 'image' || asset.type === 'graphic' ? (
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : asset.type === 'video' ? (
                      <Video className="w-8 h-8 text-slate-400" />
                    ) : (
                      <Music className="w-8 h-8 text-slate-400" />
                    )}

                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-[11px] font-mono text-slate-200 uppercase border border-white/[0.15] shadow-sm">
                      {asset.type}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate" title={asset.name}>
                        {asset.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5 font-mono">
                        <span>{asset.dimensions || 'Vector'}</span>
                        {asset.size && (
                          <>
                            <span>·</span>
                            <span>{Math.round(asset.size / 1024)} KB</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                      <button
                        onClick={() => handleToggleFavoriteAsset(asset.id)}
                        className={`p-2 rounded-xl transition-all border cursor-pointer ${
                          asset.isFavorite
                            ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
                            : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white'
                        }`}
                        title={asset.isFavorite ? 'Unfavorite' : 'Add to favorites'}
                      >
                        <Star className={`w-4 h-4 ${asset.isFavorite ? 'fill-amber-400' : ''}`} />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => downloadDataUrl(asset.url, asset.name)}
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white transition-all cursor-pointer"
                          title="Download Asset"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 border border-white/[0.12] hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete Asset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Share Template Popup */}
      {projectToPublish && (
        <PublishCommunityModal
          isOpen={!!projectToPublish}
          onClose={() => {
            setProjectToPublish(null);
            setShareFilename(undefined);
          }}
          project={projectToPublish}
          allAssets={assets}
          allFonts={customFonts}
          savedFilename={shareFilename}
        />
      )}
    </div>
  );
};

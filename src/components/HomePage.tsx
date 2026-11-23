import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Upload,
  PlusSquare,
  Video,
  ArrowRight,
  Star,
  ChevronRight,
  ChevronDown,
  Check,
  Maximize2,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  Sliders,
  Cloud,
  Download,
  Share2,
  ArrowLeftRight,
} from 'lucide-react';
import { ProjectRecord, NavigationTab, AssetRecord, CustomFontRecord } from '../types';
import { SIZE_PRESETS } from '../utils/dimensionUnits';
import { downloadScribeFile } from '../utils/scribePackage';
import { saveTemplateLocallyAndDownload } from '../utils/templateLibrary';
import { PublishCommunityModal } from './PublishCommunityModal';

interface HomePageProps {
  projects: ProjectRecord[];
  allAssets?: AssetRecord[];
  allFonts?: CustomFontRecord[];
  onSelectTab: (tab: NavigationTab) => void;
  onOpenProject: (project: ProjectRecord) => void;
  onCreateNewProject: (width: number, height: number, name?: string, type?: 'graphic' | 'video' | 'print') => void;
  onToggleFavorite: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (project: ProjectRecord) => void;
  onOpenQuickUpload: () => void;
  onNavigateToMyFilesProjects: () => void;
  onOpenCloudSync?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  projects,
  allAssets = [],
  allFonts = [],
  onSelectTab,
  onOpenProject,
  onCreateNewProject,
  onToggleFavorite,
  onDeleteProject,
  onDuplicateProject,
  onOpenQuickUpload,
  onNavigateToMyFilesProjects,
  onOpenCloudSync,
}) => {
  const [searchCategory, setSearchCategory] = useState<'my-files' | 'tools' | 'sizes'>('my-files');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [projectToPublish, setProjectToPublish] = useState<ProjectRecord | null>(null);
  const [shareFilename, setShareFilename] = useState<string | undefined>(undefined);

  const handleShareProject = async (project: ProjectRecord) => {
    const { filename } = await saveTemplateLocallyAndDownload(
      project,
      allAssets,
      allFonts
    );
    setShareFilename(filename);
    setProjectToPublish(project);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  const quickToolCatalog = [
    {
      id: 'bg-remove',
      name: 'Background Remover',
      desc: 'Alpha matting & chroma removal',
      action: onOpenQuickUpload,
      icon: Sparkles,
    },
    {
      id: 'obj-erase',
      name: 'Object Inpaint Eraser',
      desc: 'Local patch & clone removal',
      action: onOpenQuickUpload,
      icon: Sliders,
    },
    {
      id: 'font-import',
      name: 'Custom Font Importer',
      desc: 'Load device TTF and OTF files',
      action: () => onSelectTab('brandings'),
      icon: Layers,
    },
    {
      id: 'blank-artboard',
      name: 'Standard Canvas',
      desc: '1080 × 1080 px Square Post',
      action: () => onCreateNewProject(1080, 1080, 'Square Design', 'graphic'),
      icon: PlusSquare,
    },
    {
      id: 'converter',
      name: 'Converter',
      desc: 'Convert image & file formats (scribe.vastx.app/convert)',
      action: () => {
        window.location.href = 'https://scribe.vastx.app/convert';
      },
      icon: ArrowLeftRight,
    },
  ];

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();

    if (searchCategory === 'my-files') {
      return projects
        .filter((p) => p.name.toLowerCase().includes(q) || p.tags?.some((t) => t.toLowerCase().includes(q)))
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: `${p.width} × ${p.height} px · ${new Date(p.updatedAt).toLocaleDateString()}`,
          onClick: () => onOpenProject(p),
          icon: Layers,
        }));
    }

    if (searchCategory === 'tools') {
      return quickToolCatalog
        .filter((t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))
        .map((t) => ({
          id: t.id,
          title: t.name,
          subtitle: t.desc,
          onClick: t.action,
          icon: t.icon,
        }));
    }

    if (searchCategory === 'sizes') {
      return SIZE_PRESETS.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          `${s.width}x${s.height}`.includes(q)
      )
        .slice(0, 6)
        .map((s) => ({
          id: s.id,
          title: s.name,
          subtitle: `${s.width} × ${s.height} px · ${s.category}`,
          onClick: () =>
            onCreateNewProject(
              s.width,
              s.height,
              s.name,
              s.category === 'Print' ? 'print' : 'graphic'
            ),
          icon: Maximize2,
        }));
    }

    return [];
  }, [searchQuery, searchCategory, projects]);

  const recentProjects = projects.slice(0, 8);

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 max-w-6xl mx-auto w-full space-y-12">
      {/* 1. TOP-CENTER GLASS SEARCH BAR */}
      <section className="flex flex-col items-center justify-center pt-2 relative z-40">
        <div className="w-full max-w-xl relative">
          <div className="flex items-center rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus-within:bg-white/[0.1] border border-white/[0.12] focus-within:border-white/[0.25] backdrop-blur-2xl transition-all duration-200 px-4 py-2 shadow-xl shadow-black/40">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchActive(true);
              }}
              onFocus={() => setIsSearchActive(true)}
              placeholder={`Search ${
                searchCategory === 'my-files'
                  ? 'projects & designs...'
                  : searchCategory === 'tools'
                  ? 'tools & utilities...'
                  : 'canvas dimensions & formats...'
              }`}
              className="flex-1 bg-transparent border-none text-white text-xs outline-none px-2 placeholder:text-slate-400 font-normal"
            />

            <div className="flex items-center gap-2 pl-3 border-l border-white/[0.12] relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.14] hover:border-white/[0.24] text-slate-100 hover:text-white text-xs font-medium transition-all duration-200 cursor-pointer shadow-sm select-none"
                aria-haspopup="listbox"
                aria-expanded={isCategoryDropdownOpen}
              >
                <span>
                  {searchCategory === 'my-files'
                    ? 'Files'
                    : searchCategory === 'tools'
                    ? 'Tools'
                    : 'Sizes'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isCategoryDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Smooth-edged dropdown menu dropping DOWN and spaced away from the button */}
              {isCategoryDropdownOpen && (
                <div
                  style={{ backgroundColor: 'rgba(18, 20, 28, 0.97)' }}
                  className="absolute right-8 top-full mt-3 w-48 rounded-2xl p-1.5 z-50 border border-white/[0.18] shadow-2xl shadow-black/95 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col gap-1"
                  role="listbox"
                >
                  {[
                    { id: 'my-files' as const, label: 'Files', desc: 'Projects & designs' },
                    { id: 'tools' as const, label: 'Tools', desc: 'Image utilities' },
                    { id: 'sizes' as const, label: 'Sizes', desc: 'Canvas presets' },
                  ].map((cat) => {
                    const isSelected = searchCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSearchCategory(cat.id);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-white text-[#08080a] font-semibold shadow-md'
                            : 'text-slate-200 hover:text-white hover:bg-white/[0.08]'
                        }`}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div>
                          <div className={isSelected ? 'text-[#08080a] font-semibold' : 'text-slate-100 font-medium'}>
                            {cat.label}
                          </div>
                          <div className={`text-[10px] ${isSelected ? 'text-slate-600' : 'text-slate-400'}`}>
                            {cat.desc}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#08080a] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setIsSearchActive(true)}
                className="p-1.5 rounded-full bg-white text-[#08080a] hover:bg-slate-200 transition-transform active:scale-95 shadow-md shrink-0 cursor-pointer"
                title="Search"
                aria-label="Search"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Results Glass Dropdown */}
          {isSearchActive && searchQuery.trim() && (
            <div
              style={{ backgroundColor: 'rgba(18, 20, 28, 0.97)' }}
              className="absolute top-full left-0 right-0 mt-2.5 backdrop-blur-2xl rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in duration-150 max-h-80 overflow-y-auto border border-white/[0.18]"
            >
              <div className="flex items-center justify-between px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/[0.06]">
                <span>
                  {searchCategory === 'my-files' ? 'Matching Projects' : searchCategory === 'tools' ? 'Tools' : 'Canvas Sizes'}
                </span>
                <button
                  onClick={() => setIsSearchActive(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matches found for &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04] pt-1">
                  {searchResults.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.onClick();
                          setIsSearchActive(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                            <ItemIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-medium text-white">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{item.subtitle}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 2. MINIMAL QUICK LAUNCHERS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono tracking-widest uppercase text-slate-400">
            Quick Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Action 1: Upload & Edit */}
          <button
            onClick={onOpenQuickUpload}
            className="glass-card flex items-center gap-4.5 p-5 rounded-3xl text-left group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/20 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/[0.07] border border-white/[0.12] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.14] transition-all shrink-0 shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                Upload & Edit
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Remove backgrounds, inpaint erase & upscale
              </p>
            </div>
          </button>

          {/* Action 2: New Project */}
          <button
            onClick={() => onSelectTab('new-project')}
            className="glass-card flex items-center gap-4.5 p-5 rounded-3xl text-left group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/20 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/[0.07] border border-white/[0.12] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.14] transition-all shrink-0 shadow-sm">
              <PlusSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                New Project
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Custom canvas or curated size presets
              </p>
            </div>
          </button>

          {/* Action 3: New Video */}
          <button
            onClick={() => onCreateNewProject(1920, 1080, 'Video Project 1080p', 'video')}
            className="glass-card flex items-center gap-4.5 p-5 rounded-3xl text-left group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/20 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/[0.07] border border-white/[0.12] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.14] transition-all shrink-0 shadow-sm">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                New Video
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                16:9 full HD layout & video container
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* 3. RECENT PROJECTS SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono tracking-widest uppercase text-slate-400">
              Recent Projects
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">({projects.length})</span>
          </div>

          <button
            onClick={onNavigateToMyFilesProjects}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-14 text-center rounded-3xl glass-panel space-y-4 border border-white/[0.07]">
            <p className="text-xs text-slate-400">No projects created yet.</p>
            <button
              onClick={() => onCreateNewProject(1080, 1080, 'First Project', 'graphic')}
              className="py-2.5 px-5 rounded-xl bg-white text-[#08080a] text-xs font-semibold hover:bg-slate-200 transition-all shadow-md cursor-pointer"
            >
              Start First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="glass-card flex flex-col rounded-3xl overflow-hidden group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
              >
                {/* Visual Thumbnail */}
                <div
                  onClick={() => onOpenProject(project)}
                  className="relative aspect-[16/10] bg-black/40 overflow-hidden cursor-pointer flex items-center justify-center border-b border-white/[0.08]"
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

                {/* Card Details */}
                <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                  <div className="min-w-0">
                    <h3
                      onClick={() => onOpenProject(project)}
                      className="text-sm font-semibold text-white truncate cursor-pointer hover:text-slate-300 transition-colors"
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

                  {/* Actions - Visible & neatly fitted */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                    <button
                      onClick={() => onToggleFavorite(project.id)}
                      className={`p-2 rounded-xl transition-all border cursor-pointer ${
                        project.isFavorite
                          ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
                          : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white'
                      }`}
                      title={project.isFavorite ? 'Unfavorite' : 'Add to favorites'}
                      aria-label="Star Project"
                    >
                      <Star className={`w-4 h-4 ${project.isFavorite ? 'fill-amber-400' : ''}`} />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        data-testid={`home-share-project-${project.id}`}
                        onClick={() => void handleShareProject(project)}
                        className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Share / Submit Template"
                        aria-label="Share / Submit Template"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadScribeFile(project, allAssets, allFonts)}
                        className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Export .scribe package"
                        aria-label="Export .scribe package"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDuplicateProject(project)}
                        className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Duplicate"
                        aria-label="Duplicate Project"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteProject(project.id)}
                        className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 border border-white/[0.12] hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
                        title="Delete"
                        aria-label="Delete Project"
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

      {/* Share Template Popup */}
      {projectToPublish && (
        <PublishCommunityModal
          isOpen={!!projectToPublish}
          onClose={() => {
            setProjectToPublish(null);
            setShareFilename(undefined);
          }}
          project={projectToPublish}
          allAssets={allAssets}
          allFonts={allFonts}
          savedFilename={shareFilename}
        />
      )}
    </div>
  );
};

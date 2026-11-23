import React, { useState, useMemo } from 'react';
import {
  Search,
  Sliders,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Upload,
  ArrowRight,
  Maximize2,
  Printer,
  Share2,
  Sparkles,
  Megaphone,
} from 'lucide-react';
import { DimensionUnit, ProjectRecord, SizePreset } from '../types';
import { SIZE_PRESETS, convertToPixels } from '../utils/dimensionUnits';
import { saveProject } from '../utils/db';

interface NewProjectPageProps {
  onOpenProject: (project: ProjectRecord) => void;
  onCreateNewProject: (
    width: number,
    height: number,
    name?: string,
    type?: 'graphic' | 'video' | 'print',
    unit?: DimensionUnit,
    dpi?: number
  ) => void;
}

const PRESET_CATEGORIES: Array<SizePreset['category']> = [
  'Suggested',
  'Social Media',
  'Print',
  'Ads',
];

export const NewProjectPage: React.FC<NewProjectPageProps> = ({
  onOpenProject,
  onCreateNewProject,
}) => {
  const [sizeSearchQuery, setSizeSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Custom size form state
  const [customWidth, setCustomWidth] = useState<number>(1200);
  const [customHeight, setCustomHeight] = useState<number>(800);
  const [customUnit, setCustomUnit] = useState<DimensionUnit>('px');
  const [customDpi, setCustomDpi] = useState<number>(72);
  const [customName, setCustomName] = useState<string>('Custom Canvas');

  const categories = ['All', ...PRESET_CATEGORIES];

  const isSearching = sizeSearchQuery.trim().length > 0;

  const filteredPresets = useMemo(() => {
    const q = sizeSearchQuery.trim().toLowerCase();
    return SIZE_PRESETS.filter((preset) => {
      const orientation =
        preset.width > preset.height
          ? 'landscape'
          : preset.height > preset.width
          ? 'portrait'
          : 'square';
      const matchesQuery =
        !q ||
        preset.name.toLowerCase().includes(q) ||
        preset.category.toLowerCase().includes(q) ||
        preset.aspectRatio.toLowerCase().includes(q) ||
        orientation.includes(q) ||
        preset.description?.toLowerCase().includes(q) ||
        `${preset.width}x${preset.height}`.includes(q) ||
        `${preset.width}×${preset.height}`.includes(q) ||
        `${preset.width} × ${preset.height}`.includes(q);
      if (isSearching) {
        return matchesQuery;
      }
      const matchesCategory = activeCategory === 'All' || preset.category === activeCategory;
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, sizeSearchQuery, isSearching]);

  const groupedPresets = useMemo(() => {
    const visibleCategories =
      activeCategory === 'All'
        ? PRESET_CATEGORIES
        : PRESET_CATEGORIES.filter((c) => c === activeCategory);

    return visibleCategories
      .map((category) => ({
        category,
        items: filteredPresets.filter((p) => p.category === category),
      }))
      .filter((group) => group.items.length > 0);
  }, [activeCategory, filteredPresets]);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const pixelWidth = convertToPixels(customWidth, customUnit, customDpi);
    const pixelHeight = convertToPixels(customHeight, customUnit, customDpi);
    const projectType = customUnit === 'mm' || customUnit === 'in' ? 'print' : 'graphic';
    onCreateNewProject(
      pixelWidth,
      pixelHeight,
      customName || 'Custom Canvas',
      projectType,
      customUnit,
      customDpi
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        const dataUrl = ev.target.result;
        const img = new Image();
        img.onload = async () => {
          const width = img.naturalWidth || 1080;
          const height = img.naturalHeight || 1080;
          const newProj: ProjectRecord = {
            id: `proj_${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            width,
            height,
            unit: 'px',
            dpi: 72,
            fabricJson: JSON.stringify({
              version: '6.0.0',
              background: '#08080a',
              objects: [
                {
                  type: 'image',
                  left: 0,
                  top: 0,
                  width,
                  height,
                  src: dataUrl,
                  selectable: true,
                },
              ],
            }),
            thumbnail: dataUrl,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isFavorite: false,
            type: 'graphic',
          };
          await saveProject(newProj);
          onOpenProject(newProj);
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Suggested':
        return Sparkles;
      case 'Social Media':
        return Share2;
      case 'Print':
        return Printer;
      case 'Ads':
        return Megaphone;
      default:
        return Maximize2;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 max-w-6xl mx-auto w-full space-y-12">
      {/* 1. TOP-CENTER GLASS SEARCH FOR SIZES */}
      <section className="flex flex-col items-center justify-center pt-2">
        <div className="w-full max-w-xl">
          <div className="flex items-center rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus-within:bg-white/[0.1] border border-white/[0.12] focus-within:border-white/[0.25] backdrop-blur-2xl transition-all duration-200 px-4 py-2 shadow-lg shadow-black/40">
            <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={sizeSearchQuery}
              onChange={(e) => setSizeSearchQuery(e.target.value)}
              placeholder="Search format dimensions (Instagram, A4, Poster, Leaderboard)..."
              className="flex-1 bg-transparent border-none text-white text-xs outline-none placeholder:text-slate-400 font-normal"
              aria-label="Search canvas sizes"
            />
            {sizeSearchQuery && (
              <button
                onClick={() => setSizeSearchQuery('')}
                className="text-xs text-slate-300 hover:text-white px-2 py-0.5 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {isSearching ? (
        /* SEARCH-ONLY RESULTS VIEW */
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="text-xs font-mono tracking-widest uppercase text-slate-300">
              Search Results ({filteredPresets.length})
            </h2>
            <button
              onClick={() => setSizeSearchQuery('')}
              className="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Clear search
            </button>
          </div>

          {filteredPresets.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-white/[0.05] border border-white/[0.1] space-y-3">
              <p className="text-sm font-medium text-white">
                No sizes found for &ldquo;{sizeSearchQuery}&rdquo;
              </p>
              <p className="text-xs text-slate-400">
                Try searching by platform, print size, or dimensions like 1080 or A4.
              </p>
              <button
                onClick={() => setSizeSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.14] text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPresets.map((preset) => {
                const Icon = getCategoryIcon(preset.category);
                return (
                  <button
                    key={preset.id}
                    onClick={() =>
                      onCreateNewProject(
                        preset.width,
                        preset.height,
                        preset.name,
                        preset.category === 'Print' ? 'print' : 'graphic',
                        preset.unit,
                        preset.dpi
                      )
                    }
                    className="glass-card flex flex-col justify-between p-5 rounded-3xl text-left group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-0.5 shadow-md shadow-black/20 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-white/[0.07] border border-white/[0.12] flex items-center justify-center text-slate-200 group-hover:text-white transition-colors shadow-sm">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-mono text-slate-400 tabular-nums">
                          {preset.aspectRatio}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                        {preset.name}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 font-mono tabular-nums">
                        {preset.width} × {preset.height} px
                      </p>
                    </div>

                    <div className="pt-3.5 mt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>{preset.category}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* 2. QUICK CANVAS STARTERS (CUSTOM ALWAYS FIRST TOP-LEFT) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <h2 className="text-xs font-mono tracking-widest uppercase text-slate-300">
                Quick Canvas Starters
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Custom dimensions, quick ratios & upload
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.45fr_1fr_1fr_1fr_1fr] gap-4">
              {/* Quick 1 (Top-Left First): Custom Dimensions */}
              <div className="glass-card flex flex-col justify-between p-5 rounded-3xl border border-white/[0.12] shadow-md shadow-black/20">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sliders className="w-4 h-4 text-slate-200" />
                  <span className="text-sm font-semibold text-white">
                    Custom Size
                  </span>
                </div>
                <form onSubmit={handleCreateCustom} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <input
                        type="number"
                        min="50"
                        max="10000"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                        className="glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-white font-mono outline-none tabular-nums"
                        placeholder="Width"
                        title="Width"
                      />
                    </div>
                    <div className="min-w-0">
                      <input
                        type="number"
                        min="50"
                        max="10000"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value))}
                        className="glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-white font-mono outline-none tabular-nums"
                        placeholder="Height"
                        title="Height"
                      />
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value as DimensionUnit)}
                      className="glass-input flex-1 rounded-xl px-2 py-1 text-[11px] text-white outline-none"
                      title="Unit"
                    >
                      <option value="px" className="bg-[#121318]">px</option>
                      <option value="in" className="bg-[#121318]">in</option>
                      <option value="mm" className="bg-[#121318]">mm</option>
                      <option value="cm" className="bg-[#121318]">cm</option>
                    </select>

                    <button
                      type="submit"
                      className="p-1.5 rounded-xl bg-white text-[#08080a] hover:bg-slate-200 transition-all flex items-center justify-center shrink-0 shadow-md active:scale-95 cursor-pointer"
                      title="Create custom artboard"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Quick 2: Square (1:1) */}
              <button
                onClick={() => onCreateNewProject(1080, 1080, 'Square Design (1:1)', 'graphic')}
                className="glass-card flex flex-col items-start p-5 rounded-3xl text-left group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-0.5 shadow-md shadow-black/20 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-white/[0.07] border border-white/[0.12] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.14] transition-all mb-3.5 shadow-sm">
                  <Square className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-white">
                  Square
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5 tabular-nums">1080 × 1080 px</div>
                <span className="text-[10px] text-slate-400 mt-2 font-mono">1:1</span>
              </button>

              {/* Quick 3: Landscape (16:9) */}
              <button
                onClick={() => onCreateNewProject(1920, 1080, 'Landscape Canvas (16:9)', 'graphic')}
                className="glass-card flex flex-col items-start p-5 rounded-3xl text-left group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-0.5 shadow-md shadow-black/20 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-white/[0.07] border border-white/[0.12] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.14] transition-all mb-3.5 shadow-sm">
                  <RectangleHorizontal className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-white">
                  Landscape
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5 tabular-nums">1920 × 1080 px</div>
                <span className="text-[10px] text-slate-400 mt-2 font-mono">16:9</span>
              </button>

              {/* Quick 4: Portrait (9:16) */}
              <button
                onClick={() => onCreateNewProject(1080, 1920, 'Portrait Story (9:16)', 'graphic')}
                className="glass-card flex flex-col items-start p-5 rounded-3xl text-left group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-0.5 shadow-md shadow-black/20 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-white/[0.07] border border-white/[0.12] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.14] transition-all mb-3.5 shadow-sm">
                  <RectangleVertical className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-white">
                  Portrait
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5 tabular-nums">1080 × 1920 px</div>
                <span className="text-[10px] text-slate-400 mt-2 font-mono">9:16</span>
              </button>

              {/* Quick 5: Upload File */}
              <label className="glass-card flex flex-col items-start p-5 rounded-3xl text-left cursor-pointer group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-0.5 shadow-md shadow-black/20">
                <div className="w-11 h-11 rounded-2xl bg-white/[0.07] border border-white/[0.12] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.14] transition-all mb-3.5 shadow-sm">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-white">
                  Upload File
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">Auto-matches size</div>
                <span className="text-[10px] text-slate-400 mt-2 font-mono">PNG / JPG</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </section>

          {/* 3. EXPLORE SIZES (SUGGESTED, SOCIAL MEDIA, PRINT, ADS ORGANIZED BELOW) */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div>
                <h2 className="text-xs font-mono tracking-widest uppercase text-slate-300">
                  Preset Sizes
                </h2>
              </div>

              {/* Minimalist Segmented Glass Tabs */}
              <div className="flex flex-wrap gap-1 p-1 bg-white/[0.06] border border-white/[0.12] rounded-xl">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`py-1.5 px-3.5 rounded-lg text-xs transition-all cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-white text-[#08080a] font-semibold shadow-md'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grouped Preset Sections */}
            <div className="space-y-9">
              {groupedPresets.map((group) => {
                const Icon = getCategoryIcon(group.category);
                return (
                  <div key={group.category} className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-slate-300" />
                        <h3 className="text-xs font-mono tracking-wider uppercase text-slate-200 font-semibold">
                          {group.category}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {group.items.length} sizes
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {group.items.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() =>
                            onCreateNewProject(
                              preset.width,
                              preset.height,
                              preset.name,
                              preset.category === 'Print' ? 'print' : 'graphic',
                              preset.unit,
                              preset.dpi
                            )
                          }
                          className="glass-card flex flex-col justify-between p-5 rounded-3xl text-left group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 hover:-translate-y-0.5 shadow-md shadow-black/20 cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3.5">
                              <div className="w-10 h-10 rounded-2xl bg-white/[0.07] border border-white/[0.12] flex items-center justify-center text-slate-200 group-hover:text-white transition-colors shadow-sm">
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-mono text-slate-400 tabular-nums">
                                {preset.aspectRatio}
                              </span>
                            </div>

                            <h4 className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                              {preset.name}
                            </h4>
                            <p className="text-xs text-slate-300 mt-1 font-mono tabular-nums">
                              {preset.width} × {preset.height} px
                            </p>
                          </div>

                          <div className="pt-3.5 mt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 font-mono">
                            <span>{preset.category}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

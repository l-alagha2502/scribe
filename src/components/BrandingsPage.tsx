import React, { useState } from 'react';
import {
  Palette,
  Plus,
  Sparkles,
  Upload,
  Trash2,
  Check,
  X,
  Type,
  ArrowRight,
} from 'lucide-react';
import { BrandRecord, CustomFontRecord } from '../types';
import { saveBrand, deleteBrand, saveCustomFont, deleteCustomFont } from '../utils/db';
import { extractPaletteFromImageUrl, ExtractedColor } from '../utils/colorExtractor';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { ModalPortal } from './ModalPortal';

interface BrandingsPageProps {
  brands: BrandRecord[];
  customFonts: CustomFontRecord[];
  onRefreshBrands: () => void;
  onRefreshFonts: () => void;
  onCreateDesignWithBrand: (brand: BrandRecord) => void;
}

export const BrandingsPage: React.FC<BrandingsPageProps> = ({
  brands,
  customFonts,
  onRefreshBrands,
  onRefreshFonts,
  onCreateDesignWithBrand,
}) => {
  const [activeSection, setActiveSection] = useState<'brands' | 'fonts'>('brands');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<'manual' | 'extract'>('manual');
  const { backdropProps, contentProps } = useModalBehavior(isModalOpen, () => setIsModalOpen(false));

  // Form State
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#ffffff');
  const [secondaryColors, setSecondaryColors] = useState<string[]>([
    '#0e1017',
    '#3b82f6',
    '#64748b',
    '#f1f5f9',
  ]);
  const [selectedFonts, setSelectedFonts] = useState<string[]>(['Inter', 'JetBrains Mono']);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  // Extraction State
  const [uploadedImageForExtract, setUploadedImageForExtract] = useState<string | null>(null);
  const [extractedPalette, setExtractedPalette] = useState<ExtractedColor[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  // Font Upload Status
  const [fontUploadSuccess, setFontUploadSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setBrandName('');
    setPrimaryColor('#ffffff');
    setSecondaryColors(['#0e1017', '#3b82f6', '#64748b', '#f1f5f9']);
    setSelectedFonts(['Inter', 'JetBrains Mono']);
    setLogoDataUrl(null);
    setUploadedImageForExtract(null);
    setExtractedPalette([]);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setLogoDataUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageForExtraction = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (typeof ev.target?.result === 'string') {
        const url = ev.target.result;
        setUploadedImageForExtract(url);
        setIsExtracting(true);
        const palette = await extractPaletteFromImageUrl(url, 6);
        setExtractedPalette(palette);
        if (palette.length > 0) {
          setPrimaryColor(palette[0].hex);
          setSecondaryColors(palette.slice(1).map((p) => p.hex));
        }
        if (!brandName) {
          setBrandName(file.name.replace(/\.[^/.]+$/, '').toUpperCase());
        }
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    const newBrand: BrandRecord = {
      id: `brand_${Date.now()}`,
      name: brandName.trim(),
      primaryColor,
      secondaryColors: secondaryColors.filter(Boolean),
      fonts: selectedFonts,
      logoUrl: logoDataUrl || undefined,
      createdAt: Date.now(),
    };

    await saveBrand(newBrand);
    onRefreshBrands();
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteBrand = async (id: string) => {
    await deleteBrand(id);
    onRefreshBrands();
  };

  const handleCustomFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const fontName = file.name.replace(/\.[^/.]+$/, '');
    const ext = file.name.split('.').pop()?.toLowerCase();
    const format =
      ext === 'otf'
        ? 'opentype'
        : ext === 'woff'
        ? 'woff'
        : ext === 'woff2'
        ? 'woff2'
        : 'truetype';

    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (typeof ev.target?.result === 'string') {
        const fontDataUrl = ev.target.result;
        try {
          const fontFace = new FontFace(fontName, `url(${fontDataUrl})`);
          await fontFace.load();
          document.fonts.add(fontFace);

          const record: CustomFontRecord = {
            id: `font_${Date.now()}`,
            name: fontName,
            format,
            fontDataUrl,
            createdAt: Date.now(),
          };
          await saveCustomFont(record);
          onRefreshFonts();
          setFontUploadSuccess(fontName);
          setTimeout(() => setFontUploadSuccess(null), 3000);
        } catch {
          console.warn('Could not parse uploaded font file.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFont = async (font: CustomFontRecord) => {
    await deleteCustomFont(font.id);
    try {
      for (const face of Array.from(document.fonts)) {
        if (face.family === font.name || face.family === `"${font.name}"`) {
          document.fonts.delete(face);
        }
      }
    } catch {}
    onRefreshFonts();
  };

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-10 max-w-6xl mx-auto w-full space-y-8">
      {/* 1. Header with Right-Side Section Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            {activeSection === 'brands' ? 'Brand Kits' : 'Fonts Library'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeSection === 'brands'
              ? 'Color palettes, typography systems, and brand identities'
              : 'Manage uploaded device fonts (.ttf, .otf, .woff, .woff2)'}
          </p>
        </div>

        {/* Right-side Toggle Navigation */}
        <div
          className="flex items-center gap-1 p-1 bg-white/[0.06] border border-white/[0.12] rounded-xl self-start sm:self-auto"
          role="tablist"
          aria-label="Brandings Sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'brands'}
            onClick={() => setActiveSection('brands')}
            className={`flex items-center gap-2 py-1.5 px-3.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSection === 'brands'
                ? 'bg-white text-[#08080a] font-semibold shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Brand Kits</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'fonts'}
            onClick={() => setActiveSection('fonts')}
            className={`flex items-center gap-2 py-1.5 px-3.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeSection === 'fonts'
                ? 'bg-white text-[#08080a] font-semibold shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Fonts ({customFonts.length})</span>
          </button>
        </div>
      </div>

      {activeSection === 'brands' ? (
        <>

      {/* 2. BRANDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
        {/* Prominent New Brand Card (Glassmorphic) */}
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="glass-card flex flex-col items-center justify-center p-6 rounded-3xl text-center group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 cursor-pointer"
          aria-label="Create New Brand"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/[0.07] border border-white/[0.14] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:scale-105 group-hover:bg-white/[0.14] transition-all mb-3.5 shadow-sm">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-white">
            New Brand Kit
          </span>
          <p className="text-xs text-slate-400 mt-1.5 max-w-[210px] leading-relaxed">
            Define colors manually or extract from artwork
          </p>
        </button>

        {/* Existing Brand Cards */}
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="glass-card flex flex-col justify-between p-5 sm:p-6 rounded-3xl group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 shadow-md shadow-black/25 overflow-hidden"
          >
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-black/45 border border-white/[0.14] p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-sm mt-0.5">
                    {brand.logoUrl ? (
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Palette className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white leading-snug break-words">
                      {brand.name}
                    </h3>
                    <span className="block text-xs text-slate-400 font-mono leading-relaxed mt-0.5 break-words">
                      {brand.fonts.slice(0, 2).join(', ')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteBrand(brand.id)}
                  className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 border border-white/[0.12] hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition-all cursor-pointer shrink-0"
                  title="Delete Brand"
                  aria-label="Delete Brand"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Color Swatches */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Palette</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="w-8 h-8 rounded-full border border-white/25 shadow-sm shrink-0 cursor-pointer"
                    style={{ backgroundColor: brand.primaryColor }}
                    title={`Primary: ${brand.primaryColor}`}
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {brand.secondaryColors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-6 h-6 rounded-full border border-white/15 shrink-0 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Typography Preview */}
              <div className="mt-4 pt-3.5 border-t border-white/[0.08]">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">Fonts</div>
                <div className="flex flex-wrap gap-1.5">
                  {brand.fonts.map((f, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/[0.07] text-slate-200 border border-white/[0.12]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="pt-4 mt-4 border-t border-white/[0.08]">
              <button
                onClick={() => onCreateDesignWithBrand(brand)}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white text-slate-100 hover:text-[#08080a] text-xs font-semibold border border-white/[0.14] hover:border-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Design with Brand</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

        </>
      ) : (
        /* 3. DEDICATED FONTS SECTION */
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-mono tracking-widest uppercase text-slate-400">
              Uploaded Fonts ({customFonts.length})
            </span>

            <label className="flex items-center gap-2 py-2 px-4 rounded-xl bg-white text-[#08080a] hover:bg-slate-200 text-xs font-semibold cursor-pointer transition-all shadow-md self-start sm:self-auto">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Font (.ttf / .otf)</span>
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleCustomFontUpload}
                className="hidden"
              />
            </label>
          </div>

          {fontUploadSuccess && (
            <div className="p-3 bg-white/[0.08] border border-white/[0.15] rounded-xl flex items-center gap-2 text-xs text-white">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Custom font &ldquo;{fontUploadSuccess}&rdquo; installed successfully.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
            {/* Add Font Upload Card */}
            <label className="glass-card flex flex-col items-center justify-center p-6 rounded-3xl text-center group border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 cursor-pointer min-h-[176px]">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.07] border border-white/[0.14] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:scale-105 group-hover:bg-white/[0.14] transition-all mb-3.5 shadow-sm">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-white">
                Add Custom Font
              </span>
              <p className="text-xs text-slate-400 mt-1.5 max-w-[210px] leading-relaxed">
                Import .ttf, .otf, .woff, or .woff2 font files locally
              </p>
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleCustomFontUpload}
                className="hidden"
              />
            </label>

            {/* Uploaded Font Cards */}
            {customFonts.map((font) => (
              <div
                key={font.id}
                className="glass-card p-5 sm:p-6 rounded-3xl flex flex-col justify-between border border-white/[0.12] hover:border-white/[0.24] transition-all duration-300 shadow-md shadow-black/25 overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white leading-snug break-words">
                      {font.name}
                    </h3>
                    <span className="inline-block text-[10px] font-mono uppercase text-slate-400 mt-0.5">
                      {font.format}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteFont(font)}
                    className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 border border-white/[0.12] hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition-all cursor-pointer shrink-0"
                    title="Delete Font"
                    aria-label={`Delete ${font.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-1.5">
                  <p
                    className="text-lg text-white leading-snug break-words"
                    style={{ fontFamily: font.name }}
                  >
                    The Quick Brown Fox
                  </p>
                  <p
                    className="text-xs text-slate-400 tracking-wide"
                    style={{ fontFamily: font.name }}
                  >
                    Aa Bb Cc 0123456789
                  </p>
                </div>
              </div>
            ))}
          </div>

          {customFonts.length === 0 && (
            <div className="p-6 text-center rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <p className="text-xs text-slate-300">
                No custom fonts uploaded yet. Click &ldquo;Upload Font&rdquo; or &ldquo;Add Custom Font&rdquo; to install local typefaces for the canvas editor.
              </p>
            </div>
          )}
        </section>
      )}

      {/* 4. MODAL: CREATE BRAND */}
      {isModalOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
            {...backdropProps}
          >
          <div
            className="bg-[#12141c]/95 backdrop-blur-3xl rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/[0.15]"
            {...contentProps}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 text-slate-300" />
                <h2 className="text-sm font-semibold text-white">
                  Create Brand Kit
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="px-6 pt-4 flex gap-2">
              <button
                onClick={() => setCreationMode('manual')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                  creationMode === 'manual'
                    ? 'bg-white text-[#08080a] shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white'
                }`}
              >
                Manual Selection
              </button>
              <button
                onClick={() => setCreationMode('extract')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                  creationMode === 'extract'
                    ? 'bg-white text-[#08080a] shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white'
                }`}
              >
                Extract from Image
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBrand} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Acme Studio, Minimalist Co."
                  className="glass-input w-full rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              {creationMode === 'extract' && (
                <div className="p-4 rounded-xl glass-panel-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">Upload Image Asset</span>
                    <span className="text-[10px] text-slate-400 font-mono">Client-side extraction</span>
                  </div>

                  <label className="flex flex-col items-center justify-center p-5 border border-dashed border-white/[0.1] hover:border-white/[0.25] rounded-xl cursor-pointer transition-colors bg-white/[0.02]">
                    <Upload className="w-5 h-5 text-slate-400 mb-1.5" />
                    <span className="text-xs text-slate-300">Click to upload brand artwork</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageForExtraction}
                      className="hidden"
                    />
                  </label>

                  {isExtracting && (
                    <div className="text-center text-xs text-slate-400 font-mono py-1">
                      Scanning color palette...
                    </div>
                  )}

                  {uploadedImageForExtract && extractedPalette.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] text-slate-400 font-medium">Extracted Swatches:</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {extractedPalette.map((color, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              if (i === 0) setPrimaryColor(color.hex);
                              else {
                                const newSec = [...secondaryColors];
                                newSec[i - 1] = color.hex;
                                setSecondaryColors(newSec);
                              }
                            }}
                            className="flex flex-col items-center gap-1 cursor-pointer group"
                          >
                            <div
                              className="w-7 h-7 rounded-full border border-white/20 shadow-sm transition-transform group-hover:scale-110"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className="text-[9px] font-mono text-slate-500">{color.hex}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Color Configuration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase text-slate-400">
                    Primary Color
                  </label>
                  <span className="text-xs font-mono text-slate-300">{primaryColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-none shrink-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="glass-input flex-1 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              {/* Secondary Colors */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-slate-400">
                  Secondary Palette
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {secondaryColors.map((col, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <input
                        type="color"
                        value={col}
                        onChange={(e) => {
                          const updated = [...secondaryColors];
                          updated[idx] = e.target.value;
                          setSecondaryColors(updated);
                        }}
                        className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-none shrink-0"
                      />
                      <input
                        type="text"
                        value={col}
                        onChange={(e) => {
                          const updated = [...secondaryColors];
                          updated[idx] = e.target.value;
                          setSecondaryColors(updated);
                        }}
                        className="glass-input w-full rounded px-1.5 py-0.5 text-[10px] text-white font-mono outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-slate-400">
                  Brand Logo (Optional)
                </label>
                <div className="flex items-center gap-2">
                  {logoDataUrl && (
                    <div className="w-8 h-8 rounded bg-black/40 border border-white/[0.08] p-1 flex items-center justify-center shrink-0">
                      <img src={logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <label className="py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-medium border border-white/[0.06] cursor-pointer">
                    <Upload className="w-3 h-3 inline mr-1.5 text-slate-400" />
                    <span>Upload Logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setLogoDataUrl('/assets/aistudio/scribe-logo-white_7951e577.png')}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Use Scribe Logo
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-white/[0.05] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-1.5 px-3 rounded-lg text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-lg bg-white text-[#08080a] hover:bg-slate-200 text-xs font-medium transition-all"
                >
                  Save Brand Kit
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

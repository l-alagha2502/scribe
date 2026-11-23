import React, { useState, useEffect } from 'react';
import { X, Palette, Check, Sparkles, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { ModalPortal } from './ModalPortal';

export type ThemeMode = 'solid' | 'gradient';
export type AmbientIntensity = 'subtle' | 'medium' | 'deep';

export interface GradientStop {
  id: string;
  color: string;
  position: number; // 0 to 100
}

export interface ThemeConfig {
  mode: ThemeMode;
  solidColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientStops?: GradientStop[];
  gradientAngle: number;
  accentColor?: string;
  ambientIntensity?: AmbientIntensity;
  applyToEditor?: boolean;
}

export const DEFAULT_GRADIENT_STOPS: GradientStop[] = [
  { id: 'stop-1', color: '#08080a', position: 0 },
  { id: 'stop-2', color: '#13151f', position: 100 },
];

export const DEFAULT_THEME: ThemeConfig = {
  mode: 'solid',
  solidColor: '#08080a',
  gradientStart: '#08080a',
  gradientEnd: '#13151f',
  gradientStops: DEFAULT_GRADIENT_STOPS,
  gradientAngle: 135,
  accentColor: '#6366f1',
  ambientIntensity: 'medium',
  applyToEditor: false,
};

const THEME_STORAGE_KEY = 'scribe_custom_theme';

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

export interface EditorChromeCssTokens {
  synced: boolean;
  pageBg: string;
  barBg: string;
  railBg: string;
  panelBg: string;
  floatBg: string;
  border: string;
  accentSoft: string;
  accentBorder: string;
}

export function getEditorChromeCssTokens(theme: ThemeConfig): EditorChromeCssTokens {
  const synced = Boolean(theme.applyToEditor);
  if (!synced) {
    return {
      synced: false,
      pageBg: '#eef0f4',
      barBg: 'rgba(10, 10, 12, 0.90)',
      railBg: 'rgba(10, 10, 12, 0.90)',
      panelBg: 'rgba(13, 14, 18, 0.95)',
      floatBg: 'rgba(10, 10, 12, 0.88)',
      border: 'rgba(255, 255, 255, 0.08)',
      accentSoft: 'rgba(255, 255, 255, 0.08)',
      accentBorder: 'rgba(255, 255, 255, 0.16)',
    };
  }

  const accent = theme.accentColor || '#6366f1';
  const rgb = hexToRgb(accent) || { r: 99, g: 102, b: 241 };
  const themeBg = getThemeBackgroundString(theme);

  return {
    synced: true,
    pageBg: themeBg,
    barBg: 'rgba(8, 10, 14, 0.42)',
    railBg: 'rgba(8, 10, 14, 0.34)',
    panelBg: 'rgba(10, 12, 17, 0.48)',
    floatBg: 'rgba(10, 12, 17, 0.72)',
    border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.26)`,
    accentSoft: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`,
    accentBorder: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`,
  };
}

export function applyThemeToCssVariables(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const accent = theme.accentColor || '#6366f1';
  const rgb = hexToRgb(accent) || { r: 99, g: 102, b: 241 };
  
  const intensityMap: Record<AmbientIntensity, { a1: number; a2: number }> = {
    subtle: { a1: 0.10, a2: 0.05 },
    medium: { a1: 0.18, a2: 0.10 },
    deep: { a1: 0.30, a2: 0.16 },
  };
  const factor = intensityMap[theme.ambientIntensity || 'medium'];

  const root = document.documentElement;
  root.style.setProperty('--theme-accent', accent);
  root.style.setProperty('--theme-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty('--theme-ambient-1', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${factor.a1})`);
  root.style.setProperty(
    '--theme-ambient-2',
    `rgba(${Math.min(255, rgb.r + 40)}, ${Math.max(0, rgb.g - 30)}, ${Math.min(255, rgb.b + 50)}, ${factor.a2})`
  );

  const chrome = getEditorChromeCssTokens(theme);
  root.style.setProperty('--editor-theme-bg', chrome.pageBg);
  root.style.setProperty('--editor-chrome-bar-bg', chrome.barBg);
  root.style.setProperty('--editor-chrome-rail-bg', chrome.railBg);
  root.style.setProperty('--editor-chrome-panel-bg', chrome.panelBg);
  root.style.setProperty('--editor-chrome-float-bg', chrome.floatBg);
  root.style.setProperty('--editor-chrome-border', chrome.border);
  root.style.setProperty('--editor-chrome-accent-soft', chrome.accentSoft);
  root.style.setProperty('--editor-chrome-accent-border', chrome.accentBorder);
  root.setAttribute('data-editor-theme', chrome.synced ? 'synced' : 'default');
}

export function getSavedTheme(): ThemeConfig {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw) {
        const parsed = { ...DEFAULT_THEME, ...JSON.parse(raw) };
        applyThemeToCssVariables(parsed);
        return parsed;
      }
    }
  } catch {}
  applyThemeToCssVariables(DEFAULT_THEME);
  return DEFAULT_THEME;
}

export function saveTheme(theme: ThemeConfig): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
      applyThemeToCssVariables(theme);
    }
  } catch {}
}

export function getNormalizedGradientStops(theme: ThemeConfig): GradientStop[] {
  if (Array.isArray(theme.gradientStops) && theme.gradientStops.length >= 2) {
    return theme.gradientStops.map((s, idx) => ({
      id: s.id || `stop-${idx + 1}`,
      color: s.color || '#08080a',
      position: Math.max(0, Math.min(100, Number.isFinite(s.position) ? s.position : Math.round((idx / (theme.gradientStops!.length - 1)) * 100))),
    }));
  }
  return [
    { id: 'stop-1', color: theme.gradientStart || '#08080a', position: 0 },
    { id: 'stop-2', color: theme.gradientEnd || '#13151f', position: 100 },
  ];
}

export function buildGradientString(stops: GradientStop[], angle: number = 135): string {
  const safeStops = stops.length >= 2 ? stops : DEFAULT_GRADIENT_STOPS;
  const sorted = [...safeStops].sort((a, b) => a.position - b.position);
  return `linear-gradient(${angle}deg, ${sorted.map((s) => `${s.color} ${s.position}%`).join(', ')})`;
}

export function getThemeBackgroundString(theme: ThemeConfig): string {
  if (theme.mode === 'gradient') {
    return buildGradientString(getNormalizedGradientStops(theme), theme.gradientAngle);
  }
  return theme.solidColor || '#08080a';
}

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeConfig;
  onThemeChange: (theme: ThemeConfig) => void;
}

const NEW_STOP_PALETTE = ['#2b194d', '#0f3045', '#3d1630', '#12382b', '#3b2611'];

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
}) => {
  const initialStops = getNormalizedGradientStops(currentTheme);

  const [mode, setMode] = useState<ThemeMode>(currentTheme.mode);
  const [solidColor, setSolidColor] = useState(currentTheme.solidColor);
  const [gradientStops, setGradientStops] = useState<GradientStop[]>(initialStops);
  const [gradientAngle, setGradientAngle] = useState(currentTheme.gradientAngle);
  const [accentColor, setAccentColor] = useState(currentTheme.accentColor || '#6366f1');
  const [ambientIntensity, setAmbientIntensity] = useState<AmbientIntensity>(
    currentTheme.ambientIntensity || 'medium'
  );
  const [applyToEditor, setApplyToEditor] = useState<boolean>(
    Boolean(currentTheme.applyToEditor)
  );

  // Hex code input states
  const [solidHexInput, setSolidHexInput] = useState(currentTheme.solidColor);
  const [stopHexInputs, setStopHexInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialStops.map((s) => [s.id, s.color]))
  );
  const [accentHexInput, setAccentHexInput] = useState(currentTheme.accentColor || '#6366f1');

  useEffect(() => {
    if (isOpen) {
      const normalized = getNormalizedGradientStops(currentTheme);
      setMode(currentTheme.mode);
      setSolidColor(currentTheme.solidColor);
      setSolidHexInput(currentTheme.solidColor);
      setGradientStops(normalized);
      setStopHexInputs(Object.fromEntries(normalized.map((s) => [s.id, s.color])));
      setGradientAngle(currentTheme.gradientAngle);
      setAccentColor(currentTheme.accentColor || '#6366f1');
      setAccentHexInput(currentTheme.accentColor || '#6366f1');
      setAmbientIntensity(currentTheme.ambientIntensity || 'medium');
      setApplyToEditor(Boolean(currentTheme.applyToEditor));
    }
  }, [isOpen, currentTheme]);

  const { backdropProps, contentProps } = useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const solidPresets = [
    { name: 'Pitch Black', hex: '#08080a' },
    { name: 'Obsidian', hex: '#0c0d14' },
    { name: 'Midnight Navy', hex: '#0a0e1a' },
    { name: 'Charcoal Slate', hex: '#121318' },
    { name: 'Emerald Velvet', hex: '#071510' },
    { name: 'Cyber Dark', hex: '#110b1a' },
    { name: 'Plum Noir', hex: '#160d1b' },
    { name: 'Pure Black', hex: '#000000' },
  ];

  const gradientPresets: Array<{
    name: string;
    angle: number;
    stops: Array<{ color: string; position: number }>;
  }> = [
    {
      name: 'Prism Aurora (3-Stop)',
      angle: 135,
      stops: [
        { color: '#090d1f', position: 0 },
        { color: '#27174a', position: 50 },
        { color: '#0b2d3b', position: 100 },
      ],
    },
    {
      name: 'Sunset Velvet (3-Stop)',
      angle: 135,
      stops: [
        { color: '#140b24', position: 0 },
        { color: '#3b1534', position: 52 },
        { color: '#1c1f36', position: 100 },
      ],
    },
    {
      name: 'Deep Cyber',
      angle: 135,
      stops: [
        { color: '#0a0b10', position: 0 },
        { color: '#1a1028', position: 100 },
      ],
    },
    {
      name: 'Midnight Aurora',
      angle: 135,
      stops: [
        { color: '#060a14', position: 0 },
        { color: '#0e2236', position: 100 },
      ],
    },
    {
      name: 'Emerald Abyss',
      angle: 135,
      stops: [
        { color: '#050f0c', position: 0 },
        { color: '#0d2b22', position: 100 },
      ],
    },
    {
      name: 'Noir & Slate',
      angle: 135,
      stops: [
        { color: '#08080a', position: 0 },
        { color: '#141724', position: 100 },
      ],
    },
  ];

  const accentPresets = [
    { name: 'Electric Indigo', hex: '#6366f1' },
    { name: 'Cosmic Violet', hex: '#8b5cf6' },
    { name: 'Cyber Cyan', hex: '#06b6d4' },
    { name: 'Emerald Green', hex: '#10b981' },
    { name: 'Sunset Rose', hex: '#f43f5e' },
    { name: 'Solar Amber', hex: '#f59e0b' },
    { name: 'Cobalt Blue', hex: '#3b82f6' },
    { name: 'Minimal Slate', hex: '#64748b' },
  ];

  const buildThemePayload = (overrides: Partial<ThemeConfig> = {}): ThemeConfig => {
    const activeStops = overrides.gradientStops || gradientStops;
    const sorted = [...activeStops].sort((a, b) => a.position - b.position);
    return {
      mode,
      solidColor,
      gradientStart: sorted[0]?.color || '#08080a',
      gradientEnd: sorted[sorted.length - 1]?.color || '#13151f',
      gradientStops: activeStops,
      gradientAngle,
      accentColor,
      ambientIntensity,
      applyToEditor,
      ...overrides,
    };
  };

  const triggerChange = (updated: Partial<ThemeConfig>) => {
    const next = buildThemePayload(updated);
    applyThemeToCssVariables(next);
    onThemeChange(next);
  };

  const handleSolidColorPick = (hex: string) => {
    setSolidColor(hex);
    setSolidHexInput(hex);
    triggerChange({ mode: 'solid', solidColor: hex });
  };

  const handleSolidHexType = (val: string) => {
    setSolidHexInput(val);
    const cleaned = val.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      setSolidColor(cleaned);
      triggerChange({ mode: 'solid', solidColor: cleaned });
    }
  };

  const handleStopColorPick = (id: string, hex: string) => {
    const nextStops = gradientStops.map((s) => (s.id === id ? { ...s, color: hex } : s));
    setGradientStops(nextStops);
    setStopHexInputs((prev) => ({ ...prev, [id]: hex }));
    triggerChange({ mode: 'gradient', gradientStops: nextStops });
  };

  const handleStopHexType = (id: string, val: string) => {
    setStopHexInputs((prev) => ({ ...prev, [id]: val }));
    const cleaned = val.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      const nextStops = gradientStops.map((s) => (s.id === id ? { ...s, color: cleaned } : s));
      setGradientStops(nextStops);
      triggerChange({ mode: 'gradient', gradientStops: nextStops });
    }
  };

  const handleStopPositionChange = (id: string, position: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(position)));
    const nextStops = gradientStops.map((s) => (s.id === id ? { ...s, position: clamped } : s));
    setGradientStops(nextStops);
    triggerChange({ mode: 'gradient', gradientStops: nextStops });
  };

  const handleAddGradientStop = () => {
    if (gradientStops.length >= 6) return;
    const sorted = [...gradientStops].sort((a, b) => a.position - b.position);
    // Find largest gap between sorted stops to place the new stop naturally
    let insertPos = 50;
    let maxGap = -1;
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].position - sorted[i].position;
      if (gap > maxGap) {
        maxGap = gap;
        insertPos = Math.round(sorted[i].position + gap / 2);
      }
    }
    const newId = `stop-${Date.now()}-${gradientStops.length + 1}`;
    const newColor = NEW_STOP_PALETTE[gradientStops.length % NEW_STOP_PALETTE.length];
    const nextStops = [...gradientStops, { id: newId, color: newColor, position: insertPos }];
    setGradientStops(nextStops);
    setStopHexInputs((prev) => ({ ...prev, [newId]: newColor }));
    triggerChange({ mode: 'gradient', gradientStops: nextStops });
  };

  const handleRemoveGradientStop = (id: string) => {
    if (gradientStops.length <= 2) return;
    const nextStops = gradientStops.filter((s) => s.id !== id);
    setGradientStops(nextStops);
    setStopHexInputs((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    triggerChange({ mode: 'gradient', gradientStops: nextStops });
  };

  const handleAccentPick = (hex: string) => {
    setAccentColor(hex);
    setAccentHexInput(hex);
    triggerChange({ accentColor: hex });
  };

  const handleAccentHexType = (val: string) => {
    setAccentHexInput(val);
    const cleaned = val.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      setAccentColor(cleaned);
      triggerChange({ accentColor: cleaned });
    }
  };

  const handleApplyPresetGradient = (p: (typeof gradientPresets)[0]) => {
    const newStops: GradientStop[] = p.stops.map((s, idx) => ({
      id: `stop-preset-${idx + 1}-${Date.now()}`,
      color: s.color,
      position: s.position,
    }));
    setGradientStops(newStops);
    setStopHexInputs(Object.fromEntries(newStops.map((s) => [s.id, s.color])));
    setGradientAngle(p.angle);
    triggerChange({
      mode: 'gradient',
      gradientStops: newStops,
      gradientAngle: p.angle,
    });
  };

  const handleResetDefault = () => {
    const defaultStops = DEFAULT_GRADIENT_STOPS.map((s) => ({ ...s }));
    setMode(DEFAULT_THEME.mode);
    setSolidColor(DEFAULT_THEME.solidColor);
    setSolidHexInput(DEFAULT_THEME.solidColor);
    setGradientStops(defaultStops);
    setStopHexInputs(Object.fromEntries(defaultStops.map((s) => [s.id, s.color])));
    setGradientAngle(DEFAULT_THEME.gradientAngle);
    setAccentColor(DEFAULT_THEME.accentColor || '#6366f1');
    setAccentHexInput(DEFAULT_THEME.accentColor || '#6366f1');
    setAmbientIntensity(DEFAULT_THEME.ambientIntensity || 'medium');
    setApplyToEditor(false);
    saveTheme(DEFAULT_THEME);
    applyThemeToCssVariables(DEFAULT_THEME);
    onThemeChange(DEFAULT_THEME);
  };

  const handleSaveAndClose = () => {
    const finalConfig = buildThemePayload();
    saveTheme(finalConfig);
    applyThemeToCssVariables(finalConfig);
    onThemeChange(finalConfig);
    onClose();
  };

  const previewBackground =
    mode === 'gradient'
      ? buildGradientString(gradientStops, gradientAngle)
      : solidColor;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
        {...backdropProps}
      >
      <div
        className="relative w-full max-w-xl bg-[#0b0c10]/95 backdrop-blur-3xl border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        {...contentProps}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-white/[0.01]">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-colors"
              style={{
                backgroundColor: `${accentColor}18`,
                border: `1px solid ${accentColor}35`,
              }}
            >
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#f8fafc] tracking-tight">
                Customize Theme & Atmosphere
              </h2>
              <p className="text-xs text-slate-400">
                Liquid dark tones, ambient glow lighting, and primary accent tints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
          {/* 1. Mode Switcher (Pill style) */}
          <div className="flex p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <button
              onClick={() => {
                setMode('solid');
                triggerChange({ mode: 'solid' });
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'solid'
                  ? 'bg-white text-[#08080a] shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Solid Tone
            </button>
            <button
              onClick={() => {
                setMode('gradient');
                triggerChange({ mode: 'gradient' });
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'gradient'
                  ? 'bg-white text-[#08080a] shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Liquid Gradient
            </button>
          </div>

          {/* 2. Ambient Accent Color & Lighting Engine */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="font-semibold text-white text-xs">
                  Ambient Atmosphere Accent
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Bleeds softly behind glass</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {accentPresets.map((acc) => (
                <button
                  key={acc.hex}
                  onClick={() => handleAccentPick(acc.hex)}
                  className={`h-9 rounded-xl border flex items-center justify-center transition-all ${
                    accentColor.toLowerCase() === acc.hex.toLowerCase()
                      ? 'border-white scale-105 shadow-md'
                      : 'border-white/10 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: acc.hex }}
                  title={acc.name}
                >
                  {accentColor.toLowerCase() === acc.hex.toLowerCase() && (
                    <Check className="w-4 h-4 text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Accent Color Picker + Typer */}
            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] cursor-pointer">
                <div
                  className="w-4 h-4 rounded-lg border border-white/20"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="text-[11px] font-mono text-slate-300">Custom Glow</span>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => handleAccentPick(e.target.value)}
                  className="opacity-0 w-0 h-0"
                />
              </label>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={accentHexInput}
                  onChange={(e) => handleAccentHexType(e.target.value)}
                  placeholder="#6366f1"
                  className="w-full py-1.5 px-3 rounded-xl bg-black/40 border border-white/[0.08] text-white text-[11px] font-mono focus:outline-none focus:border-white/20 uppercase"
                />
              </div>

              {/* Ambient Intensity Selector */}
              <div className="flex items-center rounded-xl bg-black/40 border border-white/[0.08] p-0.5">
                {(['subtle', 'medium', 'deep'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setAmbientIntensity(lvl);
                      triggerChange({ ambientIntensity: lvl });
                    }}
                    className={`px-2 py-1 text-[10px] rounded-lg font-medium capitalize transition-colors ${
                      ambientIntensity === lvl
                        ? 'bg-white text-[#08080a]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2b. Editor Chrome Sync Toggle */}
          <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.08] flex items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <div className="font-semibold text-white text-xs">
                Apply theme to editor
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Styles editor bars, sidebars, and tool panels without tinting your canvas artwork.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={applyToEditor}
              aria-label="Apply theme to editor"
              data-testid="apply-theme-to-editor-toggle"
              onClick={() => {
                const next = !applyToEditor;
                setApplyToEditor(next);
                triggerChange({ applyToEditor: next });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                applyToEditor
                  ? 'border-white/40'
                  : 'bg-white/[0.08] border-white/[0.12]'
              }`}
              style={{
                backgroundColor: applyToEditor ? accentColor : undefined,
              }}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  applyToEditor ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 3. Solid Mode Section */}
          {mode === 'solid' && (
            <div className="space-y-4">
              <span className="text-xs font-semibold text-white">Curated Dark Baselines</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {solidPresets.map((p) => (
                  <button
                    key={p.hex}
                    onClick={() => handleSolidColorPick(p.hex)}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      solidColor.toLowerCase() === p.hex.toLowerCase()
                        ? 'border-white bg-white/[0.08] shadow-sm'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-lg border border-white/20 shrink-0"
                      style={{ backgroundColor: p.hex }}
                    />
                    <span className="text-[11px] font-medium text-slate-200 truncate">{p.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom Solid Color Picker & Hex Input */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <span className="text-[11px] font-medium text-slate-300">Custom Tone & Hex</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] cursor-pointer">
                    <div
                      className="w-5 h-5 rounded-lg border border-white/20"
                      style={{ backgroundColor: solidColor }}
                    />
                    <span className="text-xs font-mono text-slate-300">Picker</span>
                    <input
                      type="color"
                      value={solidColor}
                      onChange={(e) => handleSolidColorPick(e.target.value)}
                      className="opacity-0 w-0 h-0"
                    />
                  </label>
                  <input
                    type="text"
                    value={solidHexInput}
                    onChange={(e) => handleSolidHexType(e.target.value)}
                    placeholder="#08080a"
                    className="flex-1 py-2 px-3 rounded-xl bg-black/40 border border-white/[0.08] text-white text-xs font-mono uppercase focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Gradient Mode Section (Multi-Stop with Position Sliders) */}
          {mode === 'gradient' && (
            <div className="space-y-4">
              <span className="text-xs font-semibold text-white">Preset Liquid Gradients</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {gradientPresets.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleApplyPresetGradient(p)}
                    className="p-3 rounded-2xl border border-white/[0.08] hover:border-white/[0.2] text-left space-y-2 transition-all hover:scale-[1.02] bg-white/[0.03] cursor-pointer"
                  >
                    <div
                      className="h-10 w-full rounded-xl border border-white/10"
                      style={{
                        background: `linear-gradient(${p.angle}deg, ${p.stops
                          .map((s) => `${s.color} ${s.position}%`)
                          .join(', ')})`,
                      }}
                    />
                    <div className="text-[11px] font-medium text-slate-200 truncate">{p.name}</div>
                  </button>
                ))}
              </div>

              {/* Gradient Controls: Multi-Stop List + Position Sliders + Angle */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-white">
                      Gradient Color Stops ({gradientStops.length}/6)
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Add colors and drag each stop slider to shape the blend
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddGradientStop}
                    disabled={gradientStops.length >= 6}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-40 disabled:cursor-not-allowed border border-white/[0.14] text-white text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Color</span>
                  </button>
                </div>

                {/* Gradient Spectrum Bar */}
                <div
                  className="h-4 w-full rounded-full border border-white/15 shadow-inner"
                  style={{ background: buildGradientString(gradientStops, 90) }}
                />

                {/* Individual Stops */}
                <div className="space-y-2.5">
                  {gradientStops.map((stop, idx) => (
                    <div
                      key={stop.id}
                      className="p-3 rounded-xl bg-black/35 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      {/* Swatch + Hex Input */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 w-5">
                          #{idx + 1}
                        </span>
                        <label
                          className="p-1 rounded-lg bg-black/40 border border-white/15 cursor-pointer shrink-0"
                          title={`Pick color for stop ${idx + 1}`}
                        >
                          <div
                            className="w-5 h-5 rounded border border-white/20"
                            style={{ backgroundColor: stop.color }}
                          />
                          <input
                            type="color"
                            value={stop.color}
                            onChange={(e) => handleStopColorPick(stop.id, e.target.value)}
                            className="opacity-0 w-0 h-0"
                          />
                        </label>
                        <input
                          type="text"
                          value={stopHexInputs[stop.id] ?? stop.color}
                          onChange={(e) => handleStopHexType(stop.id, e.target.value)}
                          aria-label={`Color stop ${idx + 1} hex code`}
                          className="w-24 py-1 px-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono text-[11px] uppercase focus:outline-none focus:border-white/30"
                        />
                      </div>

                      {/* Percentage Position Slider */}
                      <div className="flex-1 flex items-center gap-2.5 min-w-0">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={stop.position}
                          onChange={(e) =>
                            handleStopPositionChange(stop.id, Number(e.target.value))
                          }
                          aria-label={`Color stop ${idx + 1} position percentage`}
                          className="flex-1 accent-white cursor-pointer"
                        />
                        <span className="w-10 text-right text-[11px] font-mono tabular-nums text-slate-200 shrink-0">
                          {stop.position}%
                        </span>
                      </div>

                      {/* Remove Stop */}
                      <button
                        type="button"
                        onClick={() => handleRemoveGradientStop(stop.id)}
                        disabled={gradientStops.length <= 2}
                        title={
                          gradientStops.length <= 2
                            ? 'At least 2 color stops required'
                            : 'Remove color stop'
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Angle Selector */}
                <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Angle</span>
                    <span className="tabular-nums">{gradientAngle}°</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[90, 135, 180, 225].map((ang) => (
                      <button
                        key={ang}
                        type="button"
                        onClick={() => {
                          setGradientAngle(ang);
                          triggerChange({ gradientAngle: ang });
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono border transition-colors cursor-pointer ${
                          gradientAngle === ang
                            ? 'bg-white text-[#08080a] border-white font-semibold'
                            : 'bg-black/30 border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        {ang}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Card with Ambient Glow */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-white">Live Atmosphere Preview</span>
            <div
              className="h-28 rounded-2xl border border-white/10 p-4 flex flex-col justify-between relative overflow-hidden shadow-xl"
              style={{ background: previewBackground }}
            >
              {/* Internal ambient glow */}
              <div
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-60 pointer-events-none"
                style={{ backgroundColor: accentColor }}
              />

              <div className="flex items-center justify-between z-10">
                <span className="font-semibold text-white text-xs tracking-tight">Scribe Studio</span>
                <span
                  className="text-[9px] font-mono px-2 py-0.5 rounded-full border text-white"
                  style={{
                    backgroundColor: `${accentColor}33`,
                    borderColor: `${accentColor}55`,
                  }}
                >
                  Active Accent
                </span>
              </div>
              <p className="text-[11px] text-slate-300 z-10 font-medium">
                Ultra-smooth liquid glass with atmospheric lighting bleeding through the dark canvas.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
          <button
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-5 py-2 text-xs font-semibold text-[#08080a] bg-white hover:bg-slate-200 rounded-xl transition-all shadow-md active:scale-95"
            >
              Apply Atmosphere
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

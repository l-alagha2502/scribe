import React from 'react';
import { ArrowLeft, X, Maximize2, WrapText } from 'lucide-react';

export interface TextLayoutSubViewProps {
  width: number;
  height: number;
  canvasWidth: number;
  splitByGrapheme: boolean;
  onChangeWidth: (nextWidth: number, commit?: boolean) => void;
  onCommit?: () => void;
  onToggleSplitByGrapheme: (splitByGrapheme: boolean) => void;
  onAutoFitWidth: () => void;
  onBack: () => void;
  onClose?: () => void;
}

export const TextLayoutSubView: React.FC<TextLayoutSubViewProps> = ({
  width,
  height,
  canvasWidth,
  splitByGrapheme,
  onChangeWidth,
  onCommit,
  onToggleSplitByGrapheme,
  onAutoFitWidth,
  onBack,
  onClose,
}) => {
  const presets = [
    { label: 'Compact', width: 200 },
    { label: 'Standard', width: 360 },
    { label: 'Wide', width: 640 },
    { label: 'Full Artboard', width: Math.max(240, Math.round(canvasWidth * 0.88)) },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent" data-testid="text-layout-subview">
      <header className="h-12 px-2.5 border-b border-white/[0.08] grid grid-cols-[36px_1fr_36px] items-center shrink-0 bg-white/[0.02] backdrop-blur-2xl">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Edit"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-xs font-semibold text-white tracking-tight text-center truncate px-1">
          Text Layout
        </h3>
        <button
          type="button"
          onClick={() => (onClose ? onClose() : onBack())}
          aria-label="Close Text Layout"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors justify-self-end"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
        {/* Auto-fit & Wrapping Mode */}
        <section className="space-y-2">
          <button
            type="button"
            data-testid="text-layout-autofit-btn"
            onClick={onAutoFitWidth}
            className="w-full py-2.5 px-3 rounded-xl bg-white text-[#08080a] hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Auto-Fit Box to Content</span>
          </button>

          <button
            type="button"
            data-testid="text-layout-wrap-toggle"
            aria-pressed={splitByGrapheme}
            onClick={() => onToggleSplitByGrapheme(!splitByGrapheme)}
            className="w-full p-3 rounded-xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.08] flex items-center justify-between gap-2 transition-colors text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <WrapText className="w-4 h-4 text-slate-300 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white">Wrapping Mode</div>
                <div className="text-[10px] text-slate-400">
                  {splitByGrapheme ? 'Character break wrap' : 'Standard word wrap'}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-white shrink-0">
              {splitByGrapheme ? 'Char' : 'Word'}
            </span>
          </button>
        </section>

        {/* Box Width & Height */}
        <section className="p-3.5 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Text Box Width</span>
            <span className="font-mono tabular-nums text-white font-semibold">{Math.round(width)}px</span>
          </div>
          <input
            type="range"
            min={60}
            max={Math.max(1200, canvasWidth)}
            step={4}
            value={Math.round(width)}
            aria-label="Text Box Width"
            data-testid="text-layout-width-slider"
            onChange={(e) => onChangeWidth(Number(e.target.value), false)}
            onPointerUp={() => onCommit?.()}
            onKeyUp={() => onCommit?.()}
            className="w-full accent-white cursor-pointer"
          />

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] font-mono text-[11px]">
            <label className="space-y-1">
              <span className="text-slate-400 text-[10px] font-sans">Width (px)</span>
              <input
                type="number"
                min={60}
                max={2400}
                value={Math.round(width)}
                data-testid="text-layout-width-input"
                onChange={(e) => onChangeWidth(Math.max(60, Number(e.target.value) || 60), true)}
                className="w-full py-1.5 px-2 rounded-lg bg-black/40 border border-white/[0.08] text-white tabular-nums"
              />
            </label>
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] font-sans">Auto Height (px)</span>
              <div className="w-full py-1.5 px-2 rounded-lg bg-black/25 border border-white/[0.05] text-slate-300 tabular-nums">
                {Math.round(height)}
              </div>
            </div>
          </div>
        </section>

        {/* Width Layout Presets */}
        <section className="space-y-2">
          <span className="text-[11px] font-medium text-slate-300">Layout Width Presets</span>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => {
              const isMatched = Math.abs(width - preset.width) <= 8;
              return (
                <button
                  key={preset.label}
                  type="button"
                  data-testid={`text-layout-preset-${preset.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  onClick={() => onChangeWidth(preset.width, true)}
                  className={`py-2 px-2.5 rounded-xl border text-left transition-colors ${
                    isMatched
                      ? 'bg-white text-[#08080a] border-white'
                      : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-semibold leading-tight">{preset.label}</div>
                  <div
                    className={`text-[10px] font-mono tabular-nums mt-0.5 ${
                      isMatched ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {preset.width}px
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

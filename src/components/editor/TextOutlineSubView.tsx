import React from 'react';
import { ArrowLeft, X, RotateCcw } from 'lucide-react';
import { TextOutlineConfig, TextOutlineType } from '../../utils/textEditHelpers';

const OUTLINE_COLOR_SWATCHES = [
  '#000000',
  '#ffffff',
  '#6366f1',
  '#06b6d4',
  '#10b981',
  '#f43f5e',
  '#f59e0b',
];

const OUTLINE_TYPES: { id: TextOutlineType; label: string; description: string }[] = [
  { id: 'solid', label: 'Solid', description: 'Crisp continuous contour' },
  { id: 'dashed', label: 'Dashed', description: 'Segmented editorial dash' },
  { id: 'dotted', label: 'Dotted', description: 'Rounded dot stroke' },
  { id: 'double', label: 'Double / Glow', description: 'Stroke with halo aura' },
];

export interface TextOutlineSubViewProps {
  config: TextOutlineConfig;
  onChange: (next: TextOutlineConfig, commit?: boolean) => void;
  onCommit?: () => void;
  onReset: () => void;
  onBack: () => void;
  onClose?: () => void;
}

export const TextOutlineSubView: React.FC<TextOutlineSubViewProps> = ({
  config,
  onChange,
  onCommit,
  onReset,
  onBack,
  onClose,
}) => {
  const effectiveWidth = config.enabled ? Math.max(1, config.width || 2) : config.width;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent" data-testid="text-outline-subview">
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
          Outline
        </h3>
        <button
          type="button"
          onClick={() => (onClose ? onClose() : onBack())}
          aria-label="Close Outline"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors justify-self-end"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
        {/* Enable / Clear Bar */}
        <div className="p-3 rounded-2xl bg-white/[0.035] border border-white/[0.08] flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-white">Text Outline</div>
            <div className="text-[10px] text-slate-400">
              {config.enabled ? `${effectiveWidth}px · ${config.type}` : 'Disabled'}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {config.enabled && (
              <button
                type="button"
                data-testid="text-outline-reset-btn"
                onClick={onReset}
                className="py-1 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-[10px] font-medium text-slate-200 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              data-testid="text-outline-toggle-btn"
              onClick={() =>
                onChange(
                  {
                    ...config,
                    enabled: !config.enabled,
                    width: !config.enabled ? Math.max(2, config.width || 2) : 0,
                  },
                  true
                )
              }
              className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-colors ${
                config.enabled
                  ? 'bg-white text-[#08080a]'
                  : 'bg-white/[0.08] text-slate-200 hover:bg-white/[0.14]'
              }`}
            >
              {config.enabled ? 'On' : 'Enable'}
            </button>
          </div>
        </div>

        {/* Outline Type Selector */}
        <section className="space-y-2" aria-label="Outline Types">
          <span className="text-[11px] font-medium text-slate-300">Outline Type</span>
          <div className="grid grid-cols-2 gap-2">
            {OUTLINE_TYPES.map((item) => {
              const isActive = config.type === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`outline-type-${item.id}`}
                  aria-pressed={isActive}
                  onClick={() =>
                    onChange(
                      {
                        ...config,
                        enabled: true,
                        width: Math.max(2, config.width || 2),
                        type: item.id,
                      },
                      true
                    )
                  }
                  className={`p-2.5 rounded-xl border text-left space-y-1.5 transition-all ${
                    isActive
                      ? 'bg-white text-[#08080a] border-white shadow-sm'
                      : 'bg-white/[0.035] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
                  }`}
                >
                  {/* Visual Stroke Preview */}
                  <div className="h-3 flex items-center">
                    {item.id === 'solid' && (
                      <div className={`w-full h-[2.5px] rounded-full ${isActive ? 'bg-[#08080a]' : 'bg-white'}`} />
                    )}
                    {item.id === 'dashed' && (
                      <div
                        className={`w-full border-t-[2.5px] border-dashed ${
                          isActive ? 'border-[#08080a]' : 'border-white'
                        }`}
                      />
                    )}
                    {item.id === 'dotted' && (
                      <div
                        className={`w-full border-t-[3px] border-dotted ${
                          isActive ? 'border-[#08080a]' : 'border-white'
                        }`}
                      />
                    )}
                    {item.id === 'double' && (
                      <div
                        className={`w-full h-[3px] rounded-full ${
                          isActive
                            ? 'bg-[#08080a] ring-2 ring-[#08080a]/25'
                            : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                        }`}
                      />
                    )}
                  </div>
                  <div className="text-[11px] font-semibold leading-tight">{item.label}</div>
                  <div
                    className={`text-[9px] leading-tight truncate ${
                      isActive ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {item.description}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Outline Thickness */}
        <section className="p-3.5 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Width / Thickness</span>
            <span
              data-testid="outline-width-value"
              className="font-mono tabular-nums text-white font-semibold"
            >
              {config.enabled ? config.width : 0}px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={24}
            step={0.5}
            value={config.enabled ? config.width : 0}
            aria-label="Outline width"
            data-testid="outline-width-slider"
            onDoubleClick={onReset}
            onChange={(e) => {
              const nextW = Number(e.target.value);
              onChange(
                {
                  ...config,
                  enabled: nextW > 0,
                  width: nextW,
                },
                false
              );
            }}
            onPointerUp={() => onCommit?.()}
            onKeyUp={() => onCommit?.()}
            className="w-full accent-white cursor-pointer"
          />
        </section>

        {/* Outline Color */}
        <section className="p-3.5 rounded-2xl bg-white/[0.035] border border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Outline Color</span>
            <span className="font-mono text-[10px] text-slate-400 uppercase">{config.color}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {OUTLINE_COLOR_SWATCHES.map((col) => (
              <button
                key={col}
                type="button"
                data-testid={`outline-color-${col.replace('#', '')}`}
                onClick={() =>
                  onChange(
                    {
                      ...config,
                      enabled: true,
                      width: Math.max(2, config.width || 2),
                      color: col,
                    },
                    true
                  )
                }
                className={`w-6 h-6 rounded-lg border transition-transform ${
                  config.color.toLowerCase() === col
                    ? 'scale-110 border-white ring-2 ring-white/25'
                    : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: col }}
                title={col}
              />
            ))}
            <label
              className="w-7 h-6 rounded-lg border border-white/25 cursor-pointer overflow-hidden flex items-center justify-center bg-white/[0.05]"
              title="Custom outline color"
            >
              <input
                type="color"
                data-testid="outline-custom-color"
                value={config.color}
                onChange={(e) =>
                  onChange(
                    {
                      ...config,
                      enabled: true,
                      width: Math.max(2, config.width || 2),
                      color: e.target.value,
                    },
                    true
                  )
                }
                className="sr-only"
              />
              <span
                className="w-4 h-4 rounded border border-white/20"
                style={{ backgroundColor: config.color }}
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

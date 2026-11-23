import React from 'react';
import {
  Home,
  PlusSquare,
  FolderOpen,
  Palette,
  Sparkles,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react';
import { NavigationTab } from '../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  activeProjectName?: string | null;
  onOpenQuickUpload: () => void;
  onOpenCloudSync?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeProjectName,
  onOpenQuickUpload,
  onOpenCloudSync,
}) => {
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'new-project' as const, label: 'New Project', icon: PlusSquare },
    { id: 'my-files' as const, label: 'My Files', icon: FolderOpen },
    { id: 'brandings' as const, label: 'Brandings', icon: Palette },
  ];

  return (
    <aside className="w-60 glass-panel rounded-3xl border border-white/[0.08] flex flex-col shrink-0 h-full select-none z-20 transition-all duration-300 shadow-xl shadow-black/25 overflow-hidden">
      {/* Primary Navigation */}
      <nav className="p-3.5 space-y-1.5 flex-1 pt-5" aria-label="Main Navigation">
        <div className="px-3 pt-1 pb-2 text-[10px] font-mono tracking-widest text-slate-400 uppercase">
          Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/[0.09] text-white border border-white/[0.14] shadow-sm font-semibold translate-x-0.5'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {isActive && (
                <div
                  className="w-1.5 h-1.5 rounded-full shadow-sm"
                  style={{ backgroundColor: 'var(--theme-accent, #6366f1)' }}
                />
              )}
            </button>
          );
        })}

        {/* Active Canvas Shortcut if editing */}
        {activeProjectName && (
          <div className="pt-4 mt-3 border-t border-white/[0.05]">
            <div className="px-3 pb-1.5 text-[10px] font-mono tracking-widest text-slate-400 uppercase">
              Current Project
            </div>
            <button
              onClick={() => onSelectTab('editor')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                currentTab === 'editor'
                  ? 'bg-white/[0.12] border-white/[0.22] text-white'
                  : 'bg-white/[0.06] border-white/[0.12] text-slate-200 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.2]'
              }`}
            >
              <span className="truncate">{activeProjectName}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            </button>
          </div>
        )}
      </nav>

      {/* Bottom Tools: Quick Image Tools & Converter moved down to reach the bottom */}
      <div className="mt-auto p-3.5 border-t border-white/[0.08] flex flex-col gap-2.5">
        <button
          onClick={onOpenQuickUpload}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 hover:text-white text-xs font-medium border border-white/[0.12] hover:border-white/[0.22] transition-all duration-200 hover:-translate-y-0.5 shadow-sm cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-300" />
          <span>Quick Image Tools</span>
        </button>

        <a
          href="https://scribe.vastx.app/convert"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 hover:text-white text-xs font-medium border border-white/[0.12] hover:border-white/[0.22] transition-all duration-200 hover:-translate-y-0.5 shadow-sm cursor-pointer"
          title="Redirect to Scribe Format Converter"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-slate-300" />
          <span>Converter</span>
        </a>
      </div>
    </aside>
  );
};

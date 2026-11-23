import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Link,
  Unlink,
  RefreshCw,
  Palette,
  Cloud,
  ChevronDown,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { DriveUser, SyncState } from '../utils/googleDriveSync';
import { NavigationTab } from '../types';

interface TopBarProps {
  currentTab: NavigationTab;
  onNavigateHome: () => void;
  syncState: SyncState;
  currentUser: DriveUser | null;
  onLinkAccount: () => void;
  onUnlinkAccount: () => void;
  onSwitchAccount: () => void;
  onOpenThemeCustomizer: () => void;
  onOpenCloudSync: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onNavigateHome,
  syncState,
  currentUser,
  onLinkAccount,
  onUnlinkAccount,
  onSwitchAccount,
  onOpenThemeCustomizer,
  onOpenCloudSync,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const isLinked = syncState === 'connected' && currentUser;

  return (
    <header className="h-14 glass-panel rounded-2xl px-5 flex items-center justify-between z-30 shrink-0 w-full select-none border border-white/[0.08] shadow-xl shadow-black/30 backdrop-blur-3xl">
      {/* Far-Left: Clean Scribe Logo (no box, no text) */}
      <button
        onClick={onNavigateHome}
        className="flex items-center cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
        title="Scribe Design Studio Home"
      >
        <img
          src="/assets/aistudio/scribe-logo-white_7951e577.png"
          alt="Scribe Emblem"
          className="h-8 w-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </button>

      {/* Far-Right: 1-Click Connect Google Account & User Profile Dropdown */}
      <div className="flex items-center gap-2.5">
        {!isLinked && (
          <button
            onClick={onLinkAccount}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-200 text-xs font-medium text-slate-200 hover:text-white shadow-sm hover:scale-[1.02] cursor-pointer"
            title="1-Click Connect Google Account for Drive Backup"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span className="hidden sm:inline">Connect Google Account</span>
            <span className="sm:hidden">Connect</span>
          </button>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-2.5 py-1.5 pl-2 pr-2.5 rounded-full border transition-all cursor-pointer focus:outline-none ${
              isDropdownOpen
                ? 'bg-white/[0.08] border-white/[0.18]'
                : isLinked
                ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1]'
                : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06]'
            }`}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            title={isLinked ? `Signed in as ${currentUser?.name || 'Google User'}` : 'Guest User Profile'}
          >
            {/* Profile Picture */}
            {isLinked && currentUser?.picture ? (
              <div className="relative w-7 h-7 rounded-full overflow-hidden border border-white/20 shadow-sm shrink-0">
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-black" />
              </div>
            ) : isLinked && currentUser?.name ? (
              <div className="relative w-7 h-7 rounded-full bg-white/[0.1] border border-white/20 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-black" />
              </div>
            ) : (
              /* Default Guest PFP */
              <div className="relative w-7 h-7 rounded-full bg-gradient-to-tr from-white/[0.06] to-white/[0.12] border border-white/[0.1] flex items-center justify-center text-slate-300 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
            )}

            {/* User Display Name */}
            <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
              {isLinked ? currentUser?.name || 'Google User' : 'Guest'}
            </span>

            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </button>

        {/* Profile Dropdown List */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0b0c10]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl p-1.5 z-50 animate-fadeIn space-y-1">
            {/* Top of list: Name & Profile Info */}
            <div className="px-3 py-2.5 border-b border-white/[0.05] flex items-center gap-3">
              {isLinked && currentUser?.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full border border-white/20 object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : isLinked && currentUser?.name ? (
                <div className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/20 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {isLinked ? currentUser.name : 'Guest'}
                </span>
                <span className="text-[11px] font-mono text-slate-400 truncate">
                  {isLinked ? currentUser.email : 'Local Guest Mode'}
                </span>
              </div>
            </div>

            {/* Menu Options */}
            <div className="py-1 space-y-0.5">
              {/* Option 1: Link Account (if not linked) */}
              {!isLinked ? (
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onLinkAccount();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors text-left group"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span className="font-medium">Connect Google Account</span>
                </button>
              ) : (
                /* Option 2: Unlink (if linked) */
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onUnlinkAccount();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left group"
                >
                  <Unlink className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400" />
                  <span className="font-medium">Unlink Google Account</span>
                </button>
              )}

              {/* Option 3: Switch Account */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onSwitchAccount();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors text-left group"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                <span className="font-medium">Switch Account</span>
              </button>

              {/* Option 4: Customize Theme */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onOpenThemeCustomizer();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors text-left group"
              >
                <Palette className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                <span className="font-medium">Customize Theme</span>
              </button>

              {/* Option 5: Storage & Cloud Sync */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onOpenCloudSync();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors text-left group"
              >
                <Cloud className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                <span className="font-medium">Storage & Cloud Sync</span>
              </button>
            </div>

            {/* Footer Badge */}
            <div className="pt-1.5 pb-1 px-3 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>{isLinked ? 'Drive Cloud Active' : 'Offline First'}</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Cloud,
  CloudOff,
  Check,
  RefreshCw,
  Download,
  Upload,
  HardDrive,
  FileCode,
  ShieldCheck,
  ExternalLink,
  Trash2,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { ProjectRecord, AssetRecord, CustomFontRecord } from '../types';
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  getCurrentSyncState,
  subscribeToDriveSync,
  getStoredGoogleClientId,
  setStoredGoogleClientId,
  getAutoSyncEnabled,
  setAutoSyncEnabled,
  isDriveSimulationMode,
  setDriveSimulationMode,
  uploadProjectToDrive,
  listDriveBackups,
  downloadProjectFromDrive,
  deleteDriveBackup,
  DriveUser,
  DriveBackupItem,
  SyncState,
} from '../utils/googleDriveSync';
import { saveProject, saveAsset, saveCustomFont } from '../utils/db';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { ModalPortal } from './ModalPortal';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: ProjectRecord | null;
  allAssets: AssetRecord[];
  allFonts: CustomFontRecord[];
  onProjectImported?: (project: ProjectRecord) => void;
  onBackupsUpdated?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  allAssets,
  allFonts,
  onProjectImported,
  onBackupsUpdated,
}) => {
  const [syncState, setSyncState] = useState<SyncState>('guest');
  const [currentUser, setCurrentUser] = useState<DriveUser | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [useSimulation, setUseSimulation] = useState(false);

  // Cloud backups list
  const [backups, setBackups] = useState<DriveBackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { backdropProps, contentProps } = useModalBehavior(isOpen, onClose, isSyncingNow);

  useEffect(() => {
    if (!isOpen) return;

    const current = getCurrentSyncState();
    setSyncState(current.state);
    setCurrentUser(current.user);
    setAutoSync(getAutoSyncEnabled());
    setClientIdInput(getStoredGoogleClientId());
    setUseSimulation(isDriveSimulationMode());

    if (current.state === 'connected') {
      loadBackupsList();
    }

    const unsubscribe = subscribeToDriveSync((state, user) => {
      setSyncState(state);
      setCurrentUser(user);
      if (state === 'connected' || state === 'synced') {
        loadBackupsList();
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setSyncMessage({ text, type });
    setTimeout(() => setSyncMessage(null), 4000);
  };

  const loadBackupsList = async () => {
    setIsLoadingBackups(true);
    try {
      const list = await listDriveBackups();
      setBackups(list);
      onBackupsUpdated?.();
    } catch (err: any) {
      setBackups([]);
      console.warn('Could not fetch backups:', err);
      showNotification(err.message || 'Could not fetch backups from Google Drive.', 'error');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleConnect = async () => {
    setSyncMessage(null);
    try {
      const res = await connectGoogleDrive(clientIdInput);
      if (res.success && res.user) {
        showNotification(`Connected to Google Drive as ${res.user.email}`, 'success');
        await loadBackupsList();
      } else if (res.error === 'NO_CLIENT_ID') {
        setShowConfig(true);
        showNotification('Configure a Google Client ID or enable instant Sandbox Simulation.', 'info');
      } else {
        showNotification(res.error || 'Connection was not completed', 'error');
      }
    } catch (err: any) {
      showNotification(err.message || 'Connection error', 'error');
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleDrive();
    setBackups([]);
    showNotification('Disconnected from Google Drive. Switched to offline Guest Mode.', 'info');
  };

  const handleSaveClientId = () => {
    setStoredGoogleClientId(clientIdInput);
    showNotification('Google Client ID updated', 'success');
  };

  const handleToggleAutoSync = () => {
    const next = !autoSync;
    setAutoSync(next);
    setAutoSyncEnabled(next);
    showNotification(next ? 'Auto-sync enabled for cloud backups' : 'Auto-sync disabled', 'info');
  };

  const handleToggleSimulation = (val: boolean) => {
    setUseSimulation(val);
    setDriveSimulationMode(val);
    showNotification(
      val
        ? 'Sandbox Simulation enabled: Zero-config cloud testing mode'
        : 'Sandbox Simulation disabled: Real GIS Token Client mode active',
      'info'
    );
  };

  const handleBackupActiveProject = async () => {
    if (!activeProject) {
      showNotification('No active project open to backup.', 'info');
      return;
    }

    setIsSyncingNow(true);
    try {
      await uploadProjectToDrive(activeProject, allAssets, allFonts);
      showNotification(`"${activeProject.name}" synced to Google Drive!`, 'success');
      await loadBackupsList();
    } catch (err: any) {
      showNotification(err.message || 'Backup failed', 'error');
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleRestoreBackup = async (item: DriveBackupItem) => {
    try {
      const pkg = await downloadProjectFromDrive(item.id);
      // Restore embedded assets
      for (const asset of pkg.embeddedAssets || []) {
        await saveAsset(asset);
      }
      // Restore embedded custom fonts
      for (const font of pkg.customFonts || []) {
        await saveCustomFont(font);
      }
      // Save project into IndexedDB with fresh or preserved ID
      await saveProject(pkg.project);
      showNotification(`Restored "${pkg.project.name}" into local IndexedDB!`, 'success');
      onProjectImported?.(pkg.project);
    } catch (err: any) {
      showNotification(`Failed to restore project: ${err.message}`, 'error');
    }
  };

  const handleDeleteRemote = async (item: DriveBackupItem) => {
    if (!window.confirm(`Delete backup "${item.name}" from Google Drive? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteDriveBackup(item.id);
      showNotification(`Backup "${item.name}" deleted from Drive.`, 'info');
      await loadBackupsList();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete backup', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
        {...backdropProps}
      >
      <div
        className="relative w-full max-w-2xl bg-[#0b0c10]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        {...contentProps}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <Cloud className="w-4 h-4 text-[#f8fafc]" />
            </div>
            <div>
              <h2 className="text-base font-medium text-[#f8fafc]">Storage & Cloud Sync</h2>
              <p className="text-xs text-slate-400">
                Hybrid local-first persistence with optional Google Drive backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sync notification banner */}
        {syncMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-mono border-b flex items-center justify-between ${
              syncMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : syncMessage.type === 'error'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-white/[0.03] text-slate-300 border-white/[0.06]'
            }`}
          >
            <span>{syncMessage.text}</span>
            <button onClick={() => setSyncMessage(null)} className="text-slate-400 hover:text-white ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* SECTION 1: Local-First IndexedDB Engine Status */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <HardDrive className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-[#f8fafc]">Local-First Engine</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500">IndexedDB Browser Storage</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every canvas stroke, text layer, and asset is permanently saved locally in your browser with zero latency.
              Scribe requires no servers to run and operates completely offline by default.
            </p>
          </div>

          {/* SECTION 2: Google Drive GIS Cloud Backup */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Cloud className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-[#f8fafc]">Google Drive Cloud Backup</span>
              </div>
              {syncState === 'connected' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Connected</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-slate-400 border border-white/[0.06]">
                  Guest Mode (Offline)
                </span>
              )}
            </div>

            {/* If Connected */}
            {syncState === 'connected' && currentUser ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center space-x-3">
                    {currentUser.picture ? (
                      <img
                        src={currentUser.picture}
                        alt="Profile"
                        className="w-8 h-8 rounded-full border border-white/[0.1]"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center font-mono text-xs">
                        {currentUser.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-medium text-[#f8fafc]">{currentUser.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{currentUser.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] border border-white/[0.06] transition-colors"
                  >
                    Disconnect
                  </button>
                </div>

                {/* Cloud Actions Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {activeProject && (
                    <button
                      onClick={handleBackupActiveProject}
                      disabled={isSyncingNow}
                      className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 text-xs font-medium flex items-center space-x-1.5 transition-all disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isSyncingNow ? 'Syncing to Drive...' : 'Backup Current Canvas'}</span>
                    </button>
                  )}
                  <button
                    onClick={loadBackupsList}
                    disabled={isLoadingBackups}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 flex items-center space-x-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                    <span>Refresh Cloud List</span>
                  </button>
                  <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={handleToggleAutoSync}
                      className="rounded border-white/20 bg-white/5 text-white focus:ring-0"
                    />
                    <span>Auto-sync on save</span>
                  </label>
                </div>

                {/* Remote backups list */}
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    Cloud Backups in "Scribe Design Studio" Folder ({backups.length})
                  </div>
                  {isLoadingBackups ? (
                    <div className="py-6 text-center text-xs font-mono text-slate-500 flex items-center justify-center space-x-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking Google Drive...</span>
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-white/[0.06] rounded-xl">
                      No backups in Google Drive yet. Click "Backup Current Canvas" above to create one.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {backups.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-colors"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="text-xs font-medium text-[#f8fafc] truncate">{item.name}</div>
                            <div className="text-[10px] font-mono text-slate-500 flex items-center space-x-2">
                              <span>{(item.size / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>{new Date(item.modifiedTime).toLocaleDateString()}</span>
                              {item.layersCount !== undefined && (
                                <>
                                  <span>•</span>
                                  <span>{item.layersCount} layers</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => handleRestoreBackup(item)}
                              title="Restore into Local Workspace"
                              className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => handleDeleteRemote(item)}
                              title="Delete from Google Drive"
                              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If Not Connected (Guest Mode) */
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Optional zero-cost cloud sync: link your personal Google account with one click to mirror your designs
                  into a private <code className="font-mono text-slate-300">Scribe Design Studio</code> folder on Google Drive.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleConnect}
                    disabled={syncState === 'connecting'}
                    className="px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-medium flex items-center space-x-2 transition-all shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                    <span>{syncState === 'connecting' ? 'Authorizing GIS...' : 'Connect Google Drive'}</span>
                  </button>

                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 transition-colors flex items-center space-x-1.5"
                  >
                    <span>OAuth & Sandbox Config</span>
                  </button>
                </div>

                {/* Configuration Accordion */}
                {showConfig && (
                  <div className="p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.06] space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300">Custom Google Cloud Client ID</span>
                      <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useSimulation}
                          onChange={(e) => handleToggleSimulation(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-white focus:ring-0"
                        />
                        <span>Instant Sandbox Simulator</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={clientIdInput}
                        onChange={(e) => setClientIdInput(e.target.value)}
                        placeholder="your-client-id.apps.googleusercontent.com"
                        className="flex-1 px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-white/30"
                      />
                      <button
                        onClick={handleSaveClientId}
                        className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] rounded-lg text-xs text-slate-200 font-medium transition-colors"
                      >
                        Save
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-normal">
                      <strong>Zero-Backend Setup:</strong> GIS runs 100% in the client. To connect your personal GCP project, create a Web Application Client ID in Google Cloud Console and add this app's origin to Authorized JavaScript Origins.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: File Portability (.scribe Package) */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileCode className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-[#f8fafc]">File Portability (.scribe Package)</span>
              </div>
              <span className="text-xs font-mono text-slate-500">Universal Format</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every design is packaged with its canvas vector hierarchy, embedded assets, and typography into a standalone{' '}
              <code className="font-mono text-slate-300">.scribe</code> bundle. Export and import actions are available directly from the canvas Export modal and File menu for seamless cross-device mobility.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] bg-white/[0.01]">
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Backend · Client-Only Encryption & Storage</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

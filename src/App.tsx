import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './components/HomePage';
import { NewProjectPage } from './components/NewProjectPage';
import { MyFilesPage, MyFilesTab } from './components/MyFilesPage';
import { BrandingsPage } from './components/BrandingsPage';
import { EditorWorkspace } from './components/EditorWorkspace';
import { QuickImageModal } from './components/QuickImageModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { TopBar } from './components/TopBar';
import {
  ThemeCustomizerModal,
  getSavedTheme,
  saveTheme,
  getThemeBackgroundString,
  applyThemeToCssVariables,
  ThemeConfig,
} from './components/ThemeCustomizerModal';
import {
  subscribeToDriveSync,
  getCurrentSyncState,
  connectGoogleDrive,
  disconnectGoogleDrive,
  switchGoogleAccount,
  DriveUser,
  SyncState,
} from './utils/googleDriveSync';
import {
  NavigationTab,
  ProjectRecord,
  AssetRecord,
  BrandRecord,
  CustomFontRecord,
  DimensionUnit,
} from './types';
import {
  getAllProjects,
  getAllAssets,
  getAllBrands,
  getAllCustomFonts,
  seedInitialDataIfEmpty,
  loadSavedCustomFonts,
  saveProject,
  deleteProject,
  toggleFavoriteProject,
} from './utils/db';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [myFilesTab, setMyFilesTab] = useState<MyFilesTab>('projects');
  const [isQuickUploadOpen, setIsQuickUploadOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // App Theme (Solid / Gradient)
  const [appTheme, setAppTheme] = useState<ThemeConfig>(getSavedTheme);

  // Google Drive & User Auth State
  const [syncState, setSyncState] = useState<SyncState>('guest');
  const [driveUser, setDriveUser] = useState<DriveUser | null>(null);

  // Core records stored in IndexedDB
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [customFonts, setCustomFonts] = useState<CustomFontRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active project in editor
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);

  // Initialize and load IndexedDB data
  const loadAllData = useCallback(async () => {
    try {
      await seedInitialDataIfEmpty();
      await loadSavedCustomFonts();

      const [projs, asts, brnds, fnts] = await Promise.all([
        getAllProjects(),
        getAllAssets(),
        getAllBrands(),
        getAllCustomFonts(),
      ]);

      setProjects(projs);
      setAssets(asts);
      setBrands(brnds);
      setCustomFonts(fnts);

      // If no active project but there are projects, default activeProject to the first one
      if (projs.length > 0 && !activeProject) {
        setActiveProject(projs[0]);
      }
    } catch (err) {
      console.warn('Failed to load local database:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    loadAllData();

    // Initialize and track cloud sync & user profile state
    const current = getCurrentSyncState();
    setSyncState(current.state);
    setDriveUser(current.user);

    const unsubscribe = subscribeToDriveSync((state, user) => {
      setSyncState(state);
      setDriveUser(user);
    });

    return () => unsubscribe();
  }, [loadAllData]);

  const refreshProjects = async () => {
    const projs = await getAllProjects();
    setProjects(projs);
  };

  const refreshAssets = async () => {
    const asts = await getAllAssets();
    setAssets(asts);
  };

  const refreshBrands = async () => {
    const brnds = await getAllBrands();
    setBrands(brnds);
  };

  const refreshFonts = async () => {
    const fnts = await getAllCustomFonts();
    setCustomFonts(fnts);
  };

  // Navigation handlers
  const handleSelectTab = (tab: NavigationTab) => {
    setCurrentTab(tab);
  };

  const handleOpenProject = (project: ProjectRecord) => {
    setActiveProject(project);
    setCurrentTab('editor');
  };

  const handleCreateNewProject = async (
    width: number,
    height: number,
    name: string = 'Untitled Canvas',
    type: 'graphic' | 'video' | 'print' = 'graphic',
    unit: DimensionUnit = 'px',
    dpi: number = 72
  ) => {
    const now = Date.now();
    const newProject: ProjectRecord = {
      id: `proj_${now}`,
      name,
      width,
      height,
      unit,
      dpi,
      fabricJson: JSON.stringify({
        version: '6.0.0',
        background: type === 'print' ? '#ffffff' : '#0f1118',
        objects: [],
      }),
      thumbnail: '',
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      type,
    };

    await saveProject(newProject);
    await refreshProjects();
    setActiveProject(newProject);
    setCurrentTab('editor');
  };

  const handleToggleFavoriteProject = async (id: string) => {
    await toggleFavoriteProject(id);
    await refreshProjects();
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    await refreshProjects();
    if (activeProject?.id === id) {
      setActiveProject(null);
    }
  };

  const handleDuplicateProject = async (project: ProjectRecord) => {
    const now = Date.now();
    const duplicate: ProjectRecord = {
      ...project,
      id: `proj_${now}`,
      name: `${project.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };
    await saveProject(duplicate);
    await refreshProjects();
  };

  const handleNavigateToMyFilesProjects = () => {
    setMyFilesTab('projects');
    setCurrentTab('my-files');
  };

  const handleCreateDesignWithBrand = async (brand: BrandRecord) => {
    const now = Date.now();
    const newProject: ProjectRecord = {
      id: `proj_${now}`,
      name: `${brand.name} Design`,
      width: 1080,
      height: 1080,
      unit: 'px',
      dpi: 72,
      fabricJson: JSON.stringify({
        version: '6.0.0',
        objects: [
          {
            type: 'rect',
            left: 0,
            top: 0,
            width: 1080,
            height: 1080,
            fill: brand.secondaryColors[0] || '#0b0c10',
            selectable: false,
          },
          {
            type: 'textbox',
            left: 100,
            top: 200,
            width: 880,
            text: brand.name.toUpperCase(),
            fontSize: 64,
            fontFamily: brand.fonts[0] || 'Outfit',
            fontWeight: 'bold',
            fill: brand.primaryColor,
          },
        ],
      }),
      thumbnail: '',
      createdAt: now,
      updatedAt: now,
      isFavorite: true,
      type: 'graphic',
    };

    await saveProject(newProject);
    await refreshProjects();
    setActiveProject(newProject);
    setCurrentTab('editor');
  };

  const themeBg = getThemeBackgroundString(appTheme);

  useEffect(() => {
    applyThemeToCssVariables(appTheme);
  }, [appTheme]);

  const handleConnectGoogle = async () => {
    try {
      const res = await connectGoogleDrive();
      if (!res.success && res.error === 'NO_CLIENT_ID') {
        setIsCloudSyncOpen(true);
      }
    } catch (e) {
      console.warn('Google connect error:', e);
      setIsCloudSyncOpen(true);
    }
  };

  return (
    <div
      className="flex flex-col h-screen w-screen text-[#f8fafc] overflow-hidden font-sans transition-colors duration-300 relative select-none"
      style={{ background: themeBg }}
    >
      {/* Dynamic Ambient Background Illumination Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />
        <div className="ambient-orb-3" />
      </div>

      {/* Floating Topbar with Logo, "Scribe.", and User Profile */}
      {currentTab !== 'editor' && (
        <div className="pt-3 px-3.5 shrink-0 z-30">
          <TopBar
            currentTab={currentTab}
            onNavigateHome={() => setCurrentTab('home')}
            syncState={syncState}
            currentUser={driveUser}
            onLinkAccount={handleConnectGoogle}
            onUnlinkAccount={() => disconnectGoogleDrive()}
            onSwitchAccount={async () => {
              await switchGoogleAccount();
            }}
            onOpenThemeCustomizer={() => setIsThemeModalOpen(true)}
            onOpenCloudSync={() => setIsCloudSyncOpen(true)}
          />
        </div>
      )}

      {/* Main Workspace Body */}
      {currentTab === 'editor' && activeProject ? (
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          <EditorWorkspace
            project={activeProject}
            brands={brands}
            assets={assets}
            customFonts={customFonts}
            onBackToDashboard={() => setCurrentTab('home')}
            onProjectUpdated={(updated) => {
              setActiveProject(updated);
              refreshProjects();
            }}
            onRefreshAssets={refreshAssets}
            onRefreshFonts={refreshFonts}
          />
        </div>
      ) : (
        <div className="flex flex-1 p-3.5 gap-3.5 overflow-hidden z-10 relative min-h-0">
          {/* Global Navigation Sidebar */}
          <Sidebar
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
            activeProjectName={activeProject?.name}
            onOpenQuickUpload={() => setIsQuickUploadOpen(true)}
            onOpenCloudSync={() => setIsCloudSyncOpen(true)}
          />

          {/* Main Floating Glass View Area */}
          <main className="flex-1 flex flex-col overflow-y-auto relative glass-panel rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center p-2.5 animate-pulse shadow-lg">
                  <img
                    src="/assets/aistudio/scribe-logo-white_7951e577.png"
                    alt="Scribe Logo"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-xs font-mono text-slate-400">Loading Scribe Studio...</div>
              </div>
            ) : (
            <>
              {/* PAGE 1: HOME */}
              {currentTab === 'home' && (
                <HomePage
                  projects={projects}
                  allAssets={assets}
                  allFonts={customFonts}
                  onSelectTab={handleSelectTab}
                  onOpenProject={handleOpenProject}
                  onCreateNewProject={handleCreateNewProject}
                  onToggleFavorite={handleToggleFavoriteProject}
                  onDeleteProject={handleDeleteProject}
                  onDuplicateProject={handleDuplicateProject}
                  onOpenQuickUpload={() => setIsQuickUploadOpen(true)}
                  onNavigateToMyFilesProjects={handleNavigateToMyFilesProjects}
                  onOpenCloudSync={() => setIsCloudSyncOpen(true)}
                />
              )}

              {/* PAGE 2: NEW PROJECT */}
              {currentTab === 'new-project' && (
                <NewProjectPage
                  onOpenProject={handleOpenProject}
                  onCreateNewProject={handleCreateNewProject}
                />
              )}

              {/* PAGE 3: MY FILES */}
              {currentTab === 'my-files' && (
                <MyFilesPage
                  projects={projects}
                  assets={assets}
                  customFonts={customFonts}
                  initialTab={myFilesTab}
                  onOpenProject={handleOpenProject}
                  onToggleFavoriteProject={handleToggleFavoriteProject}
                  onDeleteProject={handleDeleteProject}
                  onDuplicateProject={handleDuplicateProject}
                  onRefreshAssets={refreshAssets}
                  onCreateNewProject={handleCreateNewProject}
                  onOpenCloudSync={() => setIsCloudSyncOpen(true)}
                  onProjectImported={(proj) => {
                    refreshProjects();
                    setActiveProject(proj);
                    setCurrentTab('editor');
                  }}
                />
              )}

              {/* PAGE 4: BRANDINGS */}
              {currentTab === 'brandings' && (
                <BrandingsPage
                  brands={brands}
                  customFonts={customFonts}
                  onRefreshBrands={refreshBrands}
                  onRefreshFonts={refreshFonts}
                  onCreateDesignWithBrand={handleCreateDesignWithBrand}
                />
              )}
            </>
          )}
        </main>
      </div>
      )}

      {/* Quick Image Utility Modal (Background Remover, Local Eraser, Enhancer) */}
      <QuickImageModal
        isOpen={isQuickUploadOpen}
        onClose={() => setIsQuickUploadOpen(false)}
        onOpenInEditor={(proj) => {
          setActiveProject(proj);
          refreshProjects();
          setCurrentTab('editor');
        }}
        onAssetSaved={refreshAssets}
      />

      {/* Google Drive Cloud Sync & File Portability Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        activeProject={activeProject}
        allAssets={assets}
        allFonts={customFonts}
        onProjectImported={(proj) => {
          refreshProjects();
          setActiveProject(proj);
          setCurrentTab('editor');
        }}
        onBackupsUpdated={refreshProjects}
      />

      {/* Customize Theme Modal */}
      <ThemeCustomizerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={appTheme}
        onThemeChange={(theme) => {
          saveTheme(theme);
          setAppTheme(theme);
        }}
      />
    </div>
  );
}

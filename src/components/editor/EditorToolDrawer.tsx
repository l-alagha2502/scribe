import React, { useState, useMemo, useRef } from 'react';
import * as fabric from 'fabric';
import {
  Shapes,
  Type,
  LayoutTemplate,
  FolderOpen,
  Palette,
  Sliders,
  Upload,
  Search,
  Check,
  Plus,
  Sparkles,
  ImagePlus,
  ClipboardPaste,
  AlertCircle,
  X,
  Music,
  Play,
  Square,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  DEFAULT_LEFT_DRAWER_WIDTH,
  MIN_LEFT_DRAWER_WIDTH,
  MAX_LEFT_DRAWER_WIDTH,
  clampDrawerWidth,
  getSavedDrawerWidth,
  saveDrawerWidth,
} from '../../utils/drawerLayout';
import { AssetRecord, BrandRecord, CustomFontRecord, ProjectRecord } from '../../types';
import {
  VECTOR_ICON_CATALOG,
  VECTOR_ICON_CATEGORIES,
  VectorIconCategory,
  IconFillMode,
  buildIconSvgString,
  buildIconPreviewSvgMarkup,
  VectorIconItem,
} from '../../utils/vectorIcons';
import {
  VECTOR_SHAPES_CATALOG,
  VECTOR_SHAPE_CATEGORIES,
  VectorShapeId,
} from '../../utils/vectorShapes';
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  extractImageFilesFromDrop,
  isSupportedImageFile,
  readImageFileAsDataUrl,
} from '../../utils/imageUploadPaste';
import {
  CURATED_FONT_CATALOG,
  FONT_FILTER_CATEGORIES,
  FontFilterCategory,
  cancelHoverFontLoad,
  loadFontOnDemand,
  scheduleHoverFontLoad,
  subscribeFontLoaded,
} from '../../utils/fontCatalog';

import { ImageEditsPanel } from './ImageEditsPanel';
import { TextEditsPanel } from './TextEditsPanel';
import { ShapeEditsPanel } from './ShapeEditsPanel';
import { isTextFabricObject, isShapeFabricObject } from '../../utils/textEditHelpers';
import {
  CanvasInspectPanel,
  CanvasGridConfig,
  DEFAULT_CANVAS_GRID_CONFIG,
} from './CanvasInspectPanel';
import { TemplatesPanel, LoadedTemplatePayload } from './TemplatesPanel';
import {
  ACCEPTED_FILES_UPLOAD_TYPES,
  formatFileSizeShort,
} from '../../utils/fileRouter';

export type ToolDrawerTab =
  | 'quick-tools'
  | 'add-content'
  | 'text'
  | 'templates'
  | 'files'
  | 'brands';

export type TextPresetId =
  | 'title'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'body'
  | 'detail'
  | 'heading'
  | 'subheading'
  | 'label';

interface EditorToolDrawerProps {
  activeTab: ToolDrawerTab | null;
  onSelectTab: (tab: ToolDrawerTab | null) => void;
  // Canvas interactions
  selectedObject: fabric.FabricObject | null;
  objectRevision?: number;
  onUpdateSelectedProps: (props: Partial<any>) => void;
  onCommitCanvasChange?: () => void;
  onAddText: (type: TextPresetId, customText?: string, fontFamilyOverride?: string) => void;
  onAddShape: (shapeType: VectorShapeId | string) => void;
  onAddImageFromUrl: (url: string, name?: string) => void;
  onAddSvgString: (
    svgStr: string,
    meta?: {
      name?: string;
      color?: string;
      fill?: string;
      fillMode?: IconFillMode;
      strokeWidth?: number;
    }
  ) => void;
  // Canvas Background & Dimensions
  canvasBgColor: string;
  canvasBgImageUrl?: string | null;
  canvasWidth?: number;
  canvasHeight?: number;
  onChangeCanvasBgColor: (color: string) => void;
  onChangeCanvasBackground?: (
    fill: string | fabric.Gradient<'linear'> | fabric.Gradient<'radial'>,
    solidFallbackHex: string
  ) => void;
  onClearCanvasBgImage?: () => void;
  onResizeCanvas?: (width: number, height: number) => void;
  gridConfig?: CanvasGridConfig;
  onChangeGridConfig?: (next: CanvasGridConfig) => void;
  onSetImageAsBackground?: (imgObj: fabric.FabricImage) => void | Promise<void>;
  // Assets & Brands
  assets: AssetRecord[];
  brands: BrandRecord[];
  customFonts: CustomFontRecord[];
  onUploadAsset: (file: File) => void;
  onUploadFiles?: (
    files: File[]
  ) => Promise<{ images: number; audio: number; fonts: string[]; errors: string[] }>;
  onDeleteAsset?: (id: string) => void | Promise<void>;
  onAttachAudioAsset?: (asset: AssetRecord) => void;
  activeAudioTrackId?: string | null;
  activeBrandId?: string | null;
  onApplyOrToggleBrandTheme?: (brand: BrandRecord) => void;
  onApplyBrandSwatchColor?: (color: string) => boolean;
  // Templates & .scribe Export/Import
  getLiveProjectSnapshot: () => ProjectRecord;
  onLoadTemplate: (payload: LoadedTemplatePayload) => void | Promise<void>;
  onInsertTemplateAsNewPage: (payload: LoadedTemplatePayload) => void;
  onOpenShareTemplateModal?: (snapshot: ProjectRecord, savedFilename: string) => void;
  templateLibraryRevision?: number;
  // Quick tools & transforms
  onTriggerBgRemoval?: () => void;
  onTriggerAutoEnhance?: () => void;
  onTriggerObjectEraser?: () => void;
  onFlipX?: () => void;
  onFlipY?: () => void;
  onCenterAlign?: () => void;
}

export const EditorToolDrawer: React.FC<EditorToolDrawerProps> = ({
  activeTab,
  onSelectTab,
  selectedObject,
  objectRevision = 0,
  onUpdateSelectedProps,
  onCommitCanvasChange,
  onAddText,
  onAddShape,
  onAddImageFromUrl,
  onAddSvgString,
  canvasBgColor,
  canvasBgImageUrl = null,
  canvasWidth = 1200,
  canvasHeight = 630,
  onChangeCanvasBgColor,
  onChangeCanvasBackground,
  onClearCanvasBgImage,
  onResizeCanvas,
  gridConfig = DEFAULT_CANVAS_GRID_CONFIG,
  onChangeGridConfig,
  onSetImageAsBackground,
  assets,
  brands,
  customFonts,
  onUploadAsset,
  onUploadFiles,
  onDeleteAsset,
  onAttachAudioAsset,
  activeAudioTrackId = null,
  activeBrandId = null,
  onApplyOrToggleBrandTheme,
  onApplyBrandSwatchColor,
  getLiveProjectSnapshot,
  onLoadTemplate,
  onInsertTemplateAsNewPage,
  onOpenShareTemplateModal,
  templateLibraryRevision = 0,
  onFlipX,
  onFlipY,
}) => {
  // Sub-navigation inside "Content": upload | icons | shapes
  const [contentSubTab, setContentSubTab] = useState<'upload' | 'icons' | 'shapes'>('upload');

  // Local Upload / Paste / Drag-and-Drop State
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOverUpload, setIsDraggingOverUpload] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  // Files Tab Upload / Audio Preview / Feedback State
  const filesInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [isDraggingOverFiles, setIsDraggingOverFiles] = useState(false);
  const [filesFeedback, setFilesFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    hasFontRoute?: boolean;
  } | null>(null);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const [brandHintMsg, setBrandHintMsg] = useState<string | null>(null);

  // Expanded Lucide Vector Icon Library State
  const [iconCategory, setIconCategory] = useState<VectorIconCategory>('All');
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [iconColor, setIconColor] = useState<string>('#ffffff');
  const [iconStrokeWidth, setIconStrokeWidth] = useState<number>(2);
  const [iconFillMode, setIconFillMode] = useState<IconFillMode>('none');
  const [iconVisibleLimit, setIconVisibleLimit] = useState<number>(96);

  // Filter all 1,600+ Lucide icons cleanly
  const filteredVectorIcons = useMemo(() => {
    const q = iconSearchQuery.trim().toLowerCase();
    return VECTOR_ICON_CATALOG.filter((item) => {
      if (iconCategory !== 'All' && item.category !== iconCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.includes(q) ||
        item.tags.some((t) => t.includes(q))
      );
    });
  }, [iconCategory, iconSearchQuery]);

  // Left panel width & collapse tracking
  const [drawerWidth, setDrawerWidth] = useState<number>(getSavedDrawerWidth);
  const [isResizingDrawer, setIsResizingDrawer] = useState<boolean>(false);
  const lastExpandedTabRef = useRef<ToolDrawerTab>('quick-tools');
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (activeTab) {
      lastExpandedTabRef.current = activeTab;
    }
  }, [activeTab]);

  React.useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

  const handleStartResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTab === null) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = drawerWidth;
    let latestWidth = startWidth;
    setIsResizingDrawer(true);
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onPointerMove = (moveEvent: PointerEvent) => {
      latestWidth = clampDrawerWidth(startWidth + (moveEvent.clientX - startX));
      setDrawerWidth(latestWidth);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onPointerUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      setIsResizingDrawer(false);
      resizeCleanupRef.current = null;
    };

    const onPointerUp = () => {
      saveDrawerWidth(latestWidth);
      cleanup();
    };

    resizeCleanupRef.current?.();
    resizeCleanupRef.current = cleanup;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onPointerUp);
  };

  // Font Library Search, Category Filter & Lazy Load Reactivity
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [fontCategory, setFontCategory] = useState<FontFilterCategory>('All');
  const [, setFontRevision] = useState(0);

  React.useEffect(() => {
    const unsub = subscribeFontLoaded(() => {
      setFontRevision((v) => v + 1);
    });
    return () => {
      unsub();
      cancelHoverFontLoad();
    };
  }, []);

  const visibleFontCategories = useMemo(
    () =>
      FONT_FILTER_CATEGORIES.filter(
        (cat) => cat !== 'Custom' || customFonts.length > 0
      ),
    [customFonts.length]
  );

  const filteredFonts = useMemo(() => {
    const q = fontSearchQuery.trim().toLowerCase();
    const customItems = customFonts.map((cf) => ({
      family: cf.name,
      category: 'Custom' as const,
      fallbackStack: `'${cf.name}', 'Inter', sans-serif`,
      tags: [cf.name.toLowerCase(), 'custom', 'uploaded'],
      isCustom: true,
    }));
    const curatedItems = CURATED_FONT_CATALOG.map((item) => ({
      family: item.family,
      category: item.category,
      fallbackStack: item.fallbackStack,
      tags: item.tags,
      isCustom: false,
    }));

    const combined = [...customItems, ...curatedItems];
    return combined.filter((item) => {
      if (fontCategory !== 'All' && item.category !== fontCategory) return false;
      if (!q) return true;
      return (
        item.family.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q))
      );
    });
  }, [customFonts, fontCategory, fontSearchQuery]);

  const activeTextFont =
    selectedObject &&
    (selectedObject instanceof fabric.Textbox ||
      selectedObject.type === 'textbox' ||
      selectedObject.type === 'text' ||
      selectedObject.type === 'i-text')
      ? String((selectedObject as any).fontFamily || '')
      : '';

  const displayedVectorIcons = useMemo(
    () => filteredVectorIcons.slice(0, iconVisibleLimit),
    [filteredVectorIcons, iconVisibleLimit]
  );

  const handleChangeIconColor = (nextColor: string) => {
    setIconColor(nextColor);
    if (selectedObject && (selectedObject as any).isVectorIcon) {
      onUpdateSelectedProps({ stroke: nextColor });
    }
  };

  const handleChangeIconStrokeWidth = (sw: number) => {
    setIconStrokeWidth(sw);
    if (selectedObject && (selectedObject as any).isVectorIcon) {
      onUpdateSelectedProps({ strokeWidth: sw });
    }
  };

  const handleChangeIconFillMode = (mode: IconFillMode) => {
    setIconFillMode(mode);
    if (selectedObject && (selectedObject as any).isVectorIcon) {
      onUpdateSelectedProps({ iconFillMode: mode });
    }
  };

  const handleInsertVectorIcon = (iconItem: VectorIconItem) => {
    const fillVal = iconFillMode === 'none' ? 'none' : iconColor;
    const svgStr = buildIconSvgString(iconItem, iconColor, 120, {
      fill: fillVal,
      fillMode: iconFillMode,
      strokeWidth: iconStrokeWidth,
    });
    onAddSvgString(svgStr, {
      name: iconItem.name,
      color: iconColor,
      fill: fillVal,
      fillMode: iconFillMode,
      strokeWidth: iconStrokeWidth,
    });
  };

  const ingestImageFiles = async (files: File[]) => {
    setUploadErrorMsg(null);
    const valid = files.filter((f) => isSupportedImageFile(f));
    if (valid.length === 0) {
      setUploadErrorMsg('Unsupported file type. Use PNG, JPG, WebP, GIF, or SVG.');
      return;
    }

    let inserted = 0;
    for (const file of valid) {
      try {
        const dataUrl = await readImageFileAsDataUrl(file);
        onAddImageFromUrl(dataUrl, file.name);
        inserted += 1;
      } catch {
        // continue remaining files
      }
    }

    if (inserted > 0) {
      setUploadStatusMsg(
        inserted === 1 ? `Added ${valid[0].name} to canvas` : `Added ${inserted} images to canvas`
      );
      setTimeout(() => setUploadStatusMsg(null), 2600);
    } else {
      setUploadErrorMsg('Could not read the selected image file.');
    }
  };

  const handlePasteFromClipboardButton = async () => {
    setUploadErrorMsg(null);
    if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
      setUploadErrorMsg('Direct clipboard button unavailable here — press Ctrl+V / Cmd+V on the canvas.');
      return;
    }
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split('/')[1]?.replace('+xml', '') || 'png';
          files.push(new File([blob], `pasted-image.${ext}`, { type: imageType }));
        }
      }
      if (files.length === 0) {
        setUploadErrorMsg('No image found in clipboard. Copy an image first or press Ctrl+V / Cmd+V.');
        return;
      }
      await ingestImageFiles(files);
    } catch {
      setUploadErrorMsg('Clipboard read blocked by browser — press Ctrl+V / Cmd+V directly on the canvas.');
    }
  };

  const sidebarTabs: { id: ToolDrawerTab; label: string; icon: React.FC<any> }[] = [
    { id: 'quick-tools', label: 'Edit', icon: Sliders },
    { id: 'add-content', label: 'Content', icon: Shapes },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'brands', label: 'Brands', icon: Palette },
  ];

  const isExpanded = activeTab !== null;

  return (
    <div className="flex h-full z-20 select-none shrink-0" data-testid="left-tool-container">
      {/* 1. Sleek Vertical Icon Sidebar */}
      <div
        data-testid="left-icon-rail"
        className="w-14 editor-chrome-rail backdrop-blur-2xl border-r flex flex-col items-center justify-between py-3 shrink-0"
      >
        <div className="flex flex-col items-center gap-1.5">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`left-rail-tab-${tab.id}`}
                onClick={() => {
                  if (isActive) {
                    onSelectTab(null);
                  } else {
                    onSelectTab(tab.id);
                  }
                }}
                className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                  isActive
                    ? 'bg-white text-[#08080a] shadow-sm scale-95'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
                title={isActive ? `${tab.label} (Click to collapse)` : tab.label}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-medium leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Collapse / Expand Drawer Rail Button */}
        <button
          type="button"
          data-testid="left-panel-rail-toggle"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse section panel' : 'Expand section panel'}
          title={isExpanded ? 'Collapse section panel' : 'Expand section panel'}
          onClick={() => {
            if (isExpanded) {
              onSelectTab(null);
            } else {
              onSelectTab(lastExpandedTabRef.current || 'quick-tools');
            }
          }}
          className="w-10 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/[0.08] transition-colors"
        >
          {isExpanded ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 2. Collapsible & Resizable Context-Aware Section Panel */}
      <div
        data-testid="left-tool-drawer"
        data-collapsed={!isExpanded ? 'true' : 'false'}
        aria-hidden={!isExpanded}
        className="relative h-full overflow-hidden shrink-0"
        style={{
          width: isExpanded ? `${drawerWidth}px` : '0px',
          transition: isResizingDrawer
            ? 'none'
            : 'width 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {isExpanded && activeTab && (
          <aside
            className="h-full editor-chrome-panel backdrop-blur-2xl border-r shadow-2xl flex flex-col overflow-hidden relative"
            style={{ width: `${drawerWidth}px` }}
          >
            {activeTab === 'quick-tools' ? (
              selectedObject ? (
                isTextFabricObject(selectedObject) ? (
                  <TextEditsPanel
                    selectedObject={selectedObject}
                    objectRevision={objectRevision}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    customFonts={customFonts}
                    onUpdateSelectedProps={onUpdateSelectedProps}
                    onCommitCanvasChange={onCommitCanvasChange}
                    onFlipX={onFlipX}
                    onFlipY={onFlipY}
                    onCollapsePanel={() => onSelectTab(null)}
                  />
                ) : isShapeFabricObject(selectedObject) ? (
                  <ShapeEditsPanel
                    selectedObject={selectedObject}
                    objectRevision={objectRevision}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    onUpdateSelectedProps={onUpdateSelectedProps}
                    onCommitCanvasChange={onCommitCanvasChange}
                    onSetColorAsBackground={(col) => {
                      if (onChangeCanvasBackground) {
                        onChangeCanvasBackground(col, col);
                      } else {
                        onChangeCanvasBgColor(col);
                      }
                    }}
                    onFlipX={onFlipX}
                    onFlipY={onFlipY}
                    onCollapsePanel={() => onSelectTab(null)}
                  />
                ) : (
                  <ImageEditsPanel
                    selectedObject={selectedObject}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    onUpdateSelectedProps={onUpdateSelectedProps}
                    onCommitCanvasChange={onCommitCanvasChange}
                    onSetImageAsBackground={onSetImageAsBackground}
                    onSetColorAsBackground={(col) => {
                      if (onChangeCanvasBackground) {
                        onChangeCanvasBackground(col, col);
                      } else {
                        onChangeCanvasBgColor(col);
                      }
                    }}
                    onFlipX={onFlipX}
                    onFlipY={onFlipY}
                    onCollapsePanel={() => onSelectTab(null)}
                  />
                )
              ) : (
                <CanvasInspectPanel
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                  canvasBgColor={canvasBgColor}
                  canvasBgImageUrl={canvasBgImageUrl}
                  brands={brands}
                  gridConfig={gridConfig}
                  onChangeGridConfig={(next) => onChangeGridConfig?.(next)}
                  onChangeCanvasBackground={(fill, solidHex) => {
                    if (onChangeCanvasBackground) {
                      onChangeCanvasBackground(fill, solidHex);
                    } else {
                      onChangeCanvasBgColor(solidHex);
                    }
                  }}
                  onClearCanvasBgImage={onClearCanvasBgImage}
                  onResizeCanvas={(w, h) => onResizeCanvas?.(w, h)}
                  onCollapsePanel={() => onSelectTab(null)}
                />
              )
            ) : (
              <>
                {/* Library Drawer Header */}
                <div className="h-12 px-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between shrink-0">
                  <h3 className="text-xs font-semibold text-white tracking-tight capitalize">
                    {sidebarTabs.find((t) => t.id === activeTab)?.label}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectTab('quick-tools')}
                      className="text-[11px] font-mono text-slate-400 hover:text-white hover:bg-white/[0.06] px-2 py-1 rounded transition-colors"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      data-testid="left-panel-collapse-btn"
                      onClick={() => onSelectTab(null)}
                      aria-label="Collapse left panel"
                      title="Collapse panel"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                      <PanelLeftClose className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Library Drawer Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
            {/* TAB 2: ADD CONTENT (Upload & Paste, Lucide Icons, Crisp Vector Shapes) */}
            {activeTab === 'add-content' && (
              <div className="space-y-4">
                {/* Segmented Sub-Tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  {[
                    { id: 'upload' as const, label: 'Upload', icon: ImagePlus },
                    { id: 'icons' as const, label: 'Icons', icon: Sparkles },
                    { id: 'shapes' as const, label: 'Shapes', icon: Shapes },
                  ].map((sub) => {
                    const SubIcon = sub.icon;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        data-testid={`content-subtab-${sub.id}`}
                        onClick={() => setContentSubTab(sub.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                          contentSubTab === sub.id
                            ? 'bg-white text-[#08080a] shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* SUBTAB 1: LOCAL UPLOAD, PASTE & DRAG-AND-DROP */}
                {contentSubTab === 'upload' && (
                  <div className="space-y-3">
                    {/* Drag & Drop + Multi-File Upload Zone */}
                    <div
                      data-testid="content-upload-dropzone"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingOverUpload(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingOverUpload(false);
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingOverUpload(false);
                        const dropped = extractImageFilesFromDrop(e.dataTransfer);
                        await ingestImageFiles(dropped);
                      }}
                      onClick={() => uploadInputRef.current?.click()}
                      className={`p-5 rounded-xl border border-dashed text-center cursor-pointer transition-colors space-y-2.5 ${
                        isDraggingOverUpload
                          ? 'bg-white/[0.09] border-white/50 text-white'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.14] text-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/[0.07] border border-white/[0.1] mx-auto flex items-center justify-center text-white">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-white">
                          Drop images here or browse
                        </div>
                        <div className="text-[11px] text-slate-400">
                          PNG · JPG · WebP · GIF · SVG (multi-file)
                        </div>
                      </div>
                      <input
                        ref={uploadInputRef}
                        type="file"
                        accept={ACCEPTED_IMAGE_MIME_TYPES}
                        multiple
                        data-testid="content-upload-input"
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          const selected = Array.from(e.target.files || []);
                          if (selected.length > 0) {
                            await ingestImageFiles(selected);
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* Clipboard Paste Controls */}
                    <button
                      type="button"
                      data-testid="content-paste-btn"
                      onClick={handlePasteFromClipboardButton}
                      className="w-full py-2.5 px-3 rounded-xl bg-white text-[#08080a] hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <ClipboardPaste className="w-4 h-4" />
                      <span>Paste Image from Clipboard</span>
                    </button>

                    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.07] space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                      <div className="font-semibold text-slate-200">Quick Insert Shortcuts</div>
                      <div>Press Ctrl+V / Cmd+V anywhere on the canvas to paste clipboard images.</div>
                      <div>Drag image files directly onto the artboard to place them at your cursor.</div>
                    </div>

                    {uploadErrorMsg && (
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{uploadErrorMsg}</span>
                      </div>
                    )}

                    {uploadStatusMsg && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{uploadStatusMsg}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* SUBTAB 2: EXPANDED LUCIDE VECTOR ICONS */}
                {contentSubTab === 'icons' && (
                  <div className="space-y-3">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={iconSearchQuery}
                        data-testid="icons-search-input"
                        onChange={(e) => {
                          setIconSearchQuery(e.target.value);
                          setIconVisibleLimit(96);
                        }}
                        placeholder={`Search ${VECTOR_ICON_CATALOG.length.toLocaleString()} vector icons...`}
                        className="w-full py-2 pl-8 pr-8 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-white/25"
                      />
                      {iconSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setIconSearchQuery('');
                            setIconVisibleLimit(96);
                          }}
                          aria-label="Clear icon search"
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Category Tabs */}
                    <div
                      role="tablist"
                      aria-label="Icon categories"
                      className="flex gap-1 overflow-x-auto pb-1 text-[10px] no-scrollbar"
                    >
                      {VECTOR_ICON_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          role="tab"
                          aria-selected={iconCategory === cat}
                          data-testid={`icon-cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                          onClick={() => {
                            setIconCategory(cat);
                            setIconVisibleLimit(96);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors ${
                            iconCategory === cat
                              ? 'bg-white text-[#08080a] font-semibold'
                              : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Icon Color, Stroke & Fill Controls */}
                    <div className="p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.07] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-300">Color</span>
                        <div className="flex items-center gap-1.5">
                          {['#ffffff', '#08080a', '#6366f1', '#06b6d4', '#10b981', '#f43f5e', '#f59e0b'].map(
                            (col) => (
                              <button
                                key={col}
                                type="button"
                                data-testid={`icon-color-swatch-${col.replace('#', '')}`}
                                onClick={() => handleChangeIconColor(col)}
                                className={`w-4 h-4 rounded-md border transition-transform ${
                                  iconColor.toLowerCase() === col
                                    ? 'scale-110 border-white'
                                    : 'border-white/20 hover:scale-105'
                                }`}
                                style={{ backgroundColor: col }}
                                title={col}
                              />
                            )
                          )}
                          <label
                            className="w-5 h-4 rounded-md border border-white/25 cursor-pointer overflow-hidden"
                            style={{ backgroundColor: iconColor }}
                            title="Custom icon color"
                          >
                            <input
                              type="color"
                              data-testid="icon-custom-color-input"
                              value={iconColor}
                              onChange={(e) => handleChangeIconColor(e.target.value)}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/[0.06]">
                        <span className="text-[11px] text-slate-300">Stroke</span>
                        <div className="flex items-center gap-1">
                          {[1.5, 2, 2.5].map((sw) => (
                            <button
                              key={sw}
                              type="button"
                              onClick={() => handleChangeIconStrokeWidth(sw)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums transition-colors ${
                                iconStrokeWidth === sw
                                  ? 'bg-white text-[#08080a] font-semibold'
                                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
                              }`}
                            >
                              {sw}px
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/[0.06]">
                        <span className="text-[11px] text-slate-300">Fill</span>
                        <div
                          className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08]"
                          role="group"
                          aria-label="Icon fill option"
                        >
                          {(
                            [
                              { id: 'none', label: 'None' },
                              { id: 'soft', label: 'Soft' },
                              { id: 'solid', label: 'Solid' },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              data-testid={`icon-fill-${opt.id}`}
                              onClick={() => handleChangeIconFillMode(opt.id)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap ${
                                iconFillMode === opt.id
                                  ? 'bg-white text-[#08080a] font-semibold'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Count */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5 tabular-nums">
                      <span>{iconCategory}</span>
                      <span>{filteredVectorIcons.length.toLocaleString()} icons</span>
                    </div>

                    {/* Vector Icons Grid */}
                    <div
                      data-testid="vector-icons-grid"
                      className="grid grid-cols-4 gap-1.5 max-h-72 overflow-y-auto pr-1"
                    >
                      {displayedVectorIcons.map((ico) => (
                        <button
                          key={ico.id}
                          type="button"
                          data-testid={`icon-item-${ico.id}`}
                          onClick={() => handleInsertVectorIcon(ico)}
                          className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/25 flex flex-col items-center justify-center gap-1.5 transition-colors text-slate-300 hover:text-white group"
                          title={`Insert ${ico.name}`}
                        >
                          <div
                            className="w-5 h-5 shrink-0 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5"
                            dangerouslySetInnerHTML={{
                              __html: buildIconPreviewSvgMarkup(
                                ico,
                                iconColor,
                                iconStrokeWidth,
                                iconFillMode
                              ),
                            }}
                          />
                          <span className="text-[9px] font-medium truncate max-w-full text-slate-400 group-hover:text-white">
                            {ico.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    {filteredVectorIcons.length > displayedVectorIcons.length && (
                      <button
                        type="button"
                        onClick={() => setIconVisibleLimit((lim) => lim + 96)}
                        className="w-full py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] font-medium text-slate-200 transition-colors"
                      >
                        Load more ({(filteredVectorIcons.length - displayedVectorIcons.length).toLocaleString()} remaining)
                      </button>
                    )}

                    {filteredVectorIcons.length === 0 && (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        No icons matching &ldquo;{iconSearchQuery}&rdquo;
                      </div>
                    )}
                  </div>
                )}

                {/* SUBTAB 3: EXPANDED VECTOR SHAPES (BASIC, POLYGONS & STARS, LINES & DIVIDERS) */}
                {contentSubTab === 'shapes' && (
                  <div className="space-y-4">
                    {VECTOR_SHAPE_CATEGORIES.map((category) => {
                      const items = VECTOR_SHAPES_CATALOG.filter((s) => s.category === category);
                      return (
                        <section key={category} className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                            <span>{category}</span>
                            <span className="text-slate-500 font-mono tabular-nums">{items.length}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {items.map((shape) => (
                              <button
                                key={shape.id}
                                type="button"
                                data-testid={`shape-item-${shape.id}`}
                                onClick={() => onAddShape(shape.id)}
                                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] hover:border-white/25 flex flex-col items-center justify-center gap-1.5 text-slate-200 hover:text-white transition-colors"
                                title={`Add ${shape.label}`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 32 32"
                                  className="w-7 h-7 text-slate-100 shrink-0"
                                  dangerouslySetInnerHTML={{ __html: shape.previewPath }}
                                />
                                <span className="text-[11px] font-medium truncate max-w-full">
                                  {shape.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TEXT PRESETS & CURATED ~60-FONT SELECTOR */}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-slate-300">Presets</span>
                  <div className="grid grid-cols-2 gap-1.5" data-testid="text-presets-grid">
                    {(
                      [
                        { id: 'title', label: 'Title', textClass: 'text-xl font-bold text-white tracking-tight' },
                        { id: 'heading-1', label: 'Heading 1', textClass: 'text-base font-bold text-white tracking-tight' },
                        { id: 'heading-2', label: 'Heading 2', textClass: 'text-sm font-semibold text-slate-100' },
                        { id: 'heading-3', label: 'Heading 3', textClass: 'text-[13px] font-semibold text-slate-200' },
                        { id: 'body', label: 'Body', textClass: 'text-xs font-normal text-slate-200' },
                        { id: 'detail', label: 'Detail', textClass: 'text-[11px] font-medium text-slate-300' },
                      ] as const
                    ).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        data-testid={`text-preset-${preset.id}`}
                        onClick={() => onAddText(preset.id)}
                        className="h-12 px-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20 flex items-center justify-center text-center transition-colors"
                      >
                        <span className={preset.textClass}>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Curated 60-Font Selector with Lazy Loading */}
                <div className="space-y-2.5 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-[11px] tabular-nums">
                    <span className="font-medium text-slate-300">Fonts</span>
                    <span className="text-slate-400">
                      {filteredFonts.length} available
                    </span>
                  </div>

                  {/* Font Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={fontSearchQuery}
                      data-testid="font-search-input"
                      onChange={(e) => setFontSearchQuery(e.target.value)}
                      placeholder={`Search ${CURATED_FONT_CATALOG.length + customFonts.length} fonts...`}
                      className="w-full py-2 pl-8 pr-8 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-white/25"
                    />
                    {fontSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFontSearchQuery('')}
                        aria-label="Clear font search"
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Filter Tabs */}
                  <div
                    role="tablist"
                    aria-label="Font categories"
                    className="flex gap-1 overflow-x-auto pb-1 text-[10px] no-scrollbar"
                  >
                    {visibleFontCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        role="tab"
                        aria-selected={fontCategory === cat}
                        data-testid={`font-cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        onClick={() => setFontCategory(cat)}
                        className={`px-2.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors ${
                          fontCategory === cat
                            ? 'bg-white text-[#08080a] font-semibold'
                            : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable Lazy-Loaded Font List */}
                  <div
                    data-testid="font-picker-list"
                    className="space-y-1 max-h-72 overflow-y-auto pr-1"
                  >
                    {filteredFonts.map((font) => {
                      const isActive =
                        activeTextFont.toLowerCase() === font.family.toLowerCase();
                      const slug = font.family.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      return (
                        <button
                          key={`${font.isCustom ? 'custom' : 'curated'}-${font.family}`}
                          type="button"
                          data-testid={`font-option-${slug}`}
                          onMouseEnter={() => {
                            if (!font.isCustom) scheduleHoverFontLoad(font.family);
                          }}
                          onFocus={() => {
                            if (!font.isCustom) scheduleHoverFontLoad(font.family);
                          }}
                          onMouseLeave={() => {
                            if (!font.isCustom) cancelHoverFontLoad(font.family);
                          }}
                          onClick={() => {
                            if (!font.isCustom) {
                              void loadFontOnDemand(font.family);
                            }
                            const isSelectedText =
                              selectedObject &&
                              (selectedObject instanceof fabric.Textbox ||
                                selectedObject.type === 'textbox' ||
                                selectedObject.type === 'text' ||
                                selectedObject.type === 'i-text');
                            if (isSelectedText) {
                              onUpdateSelectedProps({ fontFamily: font.family });
                            } else {
                              onAddText('heading-1', font.family, font.family);
                            }
                          }}
                          className={`w-full px-2.5 py-2 rounded-lg border text-left flex items-center justify-between gap-2 transition-colors ${
                            isActive
                              ? 'bg-white/[0.1] border-white/30 text-white'
                              : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05] text-slate-200 hover:text-white'
                          }`}
                        >
                          <span
                            className="text-sm truncate"
                            style={{ fontFamily: font.fallbackStack }}
                          >
                            {font.family}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                            {font.isCustom ? 'Custom' : font.category}
                          </span>
                        </button>
                      );
                    })}

                    {filteredFonts.length === 0 && (
                      <div className="py-6 text-center text-slate-500 text-xs">
                        No fonts matching &ldquo;{fontSearchQuery}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: LOCAL-FIRST .SCRIBE TEMPLATES LIBRARY */}
            {activeTab === 'templates' && (
              <TemplatesPanel
                getLiveProjectSnapshot={getLiveProjectSnapshot}
                allAssets={assets}
                allFonts={customFonts}
                onLoadTemplate={onLoadTemplate}
                onInsertTemplateAsNewPage={onInsertTemplateAsNewPage}
                onOpenShareModal={onOpenShareTemplateModal}
                templateLibraryRevision={templateLibraryRevision}
              />
            )}

            {/* TAB 5: FILES & UPLOADED MEDIA (Images & Audio; Fonts route to Text) */}
            {activeTab === 'files' && (() => {
              const handleFilesUpload = async (incoming: File[]) => {
                if (incoming.length === 0) return;
                if (onUploadFiles) {
                  const res = await onUploadFiles(incoming);
                  const parts: string[] = [];
                  if (res.fonts.length > 0) {
                    parts.push(
                      res.fonts.length === 1
                        ? `Font "${res.fonts[0]}" added to Text & Typography`
                        : `${res.fonts.length} fonts added to Text & Typography`
                    );
                  }
                  if (res.images > 0) {
                    parts.push(
                      res.images === 1 ? '1 image saved' : `${res.images} images saved`
                    );
                  }
                  if (res.audio > 0) {
                    parts.push(
                      res.audio === 1 ? '1 audio file saved' : `${res.audio} audio files saved`
                    );
                  }
                  if (res.errors.length > 0 && parts.length === 0) {
                    setFilesFeedback({ type: 'error', message: res.errors[0] });
                  } else if (parts.length > 0) {
                    setFilesFeedback({
                      type: 'success',
                      message: parts.join(' · '),
                      hasFontRoute: res.fonts.length > 0,
                    });
                  }
                  return;
                }
                incoming.forEach((f) => onUploadAsset(f));
              };

              const imageAssets = assets.filter((a) => a.type !== 'audio');
              const audioAssets = assets.filter((a) => a.type === 'audio');

              const toggleAudioPreview = (asset: AssetRecord) => {
                if (previewingAudioId === asset.id) {
                  audioPreviewRef.current?.pause();
                  setPreviewingAudioId(null);
                  return;
                }
                if (audioPreviewRef.current) {
                  audioPreviewRef.current.pause();
                }
                const audio = new Audio(asset.url);
                audio.onended = () => setPreviewingAudioId(null);
                audioPreviewRef.current = audio;
                audio.play().catch(() => {});
                setPreviewingAudioId(asset.id);
              };

              return (
                <div className="space-y-3" data-testid="files-panel">
                  {/* Drag-and-Drop + Multi-File Upload Zone */}
                  <div
                    data-testid="files-dropzone"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOverFiles(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOverFiles(false);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOverFiles(false);
                      const dropped = Array.from(e.dataTransfer?.files || []);
                      await handleFilesUpload(dropped);
                    }}
                    onClick={() => filesInputRef.current?.click()}
                    className={`p-3.5 rounded-xl border border-dashed text-center cursor-pointer transition-colors space-y-2 ${
                      isDraggingOverFiles
                        ? 'bg-white/[0.1] border-white/50'
                        : 'bg-white/[0.025] hover:bg-white/[0.05] border-white/[0.12]'
                    }`}
                  >
                    <button
                      type="button"
                      data-testid="files-upload-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        filesInputRef.current?.click();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-white text-[#08080a] font-semibold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4 shrink-0" />
                      <span>Upload File(s)</span>
                    </button>
                    <div className="text-[10px] text-slate-400 leading-snug">
                      Images · Audio (.mp3, .wav, .ogg, .m4a) · Fonts (.ttf, .otf, .woff, .woff2)
                    </div>
                    <input
                      ref={filesInputRef}
                      type="file"
                      accept={ACCEPTED_FILES_UPLOAD_TYPES}
                      multiple
                      data-testid="files-upload-input"
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (e) => {
                        const selected = Array.from(e.target.files || []);
                        e.target.value = '';
                        await handleFilesUpload(selected);
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* Feedback Banner (including Font Routing confirmation) */}
                  {filesFeedback && (
                    <div
                      role="status"
                      data-testid="files-status-banner"
                      className={`p-2.5 rounded-xl border text-[11px] space-y-1.5 ${
                        filesFeedback.type === 'error'
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5">
                          {filesFeedback.type === 'error' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          <span className="leading-snug">{filesFeedback.message}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFilesFeedback(null)}
                          aria-label="Dismiss files message"
                          className="text-slate-400 hover:text-white shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {filesFeedback.hasFontRoute && (
                        <button
                          type="button"
                          data-testid="open-text-fonts-btn"
                          onClick={() => onSelectTab('text')}
                          className="w-full py-1 px-2 rounded-lg bg-white text-[#08080a] hover:bg-slate-200 text-[11px] font-semibold transition-colors"
                        >
                          Open Text Fonts
                        </button>
                      )}
                    </div>
                  )}

                  {/* Uploaded Files List */}
                  <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] tabular-nums">
                      <span className="font-medium text-slate-300">Uploaded Files</span>
                      <span className="text-slate-400">{assets.length} saved</span>
                    </div>

                    {assets.length === 0 ? (
                      <div
                        data-testid="files-empty-state"
                        className="py-8 px-3 rounded-xl border border-dashed border-white/[0.08] text-center space-y-1"
                      >
                        <div className="text-xs font-medium text-slate-300">No files uploaded yet</div>
                        <div className="text-[11px] text-slate-500">
                          Images and audio files appear here. Fonts route straight to Text.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Uploaded Audio Files */}
                        {audioAssets.length > 0 && (
                          <div className="space-y-1.5" data-testid="files-audio-list">
                            <span className="text-[10px] font-medium text-slate-400">
                              Audio Clips ({audioAssets.length})
                            </span>
                            <div className="space-y-1.5">
                              {audioAssets.map((audio) => {
                                const isPreviewing = previewingAudioId === audio.id;
                                const isAttached = activeAudioTrackId === audio.id;
                                return (
                                  <div
                                    key={audio.id}
                                    data-testid={`file-audio-${audio.id}`}
                                    className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <button
                                          type="button"
                                          onClick={() => toggleAudioPreview(audio)}
                                          className="w-7 h-7 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-white flex items-center justify-center shrink-0"
                                          title={isPreviewing ? 'Stop preview' : 'Preview audio'}
                                        >
                                          {isPreviewing ? (
                                            <Square className="w-3 h-3 fill-current" />
                                          ) : (
                                            <Play className="w-3 h-3 fill-current" />
                                          )}
                                        </button>
                                        <div className="min-w-0">
                                          <div className="text-[11px] font-medium text-white truncate">
                                            {audio.name}
                                          </div>
                                          <div className="text-[10px] text-slate-400 tabular-nums">
                                            Audio{audio.size ? ` · ${formatFileSizeShort(audio.size)}` : ''}
                                          </div>
                                        </div>
                                      </div>

                                      {onDeleteAsset && (
                                        <button
                                          type="button"
                                          data-testid={`delete-file-${audio.id}`}
                                          onClick={() => {
                                            if (previewingAudioId === audio.id) {
                                              audioPreviewRef.current?.pause();
                                              setPreviewingAudioId(null);
                                            }
                                            void onDeleteAsset(audio.id);
                                          }}
                                          aria-label={`Delete ${audio.name}`}
                                          className="p-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>

                                    {onAttachAudioAsset && (
                                      <button
                                        type="button"
                                        data-testid={`attach-audio-${audio.id}`}
                                        onClick={() => onAttachAudioAsset(audio)}
                                        className={`w-full py-1 px-2 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 ${
                                          isAttached
                                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                                            : 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200'
                                        }`}
                                      >
                                        <Music className="w-3 h-3 shrink-0" />
                                        <span>{isAttached ? 'Attached to Project' : 'Insert Audio into Project'}</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Uploaded Image Files */}
                        {imageAssets.length > 0 && (
                          <div className="grid grid-cols-2 gap-2" data-testid="files-image-grid">
                            {imageAssets.map((asset) => (
                              <div
                                key={asset.id}
                                data-testid={`file-image-${asset.id}`}
                                onClick={() => onAddImageFromUrl(asset.url, asset.name)}
                                className="group aspect-square rounded-xl bg-black/60 border border-white/[0.06] hover:border-white/25 overflow-hidden cursor-pointer relative"
                                title={`Click to insert ${asset.name}`}
                              >
                                <img
                                  src={asset.url}
                                  alt={asset.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white pointer-events-none">
                                  <Plus className="w-4 h-4" />
                                </div>
                                {onDeleteAsset && (
                                  <button
                                    type="button"
                                    data-testid={`delete-file-${asset.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void onDeleteAsset(asset.id);
                                    }}
                                    aria-label={`Delete ${asset.name}`}
                                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/75 text-slate-300 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB 6: BRANDS */}
            {activeTab === 'brands' && (
              <div className="space-y-3" data-testid="brands-panel">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-300">Brand Color Palettes</span>
                  <div className="text-[10px] text-slate-500">
                    Click a brand card to apply or toggle its theme across layers. Click a swatch to color the selected element.
                  </div>
                </div>

                {brandHintMsg && (
                  <div
                    role="status"
                    data-testid="brand-swatch-hint"
                    className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-300 flex items-center justify-between gap-2"
                  >
                    <span>{brandHintMsg}</span>
                    <button
                      type="button"
                      onClick={() => setBrandHintMsg(null)}
                      aria-label="Dismiss swatch hint"
                      className="text-slate-400 hover:text-white shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {brands.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No brands created yet. Create a brand kit on the Brandings page!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {brands.map((b) => {
                      const isActiveBrand = activeBrandId === b.id;
                      const palette = [b.primaryColor, ...(b.secondaryColors || [])].filter(Boolean);

                      return (
                        <div
                          key={b.id}
                          role="button"
                          tabIndex={0}
                          data-testid={`brand-theme-card-${b.id}`}
                          onClick={() => {
                            setBrandHintMsg(null);
                            onApplyOrToggleBrandTheme?.(b);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setBrandHintMsg(null);
                              onApplyOrToggleBrandTheme?.(b);
                            }
                          }}
                          className={`p-3 rounded-xl border transition-colors cursor-pointer space-y-2 ${
                            isActiveBrand
                              ? 'bg-white/[0.08] border-white/35'
                              : 'bg-white/[0.025] hover:bg-white/[0.05] border-white/[0.07] hover:border-white/20'
                          }`}
                          title={
                            isActiveBrand
                              ? `Click to revert ${b.name} theme`
                              : `Click to apply ${b.name} palette across project elements`
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-white truncate">{b.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                              {isActiveBrand ? 'Applied · Click to revert' : 'Apply Theme'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {palette.map((col, idx) => (
                              <button
                                key={`${b.id}-${idx}`}
                                type="button"
                                data-testid={`brand-swatch-${b.id}-${idx}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onApplyBrandSwatchColor) {
                                    const applied = onApplyBrandSwatchColor(col);
                                    if (!applied) {
                                      setBrandHintMsg(
                                        'Select a shape, icon, or text element on the canvas to apply a color swatch.'
                                      );
                                    } else {
                                      setBrandHintMsg(null);
                                    }
                                    return;
                                  }
                                  if (selectedObject) {
                                    onUpdateSelectedProps({ fill: col });
                                    setBrandHintMsg(null);
                                  } else {
                                    setBrandHintMsg(
                                      'Select a shape, icon, or text element on the canvas to apply a color swatch.'
                                    );
                                  }
                                }}
                                className="w-7 h-7 rounded-lg border border-white/20 hover:scale-105 transition-transform shrink-0"
                                style={{ backgroundColor: col }}
                                title={
                                  selectedObject
                                    ? `Apply ${col} to selected asset`
                                    : `Select an element on canvas to apply ${col}`
                                }
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
              </div>
            </>
          )}
            {/* Drag-to-Resize Handle */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize left section panel"
              aria-valuemin={MIN_LEFT_DRAWER_WIDTH}
              aria-valuemax={MAX_LEFT_DRAWER_WIDTH}
              aria-valuenow={drawerWidth}
              data-testid="left-panel-resize-handle"
              title="Drag to resize · Double-click to reset"
              onPointerDown={handleStartResize}
              onDoubleClick={() => {
                setDrawerWidth(DEFAULT_LEFT_DRAWER_WIDTH);
                saveDrawerWidth(DEFAULT_LEFT_DRAWER_WIDTH);
              }}
              className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize z-30 group flex items-center justify-center touch-none"
            >
              <div
                className={`w-[2px] h-10 rounded-full transition-colors ${
                  isResizingDrawer
                    ? 'bg-white/75'
                    : 'bg-transparent group-hover:bg-white/35'
                }`}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

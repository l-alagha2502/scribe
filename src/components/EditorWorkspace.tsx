import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { ZoomIn, ZoomOut, Maximize2, Hand, RotateCcw } from 'lucide-react';
import { ProjectRecord, ProjectPageRecord, BrandRecord, AssetRecord, CustomFontRecord } from '../types';
import { saveProject, saveAsset, deleteAsset, saveCustomFont } from '../utils/db';
import { removeBackgroundCanvas } from '../utils/imageTools';
import { computeCoverBackgroundTransform } from '../utils/imageEffectsEngine';
import { createFabricShape } from '../utils/vectorShapes';
import { IconFillMode } from '../utils/vectorIcons';
import { CURATED_FONT_CATALOG } from '../utils/fontCatalog';
import { useCanvasFontSync } from '../hooks/useCanvasFontSync';
import {
  classifyUploadedFile,
  parseCustomFontFormat,
  deriveCustomFontFamilyName,
  readFileAsDataUrl,
  extractImageDimensionsFromUrl,
} from '../utils/fileRouter';
import {
  AppliedBrandThemeState,
  applyBrandThemeToObjects,
  restoreBrandThemeSnapshots,
  getSwatchUpdatePropsForObject,
} from '../utils/brandTheme';
import {
  computeCanvasDropCoordinates,
  extractImageFilesFromClipboard,
  extractImageFilesFromDrop,
  readImageFileAsDataUrl,
} from '../utils/imageUploadPaste';
import {
  hasAnyAnimationSlot,
  normalizeAnimationSlots,
  playCanvasPreview,
  stopCanvasPreview,
} from '../utils/animationEngine';
import { EditorTopBar } from './editor/EditorTopBar';
import { FloatingContextToolbar } from './editor/FloatingContextToolbar';
import { LayerPanel } from './editor/LayerPanel';
import { BottomPageBar } from './editor/BottomPageBar';
import { EditorToolDrawer, ToolDrawerTab, TextPresetId } from './editor/EditorToolDrawer';
import { installFabricParagraphSpacingPatch } from '../utils/textEditHelpers';
import {
  CanvasGridConfig,
  DEFAULT_CANVAS_GRID_CONFIG,
} from './editor/CanvasInspectPanel';
import { ExportModal } from './editor/ExportModal';
import { TimelineDrawer } from './editor/TimelineDrawer';
import { PublishCommunityModal } from './PublishCommunityModal';
import { CloudSyncModal } from './CloudSyncModal';
import { saveTemplateLocallyAndDownload } from '../utils/templateLibrary';

interface EditorWorkspaceProps {
  project: ProjectRecord;
  brands: BrandRecord[];
  assets: AssetRecord[];
  customFonts: CustomFontRecord[];
  onBackToDashboard: () => void;
  onProjectUpdated: (updated: ProjectRecord) => void;
  onRefreshAssets: () => void;
  onRefreshFonts: () => void;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  project,
  brands,
  assets,
  customFonts,
  onBackToDashboard,
  onProjectUpdated,
  onRefreshAssets,
  onRefreshFonts,
}) => {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  // Document metadata state
  const [documentTitle, setDocumentTitle] = useState(project.name || 'Untitled Document');
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: project.width || 1200,
    height: project.height || 630,
  });

  // Pages state (multi-page artboard architecture)
  const initialPages: ProjectPageRecord[] = (project.pages && project.pages.length > 0)
    ? project.pages
    : [
        {
          id: 'page_1',
          name: 'Page 1',
          fabricJson: project.fabricJson || JSON.stringify({ version: '6.0.0', objects: [] }),
          thumbnail: project.thumbnail,
        },
      ];

  const [pages, setPages] = useState<ProjectPageRecord[]>(initialPages);
  const [currentPageId, setCurrentPageId] = useState<string>(initialPages[0].id);

  // Canvas viewport & display toggles
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanToolActive, setIsPanToolActive] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showRulersGuides, setShowRulersGuides] = useState<boolean>(false);
  const [showBleedMargins, setShowBleedMargins] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'syncing-drive'>('saved');

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [shareSnapshotProject, setShareSnapshotProject] = useState<ProjectRecord | null>(null);
  const [shareSavedFilename, setShareSavedFilename] = useState<string | undefined>(undefined);
  const [templateLibraryRevision, setTemplateLibraryRevision] = useState<number>(0);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Drawer & Sidebar states
  const [activeDrawerTab, setActiveDrawerTab] = useState<ToolDrawerTab | null>('quick-tools');
  const [isLayersCollapsed, setIsLayersCollapsed] = useState(false);
  const [gridConfig, setGridConfig] = useState<CanvasGridConfig>(DEFAULT_CANVAS_GRID_CONFIG);
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);

  // Selected object properties
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null);
  const [objectRevision, setObjectRevision] = useState<number>(0);
  const [layersList, setLayersList] = useState<fabric.FabricObject[]>([]);
  const [canvasBgColor, setCanvasBgColor] = useState<string>(
    project.type === 'print' ? '#ffffff' : '#08080a'
  );
  const [canvasBgImageUrl, setCanvasBgImageUrl] = useState<string | null>(null);
  const [audioTrack, setAudioTrack] = useState<{ id: string; name: string; url: string } | null>(
    project.audioTrack || null
  );
  const audioTrackRef = useRef<{ id: string; name: string; url: string } | null>(
    project.audioTrack || null
  );
  const [appliedBrandTheme, setAppliedBrandTheme] = useState<AppliedBrandThemeState | null>(null);

  const syncBgImageState = useCallback((canvas: fabric.Canvas) => {
    const bgImg = canvas.backgroundImage as fabric.FabricImage | undefined;
    if (bgImg && typeof bgImg.getSrc === 'function') {
      setCanvasBgImageUrl(bgImg.getSrc() || 'image');
    } else if (bgImg) {
      setCanvasBgImageUrl('image');
    } else {
      setCanvasBgImageUrl(null);
    }
  }, []);

  // History stack for undo / redo
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);

  // Available fonts list (60 curated lazy-loaded Google Fonts + user-uploaded custom fonts)
  const allAvailableFonts = [
    ...customFonts.map((f) => f.name),
    ...CURATED_FONT_CATALOG.map((f) => f.family),
  ];

  // Lazy font loader + Fabric text re-measure / re-render hook
  const { loadAndRefreshFont, syncCanvasProjectFonts } = useCanvasFontSync(fabricRef);

  // Check if project has media elements (video/audio)
  const hasMediaElements =
    project.type === 'video' ||
    Boolean(audioTrack) ||
    layersList.some(
      (obj) =>
        obj.type === 'video' ||
        (obj as any).isVideo ||
        (obj as any).hasAudio ||
        (obj as any).animation ||
        hasAnyAnimationSlot(normalizeAnimationSlots(obj))
    );

  // Sync layers list from canvas
  const syncLayers = useCallback(() => {
    if (!fabricRef.current) return;
    const objs = fabricRef.current.getObjects().slice().reverse();
    setLayersList(objs);
    setObjectRevision((rev) => rev + 1);
  }, []);

  const SERIALIZED_CUSTOM_PROPS = [
    'animation',
    'animationCategory',
    'animationConfig',
    'animationSlots',
    '__scribeEffectId',
    '__scribeEffectIntensity',
    '__scribeFilterSliders',
    'paragraphSpacing',
    '__scribeOutlineType',
    '__scribeOutlineEnabled',
    '__scribeOutlineGlow',
    '__scribeOriginalText',
    '__scribeTextCaseMode',
    'splitByGrapheme',
    'strokeDashArray',
    'paintFirst',
    'isVectorIcon',
    'iconColor',
    'iconFill',
    'iconFillMode',
    'iconStrokeWidth',
    'isIconFillable',
    'shapeType',
    'isLineDivider',
    'name',
  ];

  // Push history snapshot
  const pushHistorySnapshot = useCallback(() => {
    if (isUndoRedoRef.current || !fabricRef.current) return;
    const jsonStr = JSON.stringify(
      (fabricRef.current as any).toJSON(SERIALIZED_CUSTOM_PROPS)
    );
    const hist = historyRef.current;
    const currIdx = historyIndexRef.current;

    if (currIdx >= 0 && hist[currIdx] === jsonStr) return;

    const trimmed = hist.slice(0, currIdx + 1);
    trimmed.push(jsonStr);
    if (trimmed.length > 30) trimmed.shift();

    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
  }, []);

  // Save current project and pages state to IndexedDB
  const autoSaveToDB = useCallback(async () => {
    if (!fabricRef.current) return;
    setSaveStatus('saving');

    const canvas = fabricRef.current;
    const currentJson = JSON.stringify(
      (canvas as any).toJSON(SERIALIZED_CUSTOM_PROPS)
    );
    let currentThumb = project.thumbnail;

    try {
      currentThumb = canvas.toDataURL({
        multiplier: 0.5,
        format: 'png',
      });
    } catch {
      // ignore taint
    }

    // Update active page in pages array
    const updatedPages = pages.map((p) =>
      p.id === currentPageId
        ? { ...p, fabricJson: currentJson, thumbnail: currentThumb }
        : p
    );

    setPages(updatedPages);

    const updatedProject: ProjectRecord = {
      ...project,
      name: documentTitle,
      width: canvasDimensions.width,
      height: canvasDimensions.height,
      fabricJson: currentJson,
      thumbnail: currentThumb,
      pages: updatedPages,
      audioTrack: audioTrackRef.current ?? undefined,
      updatedAt: Date.now(),
    };

    try {
      await saveProject(updatedProject);
      onProjectUpdated(updatedProject);
      setSaveStatus('saved');
    } catch (err) {
      console.warn('Auto-save error:', err);
      setSaveStatus('saved');
    }
  }, [canvasDimensions, currentPageId, documentTitle, onProjectUpdated, pages, project]);

  const getLiveProjectSnapshot = useCallback((): ProjectRecord => {
    const canvas = fabricRef.current;
    if (!canvas) return project;

    const currentJson = JSON.stringify(
      (canvas as any).toJSON(SERIALIZED_CUSTOM_PROPS)
    );
    let currentThumb = project.thumbnail;
    try {
      currentThumb = canvas.toDataURL({
        multiplier: 0.45,
        format: 'png',
      });
    } catch {
      // ignore tainted canvas thumbnail fallback
    }

    const updatedPages = pages.map((p) =>
      p.id === currentPageId
        ? { ...p, fabricJson: currentJson, thumbnail: currentThumb }
        : p
    );

    return {
      ...project,
      name: documentTitle,
      width: canvasDimensions.width,
      height: canvasDimensions.height,
      fabricJson: currentJson,
      thumbnail: currentThumb,
      pages: updatedPages,
      audioTrack: audioTrackRef.current ?? undefined,
      updatedAt: Date.now(),
    };
  }, [canvasDimensions, currentPageId, documentTitle, pages, project]);

  const handleOpenShareTemplateModal = useCallback(
    async (snapshotOverride?: ProjectRecord, savedFilenameOverride?: string) => {
      if (snapshotOverride && savedFilenameOverride) {
        setShareSnapshotProject(snapshotOverride);
        setShareSavedFilename(savedFilenameOverride);
        setIsPublishModalOpen(true);
        return;
      }
      const liveSnapshot = getLiveProjectSnapshot();
      const { filename } = await saveTemplateLocallyAndDownload(
        liveSnapshot,
        assets,
        customFonts
      );
      setTemplateLibraryRevision((rev) => rev + 1);
      setShareSnapshotProject(liveSnapshot);
      setShareSavedFilename(filename);
      setIsPublishModalOpen(true);
    },
    [assets, customFonts, getLiveProjectSnapshot]
  );

  // Initial Fabric Canvas Mount
  useEffect(() => {
    if (!canvasElRef.current) return;
    installFabricParagraphSpacingPatch();

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: canvasDimensions.width,
      height: canvasDimensions.height,
      backgroundColor: canvasBgColor,
      preserveObjectStacking: true,
      selection: true,
    });

    fabricRef.current = canvas;

    // Load active page JSON
    const activePage = pages.find((p) => p.id === currentPageId);
    const pageJson = activePage ? activePage.fabricJson : project.fabricJson;

    if (pageJson) {
      try {
        const parsed = JSON.parse(pageJson);
        canvas.loadFromJSON(parsed).then(() => {
          canvas.renderAll();
          syncLayers();
          syncBgImageState(canvas);
          pushHistorySnapshot();
          void syncCanvasProjectFonts(canvas);
        });
      } catch (e) {
        console.warn('Error loading canvas JSON:', e);
        pushHistorySnapshot();
      }
    } else {
      pushHistorySnapshot();
    }

    // Event listeners
    const handleSelection = () => {
      const active = canvas.getActiveObject();
      setSelectedObject(active || null);
      syncLayers();
    };

    const handleModified = () => {
      pushHistorySnapshot();
      autoSaveToDB();
      syncLayers();
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
      syncLayers();
    });
    canvas.on('object:modified', handleModified);
    canvas.on('object:added', handleModified);
    canvas.on('object:removed', handleModified);

    // Initial Zoom fitting (fit both width and height cleanly within viewport)
    const container = viewportRef.current;
    const availW = container ? Math.max(320, container.clientWidth - 120) : 760;
    const availH = container ? Math.max(280, container.clientHeight - 100) : 560;
    const initialZoom = Math.max(
      0.15,
      Math.min(0.95, Math.min(availW / canvasDimensions.width, availH / canvasDimensions.height))
    );
    canvas.setDimensions({
      width: canvasDimensions.width * initialZoom,
      height: canvasDimensions.height * initialZoom,
    });
    canvas.setZoom(initialZoom);
    setZoomLevel(initialZoom);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [canvasDimensions.width, canvasDimensions.height]);

  // Page-wide Play/Pause motion preview controller
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (!isPlayingPreview) {
      stopCanvasPreview(canvas);
      return;
    }
    const stop = playCanvasPreview(canvas, () => {
      const hasInfinitePassive = canvas.getObjects().some((o) => {
        const slots = normalizeAnimationSlots(o);
        return Boolean(slots.passive && !slots.out);
      });
      if (!hasInfinitePassive) {
        setIsPlayingPreview(false);
      }
    });
    return () => {
      stop();
    };
  }, [isPlayingPreview]);

  // Undo / Redo Handlers
  const handleUndo = async () => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    isUndoRedoRef.current = true;
    setAppliedBrandTheme(null);
    historyIndexRef.current -= 1;
    const targetJson = historyRef.current[historyIndexRef.current];
    if (targetJson) {
      await canvas.loadFromJSON(JSON.parse(targetJson));
      canvas.renderAll();
      setSelectedObject(canvas.getActiveObject() || null);
      syncLayers();
      syncBgImageState(canvas);
      autoSaveToDB();
    }
    isUndoRedoRef.current = false;
  };

  const handleRedo = async () => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoRef.current = true;
    setAppliedBrandTheme(null);
    historyIndexRef.current += 1;
    const targetJson = historyRef.current[historyIndexRef.current];
    if (targetJson) {
      await canvas.loadFromJSON(JSON.parse(targetJson));
      canvas.renderAll();
      setSelectedObject(canvas.getActiveObject() || null);
      syncLayers();
      syncBgImageState(canvas);
      autoSaveToDB();
    }
    isUndoRedoRef.current = false;
  };

  // Zoom controls
  const handleZoomChange = (newZoom: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const clamped = Math.max(0.15, Math.min(3.5, Math.round(newZoom * 100) / 100));
    setZoomLevel(clamped);
    canvas.setDimensions({
      width: canvasDimensions.width * clamped,
      height: canvasDimensions.height * clamped,
    });
    canvas.setZoom(clamped);
    canvas.renderAll();
  };

  const handleFitToScreen = () => {
    const container = viewportRef.current;
    const availW = container ? container.clientWidth - 140 : 840;
    const availH = container ? container.clientHeight - 140 : 600;
    const fitZoom = Math.max(0.2, Math.min(1.2, Math.min(availW / canvasDimensions.width, availH / canvasDimensions.height)));
    handleZoomChange(fitZoom);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleResetView = () => {
    handleFitToScreen();
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoom100 = () => {
    handleZoomChange(1.0);
  };

  // Resize Canvas (preserving current objects & re-covering any background image cleanly)
  const handleResizeCanvas = (newWidth: number, newHeight: number) => {
    const canvas = fabricRef.current;
    if (canvas) {
      if (canvas.backgroundImage && canvas.backgroundImage instanceof fabric.FabricImage) {
        const bgImg = canvas.backgroundImage;
        const { scale, left, top } = computeCoverBackgroundTransform(
          bgImg.width || 1,
          bgImg.height || 1,
          newWidth,
          newHeight
        );
        bgImg.set({
          originX: 'center',
          originY: 'center',
          left,
          top,
          scaleX: scale,
          scaleY: scale,
        });
      }
      const currentJson = JSON.stringify(
        (canvas as any).toJSON(SERIALIZED_CUSTOM_PROPS)
      );
      setPages((prev) =>
        prev.map((p) => (p.id === currentPageId ? { ...p, fabricJson: currentJson } : p))
      );
      canvas.setDimensions({
        width: newWidth * zoomLevel,
        height: newHeight * zoomLevel,
      });
      canvas.renderAll();
    }
    setCanvasDimensions({ width: newWidth, height: newHeight });
  };

  // Page Operations
  const handleSelectPage = async (pageId: string, currentPagesList?: ProjectPageRecord[]) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const pagesList = currentPagesList || pages;

    // 1. Save current page state
    const currentJson = JSON.stringify(
      (canvas as any).toJSON(SERIALIZED_CUSTOM_PROPS)
    );
    let thumb = project.thumbnail;
    try {
      thumb = canvas.toDataURL({ multiplier: 0.5, format: 'png' });
    } catch {
      // ignore
    }

    const updatedPages = pagesList.map((p) =>
      p.id === currentPageId ? { ...p, fabricJson: currentJson, thumbnail: thumb } : p
    );
    setPages(updatedPages);

    // 2. Load target page
    setCurrentPageId(pageId);
    const target = updatedPages.find((p) => p.id === pageId);
    if (target?.fabricJson) {
      try {
        await canvas.loadFromJSON(JSON.parse(target.fabricJson));
        canvas.renderAll();
        syncLayers();
        syncBgImageState(canvas);
        historyRef.current = [target.fabricJson];
        historyIndexRef.current = 0;
        void syncCanvasProjectFonts(canvas);
      } catch (err) {
        console.warn('Error switching page:', err);
      }
    }
  };

  const handleAddPage = () => {
    const newPageNumber = pages.length + 1;
    const newPage: ProjectPageRecord = {
      id: `page_${Date.now()}`,
      name: `Page ${newPageNumber}`,
      fabricJson: JSON.stringify({ version: '6.0.0', objects: [] }),
      thumbnail: '',
    };
    const updated = [...pages, newPage];
    setPages(updated);
    handleSelectPage(newPage.id, updated);
  };

  const handleDuplicatePage = (pageId?: string) => {
    const idToDup = pageId || currentPageId;
    const target = pages.find((p) => p.id === idToDup);
    if (!target) return;

    const duplicated: ProjectPageRecord = {
      id: `page_${Date.now()}`,
      name: `${target.name} (Copy)`,
      fabricJson: target.fabricJson,
      thumbnail: target.thumbnail,
    };

    const targetIdx = pages.findIndex((p) => p.id === idToDup);
    const nextPages = [...pages];
    nextPages.splice(targetIdx + 1, 0, duplicated);
    setPages(nextPages);
    handleSelectPage(duplicated.id, nextPages);
  };

  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) return;
    const remaining = pages.filter((p) => p.id !== pageId);
    setPages(remaining);
    if (currentPageId === pageId) {
      handleSelectPage(remaining[0].id);
    }
  };

  // Canvas Object Adders
  const handleAddText = (
    type: TextPresetId,
    customText?: string,
    fontFamilyOverride?: string
  ) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    let fontSize = 36;
    let fontWeight: string = 'normal';
    let textStr = customText || 'Heading';
    let fontFamily = fontFamilyOverride || 'Inter';

    if (type === 'title') {
      fontSize = 72;
      fontWeight = 'bold';
      textStr = customText || 'Title';
      fontFamily = fontFamilyOverride || 'Space Grotesk';
    } else if (type === 'heading-1' || type === 'heading') {
      fontSize = 56;
      fontWeight = 'bold';
      textStr = customText || 'Heading 1';
      fontFamily = fontFamilyOverride || 'Space Grotesk';
    } else if (type === 'heading-2' || type === 'subheading') {
      fontSize = 40;
      fontWeight = '600';
      textStr = customText || 'Heading 2';
      fontFamily = fontFamilyOverride || 'Inter';
    } else if (type === 'heading-3') {
      fontSize = 28;
      fontWeight = '600';
      textStr = customText || 'Heading 3';
      fontFamily = fontFamilyOverride || 'Inter';
    } else if (type === 'body') {
      fontSize = 18;
      fontWeight = 'normal';
      textStr = customText || 'Body';
      fontFamily = fontFamilyOverride || 'Inter';
    } else if (type === 'detail' || type === 'label') {
      fontSize = 13;
      fontWeight = '500';
      textStr = customText || 'Detail';
      fontFamily = fontFamilyOverride || 'Inter';
    }

    const text = new fabric.Textbox(textStr, {
      left: canvasDimensions.width / 2 - 140,
      top: canvasDimensions.height / 2 - 40,
      fontSize,
      fontWeight,
      fontFamily,
      fill: canvasBgColor === '#ffffff' ? '#08080a' : '#ffffff',
      width: 320,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    syncLayers();
    pushHistorySnapshot();
    autoSaveToDB();

    void loadAndRefreshFont(fontFamily);
  };

  const handleAddShape = (shapeType: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const defaultFill = canvasBgColor === '#ffffff' ? '#0a0a0c' : '#ffffff';
    const obj = createFabricShape(shapeType, {
      canvasWidth: canvasDimensions.width,
      canvasHeight: canvasDimensions.height,
      fill: defaultFill,
    });

    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    syncLayers();
    pushHistorySnapshot();
    autoSaveToDB();
  };

  const handleAddImageFromUrl = (
    url: string,
    name?: string,
    dropCoords?: { left: number; top: number }
  ) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const img = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      const fImg = new fabric.FabricImage(img, {
        originX: 'center',
        originY: 'center',
        left: dropCoords?.left ?? canvasDimensions.width / 2,
        top: dropCoords?.top ?? canvasDimensions.height / 2,
      });
      const maxDim = Math.min(440, Math.round(canvasDimensions.width * 0.65));
      if (fImg.width && fImg.width > maxDim) {
        fImg.scaleToWidth(maxDim);
      }
      if (name) (fImg as any).name = name;

      canvas.add(fImg);
      canvas.setActiveObject(fImg);
      canvas.renderAll();
      syncLayers();
      pushHistorySnapshot();
      autoSaveToDB();
    };
    img.src = url;
  };

  const isFabricIconChildFillable = (child: fabric.FabricObject): boolean => {
    if (typeof (child as any).isIconFillable === 'boolean') {
      return (child as any).isIconFillable;
    }
    const t = (child.type || '').toLowerCase();
    if (t === 'circle' || t === 'ellipse' || t === 'rect' || t === 'polygon') {
      return true;
    }
    if (t === 'line' || t === 'polyline') {
      return false;
    }
    const cmds = (child as any).path as Array<Array<string | number>> | undefined;
    if (Array.isArray(cmds) && cmds.length > 0) {
      let startX = 0;
      let startY = 0;
      let endX = 0;
      let endY = 0;
      let segments = 0;
      for (const cmd of cmds) {
        const op = String(cmd[0] || '').toUpperCase();
        if (op === 'Z') return true;
        if (op === 'M' && cmd.length >= 3) {
          startX = Number(cmd[1]);
          startY = Number(cmd[2]);
          endX = startX;
          endY = startY;
        } else if (cmd.length >= 3) {
          endX = Number(cmd[cmd.length - 2]);
          endY = Number(cmd[cmd.length - 1]);
          segments++;
        }
      }
      if (segments >= 2 && Math.hypot(endX - startX, endY - startY) <= 1.5) {
        return true;
      }
      return false;
    }
    return false;
  };

  const handleAddSvgString = async (
    svgStr: string,
    meta?: {
      name?: string;
      color?: string;
      fill?: string;
      fillMode?: IconFillMode;
      strokeWidth?: number;
    }
  ) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    try {
      const { objects } = await fabric.loadSVGFromString(svgStr);
      const validObjects = (objects || []).filter(Boolean) as fabric.FabricObject[];
      if (validObjects.length > 0) {
        const fillMode: IconFillMode =
          meta?.fillMode ??
          (meta?.fill && meta.fill !== 'none' && meta.fill !== 'transparent'
            ? 'solid'
            : 'none');
        const activeColor = meta?.color || '#ffffff';
        const effectiveFill = fillMode === 'none' ? 'none' : meta?.fill || activeColor;

        validObjects.forEach((child) => {
          const canFill = isFabricIconChildFillable(child);
          (child as any).isIconFillable = canFill;
          child.set({
            strokeUniform: true,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            fill: canFill && fillMode !== 'none' ? effectiveFill : 'none',
            fillOpacity: canFill && fillMode === 'soft' ? 0.28 : 1,
          });
        });

        const group = new fabric.Group(validObjects, {
          originX: 'center',
          originY: 'center',
          left: canvasDimensions.width / 2,
          top: canvasDimensions.height / 2,
          strokeUniform: true,
        });
        (group as any).isVectorIcon = true;
        (group as any).iconColor = activeColor;
        (group as any).iconFill = effectiveFill;
        (group as any).iconFillMode = fillMode;
        (group as any).iconStrokeWidth = meta?.strokeWidth ?? 2;
        if (meta?.name) (group as any).name = meta.name;

        group.scaleToWidth(120);
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.renderAll();
        syncLayers();
        pushHistorySnapshot();
        autoSaveToDB();
      }
    } catch (err) {
      console.warn('Error adding SVG:', err);
    }
  };

  // Selected Object Mutations (supports shapes AND scalable vector icon groups)
  const handleUpdateSelectedProps = (props: Partial<any>) => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;

    if ((active as any).isVectorIcon && active instanceof fabric.Group) {
      const children = active.getObjects();
      const prevColor = String((active as any).iconColor || '#ffffff');
      const prevFill = String((active as any).iconFill || 'none');
      let currentFillMode: IconFillMode =
        (active as any).iconFillMode ||
        (prevFill !== 'none' && prevFill !== 'transparent' ? 'solid' : 'none');

      // Keep fill synced with icon color when Fill mode is active and hasn't been customized away
      const isFillLinkedToColor =
        currentFillMode !== 'none' &&
        (prevFill === 'none' ||
          prevFill === 'transparent' ||
          prevFill.toLowerCase() === prevColor.toLowerCase());

      if (props.iconFillMode !== undefined) {
        currentFillMode = props.iconFillMode as IconFillMode;
        (active as any).iconFillMode = currentFillMode;
        const nextFillColor = currentFillMode === 'none' ? 'none' : ((active as any).iconColor || '#ffffff');
        (active as any).iconFill = nextFillColor;
        children.forEach((c) => {
          const canFill = isFabricIconChildFillable(c);
          (c as any).isIconFillable = canFill;
          c.set({
            fill: canFill && currentFillMode !== 'none' ? nextFillColor : 'none',
            fillOpacity: canFill && currentFillMode === 'soft' ? 0.28 : 1,
          });
        });
      }

      if (props.stroke !== undefined) {
        (active as any).iconColor = props.stroke;
        children.forEach((c) => {
          if (c.stroke && c.stroke !== 'none' && c.stroke !== 'transparent') {
            c.set({ stroke: props.stroke, strokeUniform: true });
          } else if (!c.stroke && c.fill && c.fill !== 'none' && c.fill !== 'transparent') {
            c.set({ fill: props.stroke });
          }
        });
        if (isFillLinkedToColor && props.fill === undefined) {
          (active as any).iconFill = props.stroke;
          children.forEach((c) => {
            const canFill = isFabricIconChildFillable(c);
            (c as any).isIconFillable = canFill;
            c.set({
              fill: canFill ? props.stroke : 'none',
              fillOpacity: canFill && currentFillMode === 'soft' ? 0.28 : 1,
            });
          });
        }
      }

      if (props.fill !== undefined) {
        if (props.fill === 'none' || props.fill === 'transparent') {
          currentFillMode = 'none';
          (active as any).iconFillMode = 'none';
          (active as any).iconFill = 'none';
          children.forEach((c) => {
            c.set({ fill: 'none', fillOpacity: 1 });
          });
        } else {
          if (currentFillMode === 'none') {
            currentFillMode = 'solid';
            (active as any).iconFillMode = 'solid';
          }
          (active as any).iconFill = props.fill;
          children.forEach((c) => {
            const canFill = isFabricIconChildFillable(c);
            (c as any).isIconFillable = canFill;
            c.set({
              fill: canFill ? props.fill : 'none',
              fillOpacity: canFill && currentFillMode === 'soft' ? 0.28 : 1,
            });
          });
        }
      }

      if (props.strokeWidth !== undefined) {
        (active as any).iconStrokeWidth = props.strokeWidth;
        children.forEach((c) => {
          c.set({ strokeWidth: props.strokeWidth, strokeUniform: true });
          if (props.strokeWidth > 0 && (!c.stroke || c.stroke === 'none')) {
            c.set({ stroke: (active as any).iconColor || '#ffffff' });
          }
        });
      }

      const {
        fill: _f,
        stroke: _s,
        strokeWidth: _sw,
        iconFillMode: _fm,
        ...rest
      } = props;
      if (Object.keys(rest).length > 0) {
        active.set(rest);
      }
      active.set('dirty', true);
    } else {
      active.set({ ...props, strokeUniform: true });
      if (typeof props.fontFamily === 'string' && props.fontFamily.trim()) {
        if (typeof (active as any).initDimensions === 'function') {
          (active as any).initDimensions();
        }
        void loadAndRefreshFont(props.fontFamily);
      } else if (
        props.paragraphSpacing !== undefined ||
        props.lineHeight !== undefined ||
        props.charSpacing !== undefined ||
        props.fontSize !== undefined ||
        props.text !== undefined ||
        props.splitByGrapheme !== undefined
      ) {
        if (typeof (active as any).initDimensions === 'function') {
          (active as any).initDimensions();
        }
        active.set('dirty', true);
      }
    }

    active.setCoords();
    canvas.renderAll();
    syncLayers();
    autoSaveToDB();
  };

  const handleDuplicateSelected = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;

    active.clone().then((cloned: fabric.FabricObject) => {
      cloned.set({
        left: (active.left || 0) + 20,
        top: (active.top || 0) + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      syncLayers();
      pushHistorySnapshot();
      autoSaveToDB();
    });
  };

  const handleDeleteSelected = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;

    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.renderAll();
    syncLayers();
    pushHistorySnapshot();
    autoSaveToDB();
  };

  const handleBringForward = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.bringObjectForward(active);
    canvas.renderAll();
    syncLayers();
  };

  const handleSendBackward = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.sendObjectBackwards(active);
    canvas.renderAll();
    syncLayers();
  };

  const handleToggleLock = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;

    const isLocked = !active.lockMovementX;
    active.set({
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      lockRotation: isLocked,
      lockScalingX: isLocked,
      lockScalingY: isLocked,
    });
    canvas.renderAll();
    syncLayers();
  };

  const handleFlipX = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set('flipX', !active.flipX);
    canvas.renderAll();
    syncLayers();
    pushHistorySnapshot();
    autoSaveToDB();
  };

  const handleFlipY = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set('flipY', !active.flipY);
    canvas.renderAll();
    syncLayers();
    pushHistorySnapshot();
    autoSaveToDB();
  };

  const handleCenterAlign = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.centerObject(active);
    active.setCoords();
    canvas.renderAll();
    syncLayers();
    pushHistorySnapshot();
    autoSaveToDB();
  };

  // Multi-Type Files Upload Routing (Fonts -> Text/Typography DB & document.fonts; Images & Audio -> Files DB)
  const handleUploadFiles = async (
    incomingFiles: File[]
  ): Promise<{ images: number; audio: number; fonts: string[]; errors: string[] }> => {
    let images = 0;
    let audio = 0;
    const fonts: string[] = [];
    const errors: string[] = [];

    for (const file of incomingFiles) {
      const category = classifyUploadedFile(file);
      if (category === 'unsupported') {
        errors.push(`Unsupported file type: "${file.name}".`);
        continue;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);

        if (category === 'font') {
          const fontName = deriveCustomFontFamilyName(file.name);
          const format = parseCustomFontFormat(file.name);
          const fontFace = new FontFace(fontName, `url(${dataUrl})`);
          await fontFace.load();
          document.fonts.add(fontFace);

          const fontRecord: CustomFontRecord = {
            id: `font_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: fontName,
            fontDataUrl: dataUrl,
            format,
            createdAt: Date.now(),
          };
          await saveCustomFont(fontRecord);
          onRefreshFonts();

          if (typeof (fabric.util as any)?.clearFabricFontCache === 'function') {
            (fabric.util as any).clearFabricFontCache(fontName);
          }

          const canvas = fabricRef.current;
          const active = canvas?.getActiveObject();
          if (
            canvas &&
            active &&
            (active instanceof fabric.Textbox ||
              active.type === 'textbox' ||
              active.type === 'text' ||
              active.type === 'i-text')
          ) {
            handleUpdateSelectedProps({ fontFamily: fontName });
          }

          fonts.push(fontName);
        } else if (category === 'audio') {
          const asset: AssetRecord = {
            id: `asset_audio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            type: 'audio',
            url: dataUrl,
            size: file.size,
            mimeType: file.type || 'audio/mpeg',
            createdAt: Date.now(),
            isFavorite: false,
            category: 'files',
          };
          await saveAsset(asset);
          onRefreshAssets();
          audio += 1;
        } else if (category === 'image') {
          const dimensions = await extractImageDimensionsFromUrl(dataUrl);
          const asset: AssetRecord = {
            id: `asset_img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            type: 'image',
            url: dataUrl,
            size: file.size,
            mimeType: file.type || 'image/png',
            dimensions,
            createdAt: Date.now(),
            isFavorite: false,
            category: 'files',
          };
          await saveAsset(asset);
          onRefreshAssets();
          images += 1;
        }
      } catch {
        errors.push(`Could not load "${file.name}". Verify the file is valid.`);
      }
    }

    return { images, audio, fonts, errors };
  };

  const handleDeleteAsset = async (assetId: string) => {
    await deleteAsset(assetId);
    if (audioTrackRef.current?.id === assetId) {
      audioTrackRef.current = null;
      setAudioTrack(null);
      autoSaveToDB();
    }
    onRefreshAssets();
  };

  const handleAttachAudioAsset = (asset: AssetRecord) => {
    const nextTrack = { id: asset.id, name: asset.name, url: asset.url };
    audioTrackRef.current = nextTrack;
    setAudioTrack(nextTrack);
    setIsTimelineOpen(true);
    autoSaveToDB();
  };

  const handleRemoveAudioTrack = () => {
    audioTrackRef.current = null;
    setAudioTrack(null);
    autoSaveToDB();
  };

  // Apply or Toggle Brand Theme Palette across project elements (Undoable via Ctrl+Z or clicking card again)
  const handleApplyOrToggleBrandTheme = (brand: BrandRecord) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (appliedBrandTheme && appliedBrandTheme.brandId === brand.id) {
      restoreBrandThemeSnapshots(appliedBrandTheme.snapshots);
      setAppliedBrandTheme(null);
      canvas.renderAll();
      syncLayers();
      pushHistorySnapshot();
      autoSaveToDB();
      return;
    }

    const objects = canvas.getObjects();
    const snapshots = applyBrandThemeToObjects(objects, brand, canvasBgColor);
    if (snapshots.length > 0) {
      setAppliedBrandTheme({ brandId: brand.id, snapshots });
      canvas.renderAll();
      syncLayers();
      pushHistorySnapshot();
      autoSaveToDB();
    }
  };

  // Apply Individual Brand Color Swatch strictly to active selected object (never canvas background)
  const handleApplyBrandSwatchColor = (color: string): boolean => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return false;

    const patch = getSwatchUpdatePropsForObject(active, color);
    handleUpdateSelectedProps(patch);
    setAppliedBrandTheme(null);
    pushHistorySnapshot();
    return true;
  };

  // Client-Side AI Background Remover Trigger
  const handleTriggerBgRemoval = async () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || !(active instanceof fabric.FabricImage)) return;

    const tempCanvas = document.createElement('canvas');
    const el = active.getElement() as HTMLImageElement;
    tempCanvas.width = el.naturalWidth || active.width || 800;
    tempCanvas.height = el.naturalHeight || active.height || 800;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(el, 0, 0);

    const cutoutCanvas = removeBackgroundCanvas(tempCanvas, 38, 2);
    const cutoutData = cutoutCanvas.toDataURL('image/png');
    const newImg = new Image();
    newImg.onload = () => {
      active.setElement(newImg);
      canvas.renderAll();
      syncLayers();
      autoSaveToDB();
    };
    newImg.src = cutoutData;
  };

  // Client-Side AI Auto Enhance
  const handleTriggerAutoEnhance = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || !(active instanceof fabric.FabricImage)) return;

    active.filters = [
      new fabric.filters.Contrast({ contrast: 0.15 }),
      new fabric.filters.Brightness({ brightness: 0.05 }),
    ];
    active.applyFilters();
    canvas.renderAll();
    autoSaveToDB();
  };

  // Set selected image as full-bleed Cover-fit artboard background
  const handleSetImageAsBackground = async (imgObj: fabric.FabricImage) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const bgClone = await imgObj.clone();
    const { scale, left, top } = computeCoverBackgroundTransform(
      bgClone.width || 1,
      bgClone.height || 1,
      canvasDimensions.width,
      canvasDimensions.height
    );

    bgClone.set({
      originX: 'center',
      originY: 'center',
      left,
      top,
      scaleX: scale,
      scaleY: scale,
      angle: 0,
      clipPath: undefined,
      selectable: false,
      evented: false,
    });

    canvas.backgroundImage = bgClone;
    canvas.remove(imgObj);
    canvas.discardActiveObject();
    setSelectedObject(null);
    syncBgImageState(canvas);
    canvas.renderAll();
    syncLayers();
    pushHistorySnapshot();
    autoSaveToDB();
  };

  const handleClearCanvasBgImage = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.backgroundImage = undefined;
    setCanvasBgImageUrl(null);
    canvas.renderAll();
    pushHistorySnapshot();
    autoSaveToDB();
  };

  // Helper to composite layout grid onto exported raster Data URL if enabled
  const maybeCompositeGridOnDataUrl = async (
    baseDataUrl: string,
    format: 'png' | 'jpg' | 'webp'
  ): Promise<string> => {
    if (!gridConfig.visible || !gridConfig.includeInExport) return baseDataUrl;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const outCanvas = document.createElement('canvas');
        outCanvas.width = img.width;
        outCanvas.height = img.height;
        const ctx = outCanvas.getContext('2d');
        if (!ctx) {
          resolve(baseDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0);
        ctx.save();
        ctx.strokeStyle = gridConfig.color;
        ctx.fillStyle = gridConfig.color;

        const w = outCanvas.width;
        const h = outCanvas.height;
        const cols = Math.max(1, gridConfig.columns);
        const rows = Math.max(1, gridConfig.rows);
        const colW = w / cols;
        const rowH = h / rows;
        const showCols = gridConfig.axisMode === 'both' || gridConfig.axisMode === 'vertical';
        const showRows = gridConfig.axisMode === 'both' || gridConfig.axisMode === 'horizontal';

        ctx.globalAlpha = gridConfig.opacity;
        ctx.lineWidth = Math.max(1, w / 800);
        ctx.beginPath();
        if (showCols) {
          if (cols > 1) {
            for (let c = 1; c < cols; c++) {
              const x = c * colW;
              ctx.moveTo(x, 0);
              ctx.lineTo(x, h);
            }
          } else {
            ctx.moveTo(1, 0);
            ctx.lineTo(1, h);
            ctx.moveTo(w - 1, 0);
            ctx.lineTo(w - 1, h);
          }
        }
        if (showRows) {
          if (rows > 1) {
            for (let r = 1; r < rows; r++) {
              const y = r * rowH;
              ctx.moveTo(0, y);
              ctx.lineTo(w, y);
            }
          } else {
            ctx.moveTo(0, 1);
            ctx.lineTo(w, 1);
            ctx.moveTo(0, h - 1);
            ctx.lineTo(w, h - 1);
          }
        }
        ctx.stroke();
        ctx.restore();
        resolve(
          outCanvas.toDataURL(
            format === 'jpg' ? 'image/jpeg' : `image/${format}`,
            0.95
          )
        );
      };
      img.src = baseDataUrl;
    });
  };

  // Export Callbacks
  const handleExportPageAsDataUrl = async (
    pageId: string,
    format: 'png' | 'jpg' | 'webp',
    multiplier: number
  ): Promise<string> => {
    const canvas = fabricRef.current;
    if (!canvas) throw new Error('Canvas not initialized');

    if (pageId === currentPageId) {
      const rawUrl = canvas.toDataURL({
        format: format === 'jpg' ? 'jpeg' : format,
        multiplier,
        quality: 0.95,
      });
      return maybeCompositeGridOnDataUrl(rawUrl, format);
    }

    // Render non-active page via offscreen fabric canvas
    const page = pages.find((p) => p.id === pageId);
    if (!page) throw new Error('Page not found');

    const offscreenEl = document.createElement('canvas');
    const offCanvas = new fabric.Canvas(offscreenEl, {
      width: canvasDimensions.width,
      height: canvasDimensions.height,
    });
    await offCanvas.loadFromJSON(JSON.parse(page.fabricJson));
    const dataUrl = offCanvas.toDataURL({
      format: format === 'jpg' ? 'jpeg' : format,
      multiplier,
      quality: 0.95,
    });
    offCanvas.dispose();
    return maybeCompositeGridOnDataUrl(dataUrl, format);
  };

  const handleExportPageAsSvg = async (pageId: string): Promise<string> => {
    const canvas = fabricRef.current;
    if (!canvas) throw new Error('Canvas not initialized');

    let svgStr = '';
    if (pageId === currentPageId) {
      svgStr = canvas.toSVG();
    } else {
      const page = pages.find((p) => p.id === pageId);
      if (!page) throw new Error('Page not found');
      const offscreenEl = document.createElement('canvas');
      const offCanvas = new fabric.Canvas(offscreenEl, {
        width: canvasDimensions.width,
        height: canvasDimensions.height,
      });
      await offCanvas.loadFromJSON(JSON.parse(page.fabricJson));
      svgStr = offCanvas.toSVG();
      offCanvas.dispose();
    }

    if (gridConfig.visible && gridConfig.includeInExport) {
      const w = canvasDimensions.width;
      const h = canvasDimensions.height;
      const cols = Math.max(1, gridConfig.columns);
      const rows = Math.max(1, gridConfig.rows);
      const colW = w / cols;
      const rowH = h / rows;
      const showCols = gridConfig.axisMode === 'both' || gridConfig.axisMode === 'vertical';
      const showRows = gridConfig.axisMode === 'both' || gridConfig.axisMode === 'horizontal';
      const parts: string[] = [];

      if (showCols) {
        if (cols > 1) {
          for (let c = 1; c < cols; c++) {
            parts.push(`<line x1="${c * colW}" y1="0" x2="${c * colW}" y2="${h}" stroke="${gridConfig.color}" stroke-opacity="${gridConfig.opacity}" stroke-width="1" />`);
          }
        } else {
          parts.push(`<line x1="1" y1="0" x2="1" y2="${h}" stroke="${gridConfig.color}" stroke-opacity="${gridConfig.opacity}" stroke-width="1" />`);
          parts.push(`<line x1="${w - 1}" y1="0" x2="${w - 1}" y2="${h}" stroke="${gridConfig.color}" stroke-opacity="${gridConfig.opacity}" stroke-width="1" />`);
        }
      }
      if (showRows) {
        if (rows > 1) {
          for (let r = 1; r < rows; r++) {
            parts.push(`<line x1="0" y1="${r * rowH}" x2="${w}" y2="${r * rowH}" stroke="${gridConfig.color}" stroke-opacity="${gridConfig.opacity}" stroke-width="1" />`);
          }
        } else {
          parts.push(`<line x1="0" y1="1" x2="${w}" y2="1" stroke="${gridConfig.color}" stroke-opacity="${gridConfig.opacity}" stroke-width="1" />`);
          parts.push(`<line x1="0" y1="${h - 1}" x2="${w}" y2="${h - 1}" stroke="${gridConfig.color}" stroke-opacity="${gridConfig.opacity}" stroke-width="1" />`);
        }
      }
      svgStr = svgStr.replace('</svg>', `<g id="scribe-layout-grid">${parts.join('')}</g></svg>`);
    }

    return svgStr;
  };

  const handleCopyImageToClipboard = async (multiplier: number): Promise<boolean> => {
    const canvas = fabricRef.current;
    if (!canvas) return false;

    const rawDataUrl = canvas.toDataURL({ format: 'png', multiplier });
    const dataUrl = await maybeCompositeGridOnDataUrl(rawDataUrl, 'png');
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    if (navigator.clipboard && 'write' in navigator.clipboard) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    }
    return false;
  };

  // Ref-backed latest handlers so window keyboard/wheel/paste listeners never read stale state
  const latestActionRefs = useRef({
    zoomLevel,
    canvasWidth: canvasDimensions.width,
    canvasHeight: canvasDimensions.height,
    handleZoomChange,
    handleFitToScreen,
    handleDeleteSelected,
    handleUndo,
    handleRedo,
    handleDuplicateSelected,
    handleAddImageFromUrl,
    syncLayers,
  });
  latestActionRefs.current = {
    zoomLevel,
    canvasWidth: canvasDimensions.width,
    canvasHeight: canvasDimensions.height,
    handleZoomChange,
    handleFitToScreen,
    handleDeleteSelected,
    handleUndo,
    handleRedo,
    handleDuplicateSelected,
    handleAddImageFromUrl,
    syncLayers,
  };

  // Native Wheel Event Listener on Viewport (Non-passive to smoothly zoom or pan)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        const { zoomLevel: currZoom, handleZoomChange: setZoom } = latestActionRefs.current;
        setZoom(currZoom + delta);
      } else {
        // Smooth trackpad two-finger pan or wheel scroll
        setPanOffset((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Window-level Canvas Panning (tracks pointer smoothly even outside viewport or window)
  useEffect(() => {
    if (!isPanning) return;

    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const handleWindowPointerMove = (e: PointerEvent) => {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    };

    const stopPanning = () => {
      setIsPanning(false);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', stopPanning);
    window.addEventListener('pointercancel', stopPanning);
    window.addEventListener('blur', stopPanning);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', stopPanning);
      window.removeEventListener('pointercancel', stopPanning);
      window.removeEventListener('blur', stopPanning);
      document.body.style.userSelect = prevUserSelect;
    };
  }, [isPanning]);

  // Keyboard Shortcuts (Space pan, Undo/Redo, Zoom, Duplicate, Delete, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      const actions = latestActionRefs.current;
      const canvas = fabricRef.current;
      const activeObj = canvas?.getActiveObject() as any;

      const activeEl = document.activeElement as HTMLElement | null;
      const isFabricTextHiddenInput =
        Boolean(activeObj?.hiddenTextarea && activeEl === activeObj.hiddenTextarea) ||
        activeEl?.dataset?.fabric === 'hiddentextarea';

      const isDomInput =
        !isFabricTextHiddenInput &&
        (activeEl?.tagName === 'INPUT' ||
          activeEl?.tagName === 'TEXTAREA' ||
          activeEl?.tagName === 'SELECT' ||
          Boolean(activeEl?.isContentEditable));

      if (isDomInput) return;

      if (e.key === 'Escape') {
        if (activeObj?.isEditing && typeof activeObj.exitEditing === 'function') {
          e.preventDefault();
          activeObj.exitEditing();
          if (activeEl && activeEl === activeObj?.hiddenTextarea) {
            activeEl.blur();
          }
          canvas?.requestRenderAll();
          actions.syncLayers();
          return;
        }
        if (canvas && activeObj) {
          e.preventDefault();
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          setSelectedObject(null);
          actions.syncLayers();
          return;
        }
      }

      if (activeObj?.isEditing || isFabricTextHiddenInput) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsPanToolActive((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        actions.handleZoomChange(actions.zoomLevel + 0.1);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        actions.handleZoomChange(actions.zoomLevel - 0.1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        actions.handleFitToScreen();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObj) {
          e.preventDefault();
          actions.handleDeleteSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) actions.handleRedo();
        else actions.handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        actions.handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        actions.handleDuplicateSelected();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Global Clipboard Image Paste Listener (Ctrl+V / Cmd+V when not editing text)
  useEffect(() => {
    const handleWindowPaste = async (e: ClipboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      const activeEl = document.activeElement;
      const isDomInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable;
      if (isDomInput) return;

      const activeCanvasObj = fabricRef.current?.getActiveObject() as any;
      if (activeCanvasObj?.isEditing) return;

      const pastedFiles = extractImageFilesFromClipboard(e.clipboardData);
      if (pastedFiles.length === 0) return;

      e.preventDefault();
      const { canvasWidth: cw, canvasHeight: ch, handleAddImageFromUrl: insertImg } =
        latestActionRefs.current;
      for (let i = 0; i < pastedFiles.length; i++) {
        try {
          const dataUrl = await readImageFileAsDataUrl(pastedFiles[i]);
          const offset = i * 24;
          insertImg(dataUrl, pastedFiles[i].name || 'Pasted Image', {
            left: cw / 2 + offset,
            top: ch / 2 + offset,
          });
        } catch {
          // ignore unreadable clipboard item
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, []);

  return (
    <div
      data-testid="editor-workspace-shell"
      className="editor-workspace-shell flex-1 flex flex-col h-full overflow-hidden select-none relative"
    >
      {/* 1. TOP NAVBAR */}
      <EditorTopBar
        documentTitle={documentTitle}
        onUpdateTitle={(newTitle) => {
          setDocumentTitle(newTitle);
          autoSaveToDB();
        }}
        onNavigateHome={onBackToDashboard}
        onDuplicatePage={() => handleDuplicatePage()}
        onMovePage={() => {}}
        onStartNewFile={handleAddPage}
        onPrint={() => window.print()}
        showBleedMargins={showBleedMargins}
        onToggleBleedMargins={() => setShowBleedMargins(!showBleedMargins)}
        showRulersGuides={showRulersGuides}
        onToggleRulersGuides={() => setShowRulersGuides(!showRulersGuides)}
        onOpenPublishTemplate={() => void handleOpenShareTemplateModal()}
        canUndo={historyIndexRef.current > 0}
        canRedo={historyIndexRef.current < historyRef.current.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoomLevel={zoomLevel}
        onZoomIn={() => handleZoomChange(zoomLevel + 0.1)}
        onZoomOut={() => handleZoomChange(zoomLevel - 0.1)}
        onFitToScreen={handleFitToScreen}
        canvasWidth={canvasDimensions.width}
        canvasHeight={canvasDimensions.height}
        onResizeCanvas={handleResizeCanvas}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        saveStatus={saveStatus}
      />

      {/* 2. MIDDLE WORKSPACE AREA (Tool Drawer + Canvas Viewport + Layer Stack) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side Tool Panel & Expandable Drawer */}
        <EditorToolDrawer
          activeTab={activeDrawerTab}
          onSelectTab={(tab) => setActiveDrawerTab(tab)}
          selectedObject={selectedObject}
          objectRevision={objectRevision}
          onUpdateSelectedProps={handleUpdateSelectedProps}
          onAddText={handleAddText}
          onAddShape={handleAddShape}
          onAddImageFromUrl={handleAddImageFromUrl}
          onAddSvgString={handleAddSvgString}
          canvasBgColor={canvasBgColor}
          canvasBgImageUrl={canvasBgImageUrl}
          canvasWidth={canvasDimensions.width}
          canvasHeight={canvasDimensions.height}
          gridConfig={gridConfig}
          onChangeGridConfig={setGridConfig}
          onResizeCanvas={handleResizeCanvas}
          onChangeCanvasBgColor={(col) => {
            setCanvasBgColor(col);
            if (fabricRef.current) {
              fabricRef.current.backgroundImage = undefined;
              setCanvasBgImageUrl(null);
              fabricRef.current.backgroundColor = col;
              fabricRef.current.renderAll();
              autoSaveToDB();
            }
          }}
          onChangeCanvasBackground={(fill, solidFallbackHex) => {
            setCanvasBgColor(solidFallbackHex);
            if (fabricRef.current) {
              fabricRef.current.backgroundImage = undefined;
              setCanvasBgImageUrl(null);
              fabricRef.current.backgroundColor = fill;
              fabricRef.current.renderAll();
              pushHistorySnapshot();
              autoSaveToDB();
            }
          }}
          onClearCanvasBgImage={handleClearCanvasBgImage}
          onSetImageAsBackground={handleSetImageAsBackground}
          assets={assets}
          brands={brands}
          customFonts={customFonts}
          onUploadAsset={(file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (typeof ev.target?.result === 'string') {
                handleAddImageFromUrl(ev.target.result, file.name);
              }
            };
            reader.readAsDataURL(file);
          }}
          onUploadFiles={handleUploadFiles}
          onDeleteAsset={handleDeleteAsset}
          onAttachAudioAsset={handleAttachAudioAsset}
          activeAudioTrackId={audioTrack?.id || null}
          activeBrandId={appliedBrandTheme?.brandId || null}
          onApplyOrToggleBrandTheme={handleApplyOrToggleBrandTheme}
          onApplyBrandSwatchColor={handleApplyBrandSwatchColor}
          getLiveProjectSnapshot={getLiveProjectSnapshot}
          onOpenShareTemplateModal={handleOpenShareTemplateModal}
          templateLibraryRevision={templateLibraryRevision}
          onLoadTemplate={async (payload) => {
            const canvas = fabricRef.current;
            const parsed = JSON.parse(payload.fabricJson);
            const nextBg =
              payload.backgroundColor ||
              (typeof parsed?.background === 'string' ? parsed.background : undefined) ||
              (typeof parsed?.backgroundColor === 'string' ? parsed.backgroundColor : undefined) ||
              canvasBgColor;

            const targetW =
              typeof payload.width === 'number' && payload.width > 0
                ? payload.width
                : canvasDimensions.width;
            const targetH =
              typeof payload.height === 'number' && payload.height > 0
                ? payload.height
                : canvasDimensions.height;
            const dimensionsChanged =
              targetW !== canvasDimensions.width || targetH !== canvasDimensions.height;

            setDocumentTitle(payload.name);
            setCanvasBgColor(nextBg);

            const updatedPages = pages.map((p) =>
              p.id === currentPageId
                ? { ...p, fabricJson: payload.fabricJson }
                : p
            );
            setPages(updatedPages);

            if (dimensionsChanged) {
              setCanvasDimensions({ width: targetW, height: targetH });
              return;
            }

            if (!canvas) return;
            await canvas.loadFromJSON(parsed);
            if (!parsed.background && !parsed.backgroundColor) {
              canvas.backgroundColor = nextBg;
            }
            canvas.renderAll();
            syncLayers();
            syncBgImageState(canvas);
            pushHistorySnapshot();
            void syncCanvasProjectFonts(canvas);
            autoSaveToDB();
          }}
          onInsertTemplateAsNewPage={(payload) => {
            const newPage: ProjectPageRecord = {
              id: `page_${Date.now()}`,
              name: payload.name,
              fabricJson: payload.fabricJson,
              thumbnail: '',
            };
            const updated = [...pages, newPage];
            setPages(updated);
            void handleSelectPage(newPage.id, updated);
          }}
          onTriggerBgRemoval={handleTriggerBgRemoval}
          onTriggerAutoEnhance={handleTriggerAutoEnhance}
          onTriggerObjectEraser={() => {
            setActiveDrawerTab('quick-tools');
          }}
          onCommitCanvasChange={() => {
            syncLayers();
            pushHistorySnapshot();
            autoSaveToDB();
          }}
          onFlipX={handleFlipX}
          onFlipY={handleFlipY}
          onCenterAlign={handleCenterAlign}
        />

        {/* Center: Canvas Viewport & Floating Context Toolbar */}
        <main
          ref={viewportRef}
          data-testid="canvas-drop-viewport"
          onDragOver={(e) => {
            if (e.dataTransfer?.types?.includes('Files')) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              if (!isCanvasDragOver) setIsCanvasDragOver(true);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsCanvasDragOver(false);
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();
            setIsCanvasDragOver(false);
            const droppedFiles = extractImageFilesFromDrop(e.dataTransfer);
            if (droppedFiles.length === 0) return;

            const canvasRect = canvasElRef.current?.getBoundingClientRect();
            const baseDropCoords = canvasRect
              ? computeCanvasDropCoordinates(
                  e.clientX,
                  e.clientY,
                  canvasRect,
                  zoomLevel,
                  canvasDimensions.width,
                  canvasDimensions.height
                )
              : { left: canvasDimensions.width / 2, top: canvasDimensions.height / 2 };

            for (let i = 0; i < droppedFiles.length; i++) {
              try {
                const dataUrl = await readImageFileAsDataUrl(droppedFiles[i]);
                handleAddImageFromUrl(dataUrl, droppedFiles[i].name, {
                  left: Math.min(canvasDimensions.width, baseDropCoords.left + i * 24),
                  top: Math.min(canvasDimensions.height, baseDropCoords.top + i * 24),
                });
              } catch {
                // ignore unreadable dropped file
              }
            }
          }}
          onPointerDown={(e) => {
            if (e.button === 1 || ((isSpacePressed || isPanToolActive) && e.button === 0)) {
              e.preventDefault();
              setIsPanning(true);
              panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
            }
          }}
          style={{
            background: 'radial-gradient(circle at 50% 44%, #f7f8fb 0%, #eaedf2 100%)',
          }}
          className={`flex-1 overflow-hidden relative bg-[#eef0f4] select-none ${
            isPanning
              ? 'cursor-grabbing'
              : isSpacePressed || isPanToolActive
              ? 'cursor-grab'
              : 'cursor-default'
          }`}
        >
          {isCanvasDragOver && (
            <div className="pointer-events-none absolute inset-4 z-40 rounded-2xl border-2 border-dashed border-indigo-500/70 bg-indigo-500/[0.06] backdrop-blur-[1px] flex items-center justify-center">
              <div className="px-4 py-2 rounded-xl bg-[#0d0e12]/90 border border-white/20 text-xs font-semibold text-white shadow-xl">
                Drop image to insert at cursor
              </div>
            </div>
          )}
          {/* Floating Context Toolbar (Appears above selected object, z-35) */}
          <FloatingContextToolbar
            selectedObject={selectedObject}
            onUpdateProps={handleUpdateSelectedProps}
            onDuplicate={handleDuplicateSelected}
            onDelete={handleDeleteSelected}
            onBringForward={handleBringForward}
            onSendBackward={handleSendBackward}
            onToggleLock={handleToggleLock}
            onFlipX={handleFlipX}
            onFlipY={handleFlipY}
            onCenterAlign={handleCenterAlign}
            onTriggerBgRemoval={handleTriggerBgRemoval}
            availableFonts={allAvailableFonts}
          />

          {/* Fluid Pannable Artboard Container */}
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              transition: isPanning ? 'none' : 'transform 0.05s ease-out',
            }}
          >
            {/* Artboard Frame & Canvas Container */}
            <div
              data-testid="artboard-frame"
              className="relative transition-[box-shadow,width,height] duration-150 rounded-sm flex items-center justify-center pointer-events-auto"
              style={{
                width: canvasDimensions.width * zoomLevel,
                height: canvasDimensions.height * zoomLevel,
                outline: '1px solid rgba(15, 23, 42, 0.14)',
                boxShadow:
                  '0 22px 60px -12px rgba(15, 23, 42, 0.28), 0 8px 24px -6px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.7), 0 0 42px 6px rgba(255, 255, 255, 0.55)',
              }}
            >
              {/* Fabric HTML5 Canvas Target (isolated wrapper so Fabric DOM mutations never conflict with React overlays) */}
              <div className="relative z-10">
                <canvas ref={canvasElRef} />
              </div>

              {/* Artboard Overlays (Bleed, Guides, Custom Layout Grid) */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {/* Bleed & Margin Guides (Conditional) */}
                {showBleedMargins && (
                  <div
                    className="absolute inset-4 border border-dashed border-rose-500/40"
                    title="Bleed Margin Line (3mm Safe Boundary)"
                  />
                )}

                {/* Rulers & Guides (Conditional) */}
                {showRulersGuides && (
                  <div className="absolute inset-0">
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-400/40" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-400/40" />
                  </div>
                )}

                {/* Custom Layout Grid Overlay (Intersecting Structural Hairlines) */}
                {gridConfig.visible && (
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox={`0 0 ${canvasDimensions.width} ${canvasDimensions.height}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {(gridConfig.axisMode === 'both' || gridConfig.axisMode === 'vertical') &&
                      (gridConfig.columns > 1 ? (
                        Array.from({ length: gridConfig.columns - 1 }).map((_, i) => {
                          const x = (canvasDimensions.width / gridConfig.columns) * (i + 1);
                          return (
                            <line
                              key={`col-${i}`}
                              x1={x}
                              y1={0}
                              x2={x}
                              y2={canvasDimensions.height}
                              stroke={gridConfig.color}
                              strokeOpacity={gridConfig.opacity}
                              strokeWidth={1.5}
                              vectorEffect="non-scaling-stroke"
                            />
                          );
                        })
                      ) : (
                        <>
                          <line
                            x1={1}
                            y1={0}
                            x2={1}
                            y2={canvasDimensions.height}
                            stroke={gridConfig.color}
                            strokeOpacity={gridConfig.opacity}
                            strokeWidth={1.5}
                            vectorEffect="non-scaling-stroke"
                          />
                          <line
                            x1={canvasDimensions.width - 1}
                            y1={0}
                            x2={canvasDimensions.width - 1}
                            y2={canvasDimensions.height}
                            stroke={gridConfig.color}
                            strokeOpacity={gridConfig.opacity}
                            strokeWidth={1.5}
                            vectorEffect="non-scaling-stroke"
                          />
                        </>
                      ))}

                    {(gridConfig.axisMode === 'both' || gridConfig.axisMode === 'horizontal') &&
                      (gridConfig.rows > 1 ? (
                        Array.from({ length: gridConfig.rows - 1 }).map((_, j) => {
                          const y = (canvasDimensions.height / gridConfig.rows) * (j + 1);
                          return (
                            <line
                              key={`row-${j}`}
                              x1={0}
                              y1={y}
                              x2={canvasDimensions.width}
                              y2={y}
                              stroke={gridConfig.color}
                              strokeOpacity={gridConfig.opacity}
                              strokeWidth={1.5}
                              vectorEffect="non-scaling-stroke"
                            />
                          );
                        })
                      ) : (
                        <>
                          <line
                            x1={0}
                            y1={1}
                            x2={canvasDimensions.width}
                            y2={1}
                            stroke={gridConfig.color}
                            strokeOpacity={gridConfig.opacity}
                            strokeWidth={1.5}
                            vectorEffect="non-scaling-stroke"
                          />
                          <line
                            x1={0}
                            y1={canvasDimensions.height - 1}
                            x2={canvasDimensions.width}
                            y2={canvasDimensions.height - 1}
                            stroke={gridConfig.color}
                            strokeOpacity={gridConfig.opacity}
                            strokeWidth={1.5}
                            vectorEffect="non-scaling-stroke"
                          />
                        </>
                      ))}
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Floating Canvas Navigation Toolbar (Bottom-Right, z-30) */}
          <div
            data-testid="canvas-nav-pill"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute bottom-5 right-5 z-30 flex items-center gap-1 p-1.5 rounded-2xl editor-chrome-float backdrop-blur-2xl border shadow-2xl text-xs text-slate-300"
          >
            {/* Hand / Pan Tool Toggle */}
            <button
              onClick={() => setIsPanToolActive(!isPanToolActive)}
              className={`p-1.5 rounded-xl transition-all ${
                isPanToolActive || isSpacePressed
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Hand / Pan Tool (H or Hold Space)"
            >
              <Hand className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-white/[0.08] mx-0.5" />

            {/* Zoom Out */}
            <button
              onClick={() => handleZoomChange(zoomLevel - 0.1)}
              className="p-1.5 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
              title="Zoom Out (Ctrl -)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Zoom Percentage */}
            <button
              onClick={handleZoom100}
              className="px-2 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Click to zoom 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>

            {/* Zoom In */}
            <button
              onClick={() => handleZoomChange(zoomLevel + 0.1)}
              className="p-1.5 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
              title="Zoom In (Ctrl +)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-white/[0.08] mx-0.5" />

            {/* Fit to Screen */}
            <button
              onClick={handleFitToScreen}
              className="p-1.5 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
              title="Fit to Screen (Ctrl 0)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Reset View */}
            <button
              onClick={handleResetView}
              className="p-1.5 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
              title="Reset Pan & Fit View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Floating Right Panel: Collapsible Layers Manager */}
          <LayerPanel
            layers={layersList}
            selectedObject={selectedObject}
            onSelectLayer={(obj) => {
              if (fabricRef.current) {
                fabricRef.current.setActiveObject(obj);
                fabricRef.current.renderAll();
                setSelectedObject(obj);
              }
            }}
            onMoveLayerUp={(obj) => {
              if (fabricRef.current) {
                fabricRef.current.bringObjectForward(obj);
                fabricRef.current.renderAll();
                syncLayers();
              }
            }}
            onMoveLayerDown={(obj) => {
              if (fabricRef.current) {
                fabricRef.current.sendObjectBackwards(obj);
                fabricRef.current.renderAll();
                syncLayers();
              }
            }}
            onToggleVisibility={(obj) => {
              obj.set({ visible: !obj.visible });
              fabricRef.current?.renderAll();
              syncLayers();
            }}
            onToggleLock={(obj) => {
              const locked = !obj.lockMovementX;
              obj.set({
                lockMovementX: locked,
                lockMovementY: locked,
                lockRotation: locked,
                lockScalingX: locked,
                lockScalingY: locked,
              });
              fabricRef.current?.renderAll();
              syncLayers();
            }}
            onDeleteLayer={(obj) => {
              fabricRef.current?.remove(obj);
              fabricRef.current?.renderAll();
              syncLayers();
              autoSaveToDB();
            }}
            isCollapsed={isLayersCollapsed}
            onToggleCollapse={() => setIsLayersCollapsed(!isLayersCollapsed)}
          />
        </main>
      </div>

      {/* 3. BOTTOM BAR: Page & Timeline Navigation */}
      <BottomPageBar
        pages={pages}
        currentPageId={currentPageId}
        onSelectPage={handleSelectPage}
        onAddPage={handleAddPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        onReorderPages={(newPages) => setPages(newPages)}
        hasMediaElements={hasMediaElements}
        isPlayingPreview={isPlayingPreview}
        onTogglePlayPreview={() => setIsPlayingPreview(!isPlayingPreview)}
        onOpenTimelineEditor={() => setIsTimelineOpen(true)}
      />

      {/* 4. EXPORT MODAL */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        pages={pages}
        currentPageId={currentPageId}
        allAssets={assets}
        allFonts={customFonts}
        onExportPageAsDataUrl={handleExportPageAsDataUrl}
        onExportPageAsSvg={handleExportPageAsSvg}
        onCopyImageToClipboard={handleCopyImageToClipboard}
      />

      {/* 5. TIMELINE DRAWER */}
      <TimelineDrawer
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        isPlaying={isPlayingPreview}
        onTogglePlay={() => setIsPlayingPreview(!isPlayingPreview)}
        audioTrack={audioTrack}
        onRemoveAudioTrack={handleRemoveAudioTrack}
      />

      {/* 6. SHARE TEMPLATE & GITHUB PR GUIDE MODAL */}
      <PublishCommunityModal
        isOpen={isPublishModalOpen}
        onClose={() => {
          setIsPublishModalOpen(false);
          setShareSnapshotProject(null);
          setShareSavedFilename(undefined);
        }}
        project={shareSnapshotProject || project}
        allAssets={assets}
        allFonts={customFonts}
        savedFilename={shareSavedFilename}
      />

      {/* 7. CLOUD SYNC & STORAGE MODAL */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        activeProject={project}
        allAssets={assets}
        allFonts={customFonts}
        onProjectImported={(updated) => onProjectUpdated(updated)}
      />
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import {
  Layers,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  MoveUp,
  MoveDown,
  Folder,
  Image as ImageIcon,
  Type,
  Square,
  Circle,
  Component,
  PanelRightClose,
  PanelRightOpen,
  GripVertical,
} from 'lucide-react';

interface LayerPanelProps {
  layers: fabric.FabricObject[];
  selectedObject: fabric.FabricObject | null;
  onSelectLayer: (obj: fabric.FabricObject) => void;
  onMoveLayerUp: (obj: fabric.FabricObject) => void;
  onMoveLayerDown: (obj: fabric.FabricObject) => void;
  onToggleVisibility: (obj: fabric.FabricObject) => void;
  onToggleLock: (obj: fabric.FabricObject) => void;
  onDeleteLayer: (obj: fabric.FabricObject) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedObject,
  onSelectLayer,
  onMoveLayerUp,
  onMoveLayerDown,
  onToggleVisibility,
  onToggleLock,
  onDeleteLayer,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef(dragOffset);
  dragOffsetRef.current = dragOffset;
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const suppressNextExpandClickRef = useRef(false);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  const handleStartPanelDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, select, textarea, a')) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialOffset = dragOffsetRef.current;

    const panelEl = panelRef.current;
    const parentRect = panelEl?.parentElement?.getBoundingClientRect();
    const panelRect = panelEl?.getBoundingClientRect();

    const clampDelta = (rawX: number, rawY: number) => {
      if (!parentRect || !panelRect) return { x: rawX, y: rawY };
      const minDx = parentRect.left + 8 - (panelRect.left - initialOffset.x);
      const maxDx = parentRect.right - 8 - (panelRect.right - initialOffset.x);
      const minDy = parentRect.top + 8 - (panelRect.top - initialOffset.y);
      const maxDy = parentRect.bottom - 8 - (panelRect.bottom - initialOffset.y);
      return {
        x: Math.max(minDx, Math.min(maxDx, rawX)),
        y: Math.max(minDy, Math.min(maxDy, rawY)),
      };
    };

    let didMove = false;
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!didMove && Math.hypot(dx, dy) < 4) return;
      if (!didMove) {
        didMove = true;
        setIsDraggingPanel(true);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
      }
      setDragOffset(clampDelta(initialOffset.x + dx, initialOffset.y + dy));
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onPointerUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      setIsDraggingPanel(false);
      dragCleanupRef.current = null;
    };

    const onPointerUp = () => {
      if (didMove) {
        suppressNextExpandClickRef.current = true;
        window.setTimeout(() => {
          suppressNextExpandClickRef.current = false;
        }, 80);
      }
      cleanup();
    };

    dragCleanupRef.current?.();
    dragCleanupRef.current = cleanup;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onPointerUp);
  };

  const stopViewportBubble = {
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  };

  const toggleGroupCollapse = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const getLayerName = (obj: fabric.FabricObject, idx: number): string => {
    if ((obj as any).name) return (obj as any).name;
    const t = (obj.type || '').toLowerCase();
    if (obj instanceof fabric.Textbox || t === 'textbox' || t === 'text' || t === 'i-text') {
      const text = (obj as any).text || '';
      return text.length > 16 ? `"${text.slice(0, 14)}..."` : `"${text || 'Text'}"`;
    }
    if (obj instanceof fabric.FabricImage || t === 'image') return `Image ${idx + 1}`;
    if (obj instanceof fabric.Rect || t === 'rect') return `Rectangle ${idx + 1}`;
    if (obj instanceof fabric.Circle || t === 'circle') return `Circle ${idx + 1}`;
    if (obj instanceof fabric.Triangle || t === 'triangle') return `Triangle ${idx + 1}`;
    if ((obj as any).isVectorIcon) return `Icon ${idx + 1}`;
    if (obj instanceof fabric.Group || t === 'group') return `Group ${idx + 1}`;
    return `${obj.type || 'Object'} ${idx + 1}`;
  };

  const getLayerIcon = (obj: fabric.FabricObject) => {
    const t = (obj.type || '').toLowerCase();
    if (obj instanceof fabric.Textbox || t === 'textbox' || t === 'text' || t === 'i-text') return Type;
    if (obj instanceof fabric.FabricImage || t === 'image') return ImageIcon;
    if (obj instanceof fabric.Circle || t === 'circle') return Circle;
    if (obj instanceof fabric.Rect || t === 'rect') return Square;
    if (obj instanceof fabric.Group || t === 'group') {
      return (obj as any).isVectorIcon ? Component : Folder;
    }
    return Component;
  };

  const positionStyle: React.CSSProperties = {
    transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
    transition: isDraggingPanel ? 'none' : 'transform 120ms ease-out',
  };

  if (isCollapsed) {
    return (
      <div
        ref={panelRef}
        data-testid="layers-panel"
        data-collapsed="true"
        style={positionStyle}
        {...stopViewportBubble}
        className="absolute top-16 right-4 z-30 select-none"
      >
        <div className="h-9 rounded-xl editor-chrome-float backdrop-blur-2xl border hover:border-white/25 shadow-2xl flex items-center overflow-hidden">
          <div
            data-testid="layers-panel-drag-handle"
            onPointerDown={handleStartPanelDrag}
            onDoubleClick={() => setDragOffset({ x: 0, y: 0 })}
            title="Drag to move · Double-click to reset"
            className="h-full pl-2 pr-1 flex items-center text-slate-400 hover:text-white cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <button
            type="button"
            data-testid="layers-panel-expand-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (suppressNextExpandClickRef.current) return;
              onToggleCollapse();
            }}
            aria-expanded={false}
            aria-label="Expand Layers Panel"
            title="Expand Layers Panel"
            className="h-full pl-1 pr-3 flex items-center gap-2 text-xs text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="font-semibold tracking-tight">Layers</span>
            <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">
              {layers.length}
            </span>
            <PanelRightOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside
      ref={panelRef}
      data-testid="layers-panel"
      data-collapsed="false"
      aria-label="Layers Panel"
      style={positionStyle}
      {...stopViewportBubble}
      className="absolute top-16 right-4 z-30 w-60 max-h-[calc(100%-8.5rem)] rounded-2xl editor-chrome-float backdrop-blur-2xl border shadow-2xl flex flex-col overflow-hidden select-none"
    >
      {/* Floating Card Header (Draggable) */}
      <div
        data-testid="layers-panel-drag-handle"
        onPointerDown={handleStartPanelDrag}
        onDoubleClick={() => setDragOffset({ x: 0, y: 0 })}
        title="Drag to move Layers panel · Double-click to reset position"
        className="h-11 border-b border-white/[0.07] flex items-center justify-between px-3 shrink-0 bg-white/[0.02] cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <Layers className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-xs font-semibold text-white tracking-tight">Layers</span>
          <span
            data-testid="layers-count"
            className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300"
          >
            {layers.length}
          </span>
        </div>
        <button
          type="button"
          data-testid="layers-panel-collapse-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleCollapse}
          aria-expanded={true}
          aria-label="Collapse Layers Panel"
          title="Collapse Layers Panel"
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <PanelRightClose className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Layer Stack */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {layers.length === 0 ? (
          <div className="py-8 px-2 text-center text-slate-500 text-[11px]">
            No layers on this artboard yet
          </div>
        ) : (
          layers.map((obj, index) => {
            const isSelected = selectedObject === obj;
            const isVectorIcon = Boolean((obj as any).isVectorIcon);
            const isGroup = !isVectorIcon && (obj instanceof fabric.Group || obj.type === 'group');
            const isHidden = obj.visible === false;
            const isLocked = !!obj.lockMovementX;
            const Icon = getLayerIcon(obj);
            const name = getLayerName(obj, index);
            const layerId = (obj as any).id || `layer_${index}`;
            const isGroupCollapsed = collapsedGroups[layerId];

            return (
              <div key={layerId} className="space-y-1">
                <div
                  data-testid={`layer-row-${index}`}
                  onClick={() => onSelectLayer(obj)}
                  className={`group px-2 py-1.5 rounded-xl border flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white/[0.11] border-white/25 text-white'
                      : 'bg-white/[0.025] border-white/[0.05] text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  } ${isHidden ? 'opacity-55' : ''}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isGroup ? (
                      <button
                        type="button"
                        onClick={(e) => toggleGroupCollapse(layerId, e)}
                        className="text-slate-400 hover:text-white shrink-0"
                        aria-label="Toggle group"
                      >
                        {isGroupCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="text-[11px] truncate font-medium">{name}</span>
                  </div>

                  {/* Z-index, Visibility, Lock, Delete actions */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-75 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayerUp(obj);
                      }}
                      className="p-1 hover:bg-white/[0.1] rounded text-slate-400 hover:text-white"
                      title="Bring Layer Forward"
                      aria-label="Bring Layer Forward"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayerDown(obj);
                      }}
                      className="p-1 hover:bg-white/[0.1] rounded text-slate-400 hover:text-white"
                      title="Send Layer Backward"
                      aria-label="Send Layer Backward"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(obj);
                      }}
                      className={`p-1 hover:bg-white/[0.1] rounded ${
                        isHidden ? 'text-amber-400 opacity-100' : 'text-slate-400 hover:text-white'
                      }`}
                      title={isHidden ? 'Show Layer' : 'Hide Layer'}
                      aria-label={isHidden ? 'Show Layer' : 'Hide Layer'}
                    >
                      {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(obj);
                      }}
                      className={`p-1 hover:bg-white/[0.1] rounded ${
                        isLocked ? 'text-amber-400 opacity-100' : 'text-slate-400 hover:text-white'
                      }`}
                      title={isLocked ? 'Unlock Layer' : 'Lock Layer'}
                      aria-label={isLocked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(obj);
                      }}
                      className="p-1 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-400"
                      title="Delete Layer"
                      aria-label="Delete Layer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sub-layers if grouped object */}
                {isGroup && !isGroupCollapsed && (obj as any).getObjects && (
                  <div className="pl-3 border-l border-white/[0.06] ml-2.5 space-y-1">
                    {((obj as any).getObjects() as fabric.FabricObject[]).map((sub, sIdx) => (
                      <div
                        key={sIdx}
                        className="px-2 py-1 text-[10px] text-slate-400 flex items-center gap-1.5 rounded bg-white/[0.02]"
                      >
                        <Component className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{sub.type || 'Child Layer'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

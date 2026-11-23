import * as fabric from 'fabric';

export type VectorShapeCategory = 'Basic' | 'Polygons & Stars' | 'Lines & Dividers';

export type VectorShapeId =
  // Basic
  | 'rect'
  | 'rounded-rect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'right-triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  // Polygons & Stars
  | 'star-4'
  | 'star-5'
  | 'star-6'
  | 'badge-seal'
  | 'pill'
  | 'cross'
  | 'arrow-block'
  | 'chevron'
  // Lines & Dividers
  | 'line-straight'
  | 'line-dashed'
  | 'line-arrow'
  | 'line-curved';

export interface VectorShapeDef {
  id: VectorShapeId;
  label: string;
  category: VectorShapeCategory;
  /** Clean 32x32 viewBox SVG snippet for crisp toolbar thumbnail preview */
  previewPath: string;
  isDivider?: boolean;
}

export function regularPolygonPoints(
  sides: number,
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number = -90
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const rad = ((startAngleDeg + (360 / sides) * i) * Math.PI) / 180;
    pts.push({
      x: Number((cx + radius * Math.cos(rad)).toFixed(2)),
      y: Number((cy + radius * Math.sin(rad)).toFixed(2)),
    });
  }
  return pts;
}

export function starPolygonPoints(
  pointsCount: number,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngleDeg: number = -90
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const total = pointsCount * 2;
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const rad = ((startAngleDeg + (360 / total) * i) * Math.PI) / 180;
    pts.push({
      x: Number((cx + r * Math.cos(rad)).toFixed(2)),
      y: Number((cy + r * Math.sin(rad)).toFixed(2)),
    });
  }
  return pts;
}

function pointsToAttr(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

export const VECTOR_SHAPES_CATALOG: VectorShapeDef[] = [
  // --- BASIC ---
  {
    id: 'rect',
    label: 'Rectangle',
    category: 'Basic',
    previewPath: '<rect x="5" y="7" width="22" height="18" fill="currentColor" />',
  },
  {
    id: 'rounded-rect',
    label: 'Rounded Rect',
    category: 'Basic',
    previewPath: '<rect x="5" y="7" width="22" height="18" rx="5" ry="5" fill="currentColor" />',
  },
  {
    id: 'circle',
    label: 'Circle',
    category: 'Basic',
    previewPath: '<circle cx="16" cy="16" r="10.5" fill="currentColor" />',
  },
  {
    id: 'ellipse',
    label: 'Ellipse',
    category: 'Basic',
    previewPath: '<ellipse cx="16" cy="16" rx="12" ry="8" fill="currentColor" />',
  },
  {
    id: 'triangle',
    label: 'Triangle',
    category: 'Basic',
    previewPath: '<polygon points="16,5 27,26 5,26" fill="currentColor" />',
  },
  {
    id: 'right-triangle',
    label: 'Right Triangle',
    category: 'Basic',
    previewPath: '<polygon points="6,6 6,26 26,26" fill="currentColor" />',
  },
  {
    id: 'diamond',
    label: 'Diamond',
    category: 'Basic',
    previewPath: '<polygon points="16,4 28,16 16,28 4,16" fill="currentColor" />',
  },
  {
    id: 'pentagon',
    label: 'Pentagon',
    category: 'Basic',
    previewPath: `<polygon points="${pointsToAttr(regularPolygonPoints(5, 16, 16.5, 11))}" fill="currentColor" />`,
  },
  {
    id: 'hexagon',
    label: 'Hexagon',
    category: 'Basic',
    previewPath: `<polygon points="${pointsToAttr(regularPolygonPoints(6, 16, 16, 11, -90))}" fill="currentColor" />`,
  },
  {
    id: 'octagon',
    label: 'Octagon',
    category: 'Basic',
    previewPath: `<polygon points="${pointsToAttr(regularPolygonPoints(8, 16, 16, 11, -67.5))}" fill="currentColor" />`,
  },

  // --- POLYGONS & STARS ---
  {
    id: 'star-4',
    label: '4-Point Star',
    category: 'Polygons & Stars',
    previewPath: `<polygon points="${pointsToAttr(starPolygonPoints(4, 16, 16, 12, 4.5))}" fill="currentColor" />`,
  },
  {
    id: 'star-5',
    label: '5-Point Star',
    category: 'Polygons & Stars',
    previewPath: `<polygon points="${pointsToAttr(starPolygonPoints(5, 16, 16.5, 12, 5.2))}" fill="currentColor" />`,
  },
  {
    id: 'star-6',
    label: '6-Point Star',
    category: 'Polygons & Stars',
    previewPath: `<polygon points="${pointsToAttr(starPolygonPoints(6, 16, 16, 12, 6))}" fill="currentColor" />`,
  },
  {
    id: 'badge-seal',
    label: 'Badge / Seal',
    category: 'Polygons & Stars',
    previewPath: `<polygon points="${pointsToAttr(starPolygonPoints(12, 16, 16, 12, 9.4))}" fill="currentColor" />`,
  },
  {
    id: 'pill',
    label: 'Pill / Capsule',
    category: 'Polygons & Stars',
    previewPath: '<rect x="4" y="10" width="24" height="12" rx="6" ry="6" fill="currentColor" />',
  },
  {
    id: 'cross',
    label: 'Cross / Plus',
    category: 'Polygons & Stars',
    previewPath:
      '<polygon points="12,5 20,5 20,12 27,12 27,20 20,20 20,27 12,27 12,20 5,20 5,12 12,12" fill="currentColor" />',
  },
  {
    id: 'arrow-block',
    label: 'Arrow Block',
    category: 'Polygons & Stars',
    previewPath:
      '<polygon points="4,12 18,12 18,7 28,16 18,25 18,20 4,20" fill="currentColor" />',
  },
  {
    id: 'chevron',
    label: 'Chevron',
    category: 'Polygons & Stars',
    previewPath:
      '<polygon points="6,6 15,6 25,16 15,26 6,26 16,16" fill="currentColor" />',
  },

  // --- LINES & DIVIDERS ---
  {
    id: 'line-straight',
    label: 'Straight Line',
    category: 'Lines & Dividers',
    isDivider: true,
    previewPath:
      '<line x1="4" y1="16" x2="28" y2="16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />',
  },
  {
    id: 'line-dashed',
    label: 'Dashed Line',
    category: 'Lines & Dividers',
    isDivider: true,
    previewPath:
      '<line x1="4" y1="16" x2="28" y2="16" stroke="currentColor" stroke-width="2.5" stroke-dasharray="4 3" stroke-linecap="round" />',
  },
  {
    id: 'line-arrow',
    label: 'Arrow Line',
    category: 'Lines & Dividers',
    isDivider: true,
    previewPath:
      '<line x1="4" y1="16" x2="25" y2="16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" /><polyline points="20,10 27,16 20,22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />',
  },
  {
    id: 'line-curved',
    label: 'Curved Connector',
    category: 'Lines & Dividers',
    isDivider: true,
    previewPath:
      '<path d="M 4 23 C 12 23, 20 9, 28 9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />',
  },
];

export const VECTOR_SHAPE_CATEGORIES: VectorShapeCategory[] = [
  'Basic',
  'Polygons & Stars',
  'Lines & Dividers',
];

export interface CreateShapeOptions {
  canvasWidth: number;
  canvasHeight: number;
  fill: string;
  stroke?: string;
}

/**
 * Instantiates a crisp, resolution-independent Fabric.js vector shape centered on the artboard.
 * Uses `strokeUniform: true` so strokes remain distortion-free during non-uniform resizing.
 */
export function createFabricShape(
  rawType: string,
  { canvasWidth, canvasHeight, fill, stroke }: CreateShapeOptions
): fabric.FabricObject {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const shapeStroke = stroke || (fill === '#ffffff' ? '#94a3b8' : '#ffffff');

  // Support legacy aliases seamlessly
  const shapeType: string =
    rawType === 'star' ? 'star-5' : rawType === 'line' ? 'line-straight' : rawType;

  const baseProps = {
    left: cx,
    top: cy,
    originX: 'center' as const,
    originY: 'center' as const,
    strokeUniform: true,
    strokeLineCap: 'round' as const,
    strokeLineJoin: 'round' as const,
  };

  let obj: fabric.FabricObject;

  switch (shapeType) {
    case 'rect':
      obj = new fabric.Rect({
        ...baseProps,
        width: 180,
        height: 130,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'rounded-rect':
      obj = new fabric.Rect({
        ...baseProps,
        width: 180,
        height: 130,
        rx: 24,
        ry: 24,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'pill':
      obj = new fabric.Rect({
        ...baseProps,
        width: 220,
        height: 84,
        rx: 42,
        ry: 42,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'circle':
      obj = new fabric.Circle({
        ...baseProps,
        radius: 75,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'ellipse':
      obj = new fabric.Ellipse({
        ...baseProps,
        rx: 105,
        ry: 65,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'triangle':
      obj = new fabric.Triangle({
        ...baseProps,
        width: 150,
        height: 130,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'right-triangle':
      obj = new fabric.Polygon(
        [
          { x: 0, y: 0 },
          { x: 0, y: 140 },
          { x: 140, y: 140 },
        ],
        {
          ...baseProps,
          fill,
          stroke: shapeStroke,
          strokeWidth: 0,
        }
      );
      break;

    case 'diamond':
      obj = new fabric.Polygon(
        [
          { x: 75, y: 0 },
          { x: 150, y: 75 },
          { x: 75, y: 150 },
          { x: 0, y: 75 },
        ],
        {
          ...baseProps,
          fill,
          stroke: shapeStroke,
          strokeWidth: 0,
        }
      );
      break;

    case 'pentagon':
      obj = new fabric.Polygon(regularPolygonPoints(5, 75, 75, 75, -90), {
        ...baseProps,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'hexagon':
      obj = new fabric.Polygon(regularPolygonPoints(6, 75, 75, 75, -90), {
        ...baseProps,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'octagon':
      obj = new fabric.Polygon(regularPolygonPoints(8, 75, 75, 75, -67.5), {
        ...baseProps,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'star-4':
      obj = new fabric.Polygon(starPolygonPoints(4, 80, 80, 80, 30), {
        ...baseProps,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'star-5':
      obj = new fabric.Polygon(starPolygonPoints(5, 80, 80, 80, 34), {
        ...baseProps,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'star-6':
      obj = new fabric.Polygon(starPolygonPoints(6, 80, 80, 80, 40), {
        ...baseProps,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'badge-seal':
      obj = new fabric.Polygon(starPolygonPoints(12, 80, 80, 80, 63), {
        ...baseProps,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;

    case 'cross':
      obj = new fabric.Polygon(
        [
          { x: 50, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 50 },
          { x: 150, y: 50 },
          { x: 150, y: 100 },
          { x: 100, y: 100 },
          { x: 100, y: 150 },
          { x: 50, y: 150 },
          { x: 50, y: 100 },
          { x: 0, y: 100 },
          { x: 0, y: 50 },
          { x: 50, y: 50 },
        ],
        {
          ...baseProps,
          fill,
          stroke: shapeStroke,
          strokeWidth: 0,
        }
      );
      break;

    case 'arrow-block':
      obj = new fabric.Polygon(
        [
          { x: 0, y: 38 },
          { x: 110, y: 38 },
          { x: 110, y: 0 },
          { x: 175, y: 65 },
          { x: 110, y: 130 },
          { x: 110, y: 92 },
          { x: 0, y: 92 },
        ],
        {
          ...baseProps,
          fill,
          stroke: shapeStroke,
          strokeWidth: 0,
        }
      );
      break;

    case 'chevron':
      obj = new fabric.Polygon(
        [
          { x: 0, y: 0 },
          { x: 65, y: 0 },
          { x: 140, y: 70 },
          { x: 65, y: 140 },
          { x: 0, y: 140 },
          { x: 75, y: 70 },
        ],
        {
          ...baseProps,
          fill,
          stroke: shapeStroke,
          strokeWidth: 0,
        }
      );
      break;

    case 'line-straight':
      obj = new fabric.Line([0, 0, 260, 0], {
        ...baseProps,
        fill: 'transparent',
        stroke: fill,
        strokeWidth: 4,
      });
      (obj as any).isLineDivider = true;
      break;

    case 'line-dashed':
      obj = new fabric.Line([0, 0, 260, 0], {
        ...baseProps,
        fill: 'transparent',
        stroke: fill,
        strokeWidth: 4,
        strokeDashArray: [16, 10],
      });
      (obj as any).isLineDivider = true;
      break;

    case 'line-arrow':
      obj = new fabric.Path(
        'M 0 24 L 220 24 M 192 4 L 224 24 L 192 44',
        {
          ...baseProps,
          fill: 'transparent',
          stroke: fill,
          strokeWidth: 4,
        }
      );
      (obj as any).isLineDivider = true;
      break;

    case 'line-curved':
      obj = new fabric.Path('M 0 90 C 80 90, 140 0, 220 0', {
        ...baseProps,
        fill: 'transparent',
        stroke: fill,
        strokeWidth: 4,
      });
      (obj as any).isLineDivider = true;
      break;

    case 'heart':
      obj = new fabric.Path(
        'M 272 448 C 272 448 384 336 432 256 C 480 176 448 64 352 64 C 288 64 272 128 272 128 C 272 128 256 64 192 64 C 96 64 64 176 112 256 C 160 336 272 448 272 448 Z',
        {
          ...baseProps,
          fill,
          stroke: shapeStroke,
          strokeWidth: 0,
          scaleX: 0.38,
          scaleY: 0.38,
        }
      );
      break;

    default:
      obj = new fabric.Rect({
        ...baseProps,
        width: 180,
        height: 130,
        fill,
        stroke: shapeStroke,
        strokeWidth: 0,
      });
      break;
  }

  (obj as any).shapeType = shapeType;
  const def = VECTOR_SHAPES_CATALOG.find((d) => d.id === shapeType);
  if (def) {
    (obj as any).name = def.label;
  }

  return obj;
}

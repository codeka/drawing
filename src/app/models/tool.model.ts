export type ToolId = 'pencil' | 'fill' | 'eraser' | 'text' | 'line' | 'shapes';

export type ToolMode = 'direct' | 'staged';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ToolDefinition {
  id: ToolId;
  label: string;
  mode: ToolMode;
  shortcut: string;
  cursor: string;
}

export interface TextDraft {
  rect: Rect;
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
}

export interface FontOption {
  label: string;
  value: string;
}

export type TextStyleOption = 'bold' | 'italic' | 'underline';

export interface NewImageOptions {
  width: number;
  height: number;
  fillColor: string;
}

export type ShapeType =
  | 'rectangle'
  | 'rounded-rectangle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'hexagon'
  | 'star'
  | 'plus'
  | 'heart'
  | 'arrow';

export interface ShapeDefinition {
  readonly id: ShapeType;
  readonly label: string;
}

export interface ShapeDraft {
  rect: Rect;
  shapeType: ShapeType;
  outlineWidth: number;
  outlineColor: string;
  fillColor: string;
}

export type ShapeColorSlot = 'outline' | 'fill';

export type LineCap =
  | 'round'
  | 'flat'
  | 'arrow'
  | 'open-arrow'
  | 'stealth-arrow'
  | 'hollow-arrow'
  | 'circle'
  | 'square'
  | 'diamond'
  | 'bar';

export type LineCapSlot = 'start' | 'end';

export interface LineCapDefinition {
  readonly id: LineCap;
  readonly label: string;
}

export interface LineDraft {
  start: Point;
  end: Point;
  color: string;
  thickness: number;
  startCap: LineCap;
  endCap: LineCap;
}

export const DEFAULT_CANVAS_WIDTH = 1280;
export const DEFAULT_CANVAS_HEIGHT = 1024;
export const MIN_CANVAS_SIZE = 1;
export const MAX_CANVAS_SIZE = 8192;
export const TRANSPARENT_COLOR = 'transparent';
export const DEFAULT_TEXT_FONT_FAMILY = 'Segoe UI, Arial, sans-serif';
export const DEFAULT_TEXT_FONT_SIZE = 24;
export const MIN_TEXT_FONT_SIZE = 8;
export const MAX_TEXT_FONT_SIZE = 200;
export const TEXT_FONT_SIZE_PRESETS: readonly number[] = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 36, 48, 72, 96, 120,
];
export const TEXT_FONT_OPTIONS: readonly FontOption[] = [
  { label: 'Segoe UI', value: DEFAULT_TEXT_FONT_FAMILY },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', cursive, sans-serif" },
  { label: 'Impact', value: 'Impact, sans-serif' },
];

export const MIN_BRUSH_SIZE = 1;
export const MAX_BRUSH_SIZE = 200;
export const SLIDER_MAX_BRUSH_SIZE = 100;
export const DEFAULT_PENCIL_SIZE = 8;
export const DEFAULT_ERASER_SIZE = 10;

export const DEFAULT_SHAPE_TYPE: ShapeType = 'rectangle';
export const DEFAULT_SHAPE_OUTLINE_WIDTH = 8;
export const DEFAULT_SHAPE_OUTLINE_COLOR = '#000000';
export const DEFAULT_SHAPE_FILL_COLOR = TRANSPARENT_COLOR;
export const DEFAULT_LINE_WIDTH = 8;
export const DEFAULT_LINE_START_CAP: LineCap = 'round';
export const DEFAULT_LINE_END_CAP: LineCap = 'round';

export const SHAPE_DEFINITIONS: readonly ShapeDefinition[] = [
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'rounded-rectangle', label: 'Rounded Rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'star', label: 'Star' },
  { id: 'plus', label: 'Plus' },
  { id: 'heart', label: 'Heart' },
  { id: 'arrow', label: 'Arrow' },
];

export const LINE_CAP_DEFINITIONS: readonly LineCapDefinition[] = [
  { id: 'round', label: 'Round' },
  { id: 'flat', label: 'Flat' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'open-arrow', label: 'Open Arrow' },
  { id: 'stealth-arrow', label: 'Stealth Arrow' },
  { id: 'hollow-arrow', label: 'Hollow Arrow' },
  { id: 'circle', label: 'Circle' },
  { id: 'square', label: 'Square' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'bar', label: 'Bar' },
];

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  { id: 'pencil', label: 'Pencil', mode: 'direct', shortcut: 'P', cursor: 'crosshair' },
  { id: 'fill', label: 'Fill', mode: 'direct', shortcut: 'F', cursor: 'crosshair' },
  { id: 'eraser', label: 'Eraser', mode: 'direct', shortcut: 'E', cursor: 'crosshair' },
  { id: 'text', label: 'Text', mode: 'staged', shortcut: 'T', cursor: 'text' },
  { id: 'line', label: 'Line', mode: 'direct', shortcut: 'L', cursor: 'crosshair' },
  { id: 'shapes', label: 'Shapes', mode: 'staged', shortcut: 'S', cursor: 'crosshair' },
];

export const PRESET_COLORS: readonly string[] = [
  '#000000',
  '#ed1c24',
  '#3f48d1',
  '#23cc56',
  '#dcff15',
  '#ff7f27',
  '#ffffff',
  '#880015',
  '#131174',
  '#0e5724',
  '#635e05',
  '#914218ff',
];

export function getToolDefinition(id: ToolId): ToolDefinition {
  return TOOL_DEFINITIONS.find((tool) => tool.id === id) ?? TOOL_DEFINITIONS[0];
}

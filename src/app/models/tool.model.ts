export type ToolId = 'pencil' | 'fill' | 'eraser' | 'text';

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
  color: string;
}

export const DEFAULT_CANVAS_WIDTH = 1280;
export const DEFAULT_CANVAS_HEIGHT = 1024;
export const DEFAULT_TEXT_FONT_FAMILY = 'Segoe UI, Arial, sans-serif';
export const DEFAULT_TEXT_FONT_SIZE = 24;

export const MIN_BRUSH_SIZE = 1;
export const MAX_BRUSH_SIZE = 200;
export const SLIDER_MAX_BRUSH_SIZE = 100;
export const DEFAULT_PENCIL_SIZE = 8;
export const DEFAULT_ERASER_SIZE = 10;

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  { id: 'pencil', label: 'Pencil', mode: 'direct', shortcut: 'P', cursor: 'crosshair' },
  { id: 'fill', label: 'Fill', mode: 'direct', shortcut: 'F', cursor: 'crosshair' },
  { id: 'eraser', label: 'Eraser', mode: 'direct', shortcut: 'E', cursor: 'crosshair' },
  { id: 'text', label: 'Text', mode: 'staged', shortcut: 'T', cursor: 'text' },
];

export const PRESET_COLORS: readonly string[] = [
  '#000000',
  '#7f7f7f',
  '#880015',
  '#ed1c24',
  '#ff7f27',
  '#fff200',
  '#22b14c',
  '#00a2e8',
  '#3f48cc',
  '#a349a4',
  '#ffffff',
  '#b97a57',
];

export function getToolDefinition(id: ToolId): ToolDefinition {
  return TOOL_DEFINITIONS.find((tool) => tool.id === id) ?? TOOL_DEFINITIONS[0];
}

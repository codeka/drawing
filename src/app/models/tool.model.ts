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

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  { id: 'pencil', label: 'Pencil', mode: 'direct', shortcut: 'P', cursor: 'crosshair' },
  { id: 'fill', label: 'Fill', mode: 'direct', shortcut: 'F', cursor: 'crosshair' },
  { id: 'eraser', label: 'Eraser', mode: 'direct', shortcut: 'E', cursor: 'crosshair' },
  { id: 'text', label: 'Text', mode: 'staged', shortcut: 'T', cursor: 'text' },
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

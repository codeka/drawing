export const DEFAULT_FILE_BASE_NAME = 'untitled';
export const DEFAULT_FILE_NAME = 'untitled.png';

const INVALID_FILE_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/;

/**
 * Extracts the base filename without a trailing extension, falling back to 'untitled'.
 */
export function extractFileBaseName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return DEFAULT_FILE_BASE_NAME;
  }
  const base = trimmed.replace(/\.[^/.]+$/, '').trim();
  return base || DEFAULT_FILE_BASE_NAME;
}

/**
 * Strips a trailing '.png' extension if present, validates filename characters,
 * and returns '<name>.png' or null if invalid.
 */
export function normalizePngFileName(raw: string): string | null {
  const base = raw.trim().replace(/\.png$/i, '').trim();
  if (
    !base ||
    base === '.' ||
    base === '..' ||
    base.endsWith('.') ||
    INVALID_FILE_NAME_CHARS.test(base)
  ) {
    return null;
  }
  return `${base}.png`;
}

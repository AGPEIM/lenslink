export const THUMBNAIL_WIDTH = 128;
export const THUMBNAIL_STRIDE = 136;
export const FILMSTRIP_PADDING = 16;

export function filmstripRange(count: number, scrollLeft: number, viewportWidth: number) {
  const start = Math.min(count, Math.max(0, Math.floor((scrollLeft - FILMSTRIP_PADDING) / THUMBNAIL_STRIDE) - 2));
  const end = Math.min(count, Math.max(start, Math.ceil((scrollLeft + viewportWidth - FILMSTRIP_PADDING) / THUMBNAIL_STRIDE) + 2));
  return { start, end };
}

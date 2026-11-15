import { readFile } from '@tauri-apps/plugin-fs';

// Import worker
import RawDecoderWorker from '../workers/rawDecoder.worker.ts?worker';

// Cache configuration
const MAX_CACHE_SIZE = 50;
const MAX_THUMBNAIL_CACHE_SIZE = 200;

// Cache for decoded RAW images
const rawImageCache = new Map<string, string>();
const thumbnailCache = new Map<string, string>();

// Track cache access order for LRU eviction
const cacheAccessOrder: string[] = [];
const thumbnailAccessOrder: string[] = [];

// Track ongoing decode operations to prevent duplicate work
const ongoingDecodes = new Map<string, Promise<string>>();

// Read and decode only when a worker slot is available. Queued requests retain
// paths, not entire RAW files, so a large import cannot read gigabytes at once.
const MAX_WORKERS = Math.min(navigator.hardwareConcurrency || 4, 4);
const DECODE_TIMEOUT_MS = 60_000;
const workerPool: Worker[] = [];
const availableWorkers: Worker[] = [];
interface DecodeJob {
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  filePath: string;
  thumbnail: boolean;
}
const pendingRequests: DecodeJob[] = [];
let nextRequestId = 0;

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function processNextRequest() {
  while (pendingRequests.length > 0) {
    let worker = availableWorkers.shift();
    if (!worker) {
      if (workerPool.length >= MAX_WORKERS) return;
      try {
        worker = new RawDecoderWorker();
        workerPool.push(worker);
      } catch (error) {
        // There may be no live worker left to wake this queue after a startup
        // failure. Settle every waiting request; a subsequent request can retry.
        for (const request of pendingRequests.splice(0)) request.reject(asError(error));
        return;
      }
    }
    startRequest(worker, pendingRequests.shift()!);
  }
}

function startRequest(worker: Worker, request: DecodeJob) {
  const requestId = `raw-${++nextRequestId}`;
  let settled = false;
  const finish = (error?: Error, dataUrl?: string, replace = false) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    worker.removeEventListener('message', handleMessage);
    worker.removeEventListener('error', handleError);
    worker.removeEventListener('messageerror', handleMessageError);
    if (replace) {
      worker.terminate();
      workerPool.splice(workerPool.indexOf(worker), 1);
    } else {
      availableWorkers.push(worker);
    }
    if (error) request.reject(error);
    else request.resolve(dataUrl!);
    processNextRequest();
  };
  const handleMessage = (event: MessageEvent) => {
    const response = event.data;
    if (!response || response.id !== requestId) return;
    if (response.type === 'success' && typeof response.dataUrl === 'string' && response.dataUrl) {
      finish(undefined, response.dataUrl);
    } else if (response.type === 'error') {
      finish(new Error(typeof response.error === 'string' ? response.error : 'RAW decoding failed'));
    } else {
      finish(new Error('Invalid RAW decoder response'), undefined, true);
    }
  };
  const handleError = (event: ErrorEvent) => {
    event.preventDefault();
    finish(new Error(event.message || 'RAW decoder worker failed'), undefined, true);
  };
  const handleMessageError = () => finish(new Error('Cannot read RAW decoder response'), undefined, true);
  const timer = setTimeout(() => finish(new Error('RAW decoding timed out'), undefined, true), DECODE_TIMEOUT_MS);
  worker.addEventListener('message', handleMessage);
  worker.addEventListener('error', handleError);
  worker.addEventListener('messageerror', handleMessageError);

  // The timeout also covers file reads. A read that finishes after cancellation
  // must never post into a terminated worker or one serving a newer request.
  void (async () => {
    try {
      const bytes = await readFile(request.filePath);
      if (settled) return;
      const fileBuffer = (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
        ? bytes.buffer : bytes.slice().buffer) as ArrayBuffer;
      worker.postMessage({ type: 'decode', id: requestId, fileBuffer, thumbnail: request.thumbnail }, [fileBuffer]);
    } catch (error) {
      finish(asError(error), undefined, true);
    }
  })();
}

function decodeWithWorker(filePath: string, thumbnail: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    pendingRequests.push({ resolve, reject, filePath, thumbnail });
    processNextRequest();
  });
}

/**
 * LRU cache eviction for full images
 */
function evictLRUCache() {
  while (rawImageCache.size >= MAX_CACHE_SIZE && cacheAccessOrder.length > 0) {
    const oldestKey = cacheAccessOrder.shift();
    if (oldestKey) {
      rawImageCache.delete(oldestKey);
      console.log(`[RAW Cache] Evicted: ${oldestKey}`);
    }
  }
}

/**
 * LRU cache eviction for thumbnails
 */
function evictThumbnailCache() {
  while (thumbnailCache.size >= MAX_THUMBNAIL_CACHE_SIZE && thumbnailAccessOrder.length > 0) {
    const oldestKey = thumbnailAccessOrder.shift();
    if (oldestKey) {
      thumbnailCache.delete(oldestKey);
    }
  }
}

/**
 * Update cache access order (move to end = most recently used)
 */
function touchCache(filePath: string, isThumbnail: boolean = false) {
  const orderList = isThumbnail ? thumbnailAccessOrder : cacheAccessOrder;
  const idx = orderList.indexOf(filePath);
  if (idx > -1) {
    orderList.splice(idx, 1);
  }
  orderList.push(filePath);
}

/**
 * Get thumbnail from cache without triggering decode
 */
export function getThumbnailFromCache(filePath: string): string | null {
  if (thumbnailCache.has(filePath)) {
    touchCache(filePath, true);
    return thumbnailCache.get(filePath)!;
  }
  return null;
}

/**
 * Get full image from cache without triggering decode
 */
export function getImageFromCache(filePath: string): string | null {
  if (rawImageCache.has(filePath)) {
    touchCache(filePath, false);
    return rawImageCache.get(filePath)!;
  }
  return null;
}

/**
 * Check if a file is currently being decoded
 */
export function isDecoding(filePath: string): boolean {
  return ongoingDecodes.has(filePath);
}

/**
 * Preload a RAW file into cache (non-blocking)
 */
export function preloadRawFile(filePath: string): void {
  if (rawImageCache.has(filePath) || ongoingDecodes.has(filePath)) {
    return;
  }

  decodeRawFile(filePath, false).catch(() => {
    // Silently ignore preload errors
  });
}

/**
 * Decode a RAW file and return a data URL for display
 * @param filePath - Path to the RAW file
 * @param thumbnail - If true, generates a smaller thumbnail (faster)
 */
export async function decodeRawFile(filePath: string, thumbnail: boolean = false): Promise<string> {
  const startTime = performance.now();

  // Check thumbnail cache first (if requesting thumbnail)
  if (thumbnail && thumbnailCache.has(filePath)) {
    touchCache(filePath, true);
    console.log(`[RAW Thumbnail Cache Hit] ${(performance.now() - startTime).toFixed(1)}ms`);
    return thumbnailCache.get(filePath)!;
  }

  // Check full image cache
  if (rawImageCache.has(filePath)) {
    const cachedDataUrl = rawImageCache.get(filePath)!;
    touchCache(filePath, false);

    // If requesting thumbnail, scale down the cached full image
    if (thumbnail) {
      console.log(`[RAW Cache Hit] Generating thumbnail from cached full image`);
      const thumbnailUrl = await createThumbnailFromDataUrl(cachedDataUrl);
      evictThumbnailCache();
      thumbnailCache.set(filePath, thumbnailUrl);
      touchCache(filePath, true);
      console.log(`[RAW Cache] Thumbnail generated in ${(performance.now() - startTime).toFixed(1)}ms`);
      return thumbnailUrl;
    }

    console.log(`[RAW Cache Hit] Full image loaded from cache in ${(performance.now() - startTime).toFixed(1)}ms`);
    return cachedDataUrl;
  }

  // Check if already decoding this file
  if (ongoingDecodes.has(filePath)) {
    console.log(`[RAW] Waiting for ongoing decode: ${filePath}`);
    const fullDataUrl = await ongoingDecodes.get(filePath)!;

    // If requesting thumbnail, scale down the result
    if (thumbnail) {
      const thumbnailUrl = await createThumbnailFromDataUrl(fullDataUrl);
      evictThumbnailCache();
      thumbnailCache.set(filePath, thumbnailUrl);
      touchCache(filePath, true);
      return thumbnailUrl;
    }
    return fullDataUrl;
  }

  // Start new decode operation using worker
  const decodePromise = (async () => {
    try {
      const dataUrl = await decodeWithWorker(filePath, false);

      // Cache the full-size result with LRU eviction
      evictLRUCache();
      rawImageCache.set(filePath, dataUrl);
      touchCache(filePath, false);

      console.log(`[RAW TOTAL] Full decode completed in ${(performance.now() - startTime).toFixed(1)}ms (cache size: ${rawImageCache.size})`);
      console.log('---');

      return dataUrl;
    } catch (error) {
      console.error('Failed to decode RAW file:', error);
      throw error;
    } finally {
      ongoingDecodes.delete(filePath);
    }
  })();

  // Store the promise to prevent duplicate work
  ongoingDecodes.set(filePath, decodePromise);

  // Wait for decode to complete
  const fullDataUrl = await decodePromise;

  // If thumbnail requested, scale down from the full image and cache
  if (thumbnail) {
    const thumbStart = performance.now();
    const thumbnailUrl = await createThumbnailFromDataUrl(fullDataUrl);
    evictThumbnailCache();
    thumbnailCache.set(filePath, thumbnailUrl);
    touchCache(filePath, true);
    console.log(`[RAW] Thumbnail scaled from full image in ${(performance.now() - thumbStart).toFixed(1)}ms`);
    return thumbnailUrl;
  }

  return fullDataUrl;
}

/**
 * Create a thumbnail from a full-size data URL
 */
async function createThumbnailFromDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 320;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        const scale = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Clear all RAW image caches
 */
export function clearRawCache() {
  rawImageCache.clear();
  thumbnailCache.clear();
  cacheAccessOrder.length = 0;
  thumbnailAccessOrder.length = 0;
  console.log('[RAW Cache] All caches cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    fullImageCount: rawImageCache.size,
    thumbnailCount: thumbnailCache.size,
    ongoingDecodes: ongoingDecodes.size,
    workers: workerPool.length,
    availableWorkers: availableWorkers.length,
    pendingRequests: pendingRequests.length,
  };
}

/**
 * Check if a file extension is a RAW format
 */
export function isRawExtension(extension: string): boolean {
  const rawExts = ['ARW', 'CR2', 'NEF', 'DNG', 'ORF', 'RAF', 'SRW'];
  return rawExts.includes(extension.toUpperCase());
}

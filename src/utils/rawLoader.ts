import LibRaw from 'libraw-wasm';
import { readFile } from '@tauri-apps/plugin-fs';

// Cache for decoded RAW images (only store full decode result)
const rawImageCache = new Map<string, string>();

// Track ongoing decode operations to prevent duplicate work
const ongoingDecodes = new Map<string, Promise<string>>();

/**
 * Decode a RAW file and return a data URL for display
 * @param filePath - Path to the RAW file
 * @param thumbnail - If true, generates a smaller thumbnail (faster)
 */
export async function decodeRawFile(filePath: string, thumbnail: boolean = false): Promise<string> {
  const startTime = performance.now();
  
  // Check cache first - we only cache the full decode
  if (rawImageCache.has(filePath)) {
    const cachedDataUrl = rawImageCache.get(filePath)!;
    
    // If requesting thumbnail, scale down the cached full image
    if (thumbnail) {
      console.log(`[RAW Cache Hit] Generating thumbnail from cached full image`);
      const thumbnailUrl = await createThumbnailFromDataUrl(cachedDataUrl);
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
      return createThumbnailFromDataUrl(fullDataUrl);
    }
    return fullDataUrl;
  }
  
  // Start new decode operation (always decode full size)
  const decodePromise = (async () => {
  try {
    // Read the file using Tauri's filesystem API
    const t1 = performance.now();
    const fileBuffer = await readFile(filePath);
    console.log(`[RAW] 1. File read: ${(performance.now() - t1).toFixed(1)}ms (${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB)`);
    
    // Instantiate LibRaw
    const t2 = performance.now();
    const raw = new LibRaw();
    console.log(`[RAW] 2. LibRaw init: ${(performance.now() - t2).toFixed(1)}ms`);
    
    // Always use fast settings (we'll decode once and scale for thumbnails)
    const settings = {
      halfSize: true,        // Use half size for faster decoding
      outputBps: 8,
      useAutoWb: false,      // Skip auto WB for speed
      useCameraWb: true,     // Use camera WB (faster)
      outputColor: 1,        // sRGB
      userQual: 1,           // Fast interpolation (1 = VNG, good balance)
      medPasses: 0,          // Disable median filter
      fbddNoiserd: 0,        // Disable noise reduction
    };
    
    // Open (decode) the RAW file
    const t3 = performance.now();
    await raw.open(new Uint8Array(fileBuffer), settings);
    console.log(`[RAW] 3. RAW decode: ${(performance.now() - t3).toFixed(1)}ms`);

    // Get the decoded image data (returns object with pixel data)
    const t4 = performance.now();
    const imageData = await raw.imageData();
    console.log(`[RAW] 4. Get imageData: ${(performance.now() - t4).toFixed(1)}ms`);
    
    // Extract the actual pixel data array
    const t5 = performance.now();
    let pixelData: Uint8Array | number[] | undefined;
    if (imageData && typeof imageData === 'object') {
      // Try different possible property names
      pixelData = (imageData as any).data || (imageData as any).buffer || (imageData as any).pixels;
      
      // If it's still an object, it might be the Uint8Array itself
      if (!pixelData && imageData.length !== undefined) {
        pixelData = imageData as any;
      }
    }
    
    if (!pixelData || pixelData.length === 0) {
      throw new Error('No image data returned from RAW decoder');
    }
    console.log(`[RAW] 5. Extract pixel data: ${(performance.now() - t5).toFixed(1)}ms (${pixelData.length} bytes)`);
    
    // Get metadata
    const t6 = performance.now();
    const metadata = await raw.metadata(false);
    console.log(`[RAW] 6. Get metadata: ${(performance.now() - t6).toFixed(1)}ms`);
    
    // Use dimensions from metadata
    const width = metadata.width || metadata.sizes?.width;
    const height = metadata.height || metadata.sizes?.height;
    
    if (!width || !height) {
      throw new Error(`Invalid dimensions: ${width}x${height}`);
    }
    
    // For thumbnails, create a smaller canvas
    const t7 = performance.now();
    
    if (thumbnail) {
      // Scale down to filmstrip size (max 320px width)
      const maxWidth = 320;
      if (width > maxWidth) {
        const scale = maxWidth / width;
        const canvasWidth = maxWidth;
        const canvasHeight = Math.round(height * scale);
        console.log(`[RAW] 7. Calculate dimensions: ${(performance.now() - t7).toFixed(1)}ms - ${canvasWidth}x${canvasHeight}`);
      } else {
        console.log(`[RAW] 7. Calculate dimensions: ${(performance.now() - t7).toFixed(1)}ms - ${width}x${height}`);
      }
    } else {
      console.log(`[RAW] 7. Calculate dimensions: ${(performance.now() - t7).toFixed(1)}ms - ${width}x${height}`);
    }
    
    // Create canvas for full-size image
    const t8 = performance.now();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Create ImageData from the raw pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      throw new Error('Failed to get temp canvas context');
    }
    
    const imgData = tempCtx.createImageData(width, height);
    const rgbaData = imgData.data;
    const pixels = width * height;
    
    // Attempt to use faster bulk operations if possible
    // Unfortunately, we MUST interleave: RGB -> RGBA requires inserting alpha every 3 bytes
    // There's no TypedArray method that can do this without iteration
    
    // Best optimization: Unrolled loop with direct indexing (no increment operations)
    let si = 0; // source index
    let di = 0; // destination index
    const limit = pixels - (pixels % 8); // Process 8 pixels at once
    
    // Process 8 pixels per iteration for better CPU cache utilization
    for (let p = 0; p < limit; p += 8) {
      rgbaData[di] = pixelData[si]; rgbaData[di+1] = pixelData[si+1]; rgbaData[di+2] = pixelData[si+2]; rgbaData[di+3] = 255;
      rgbaData[di+4] = pixelData[si+3]; rgbaData[di+5] = pixelData[si+4]; rgbaData[di+6] = pixelData[si+5]; rgbaData[di+7] = 255;
      rgbaData[di+8] = pixelData[si+6]; rgbaData[di+9] = pixelData[si+7]; rgbaData[di+10] = pixelData[si+8]; rgbaData[di+11] = 255;
      rgbaData[di+12] = pixelData[si+9]; rgbaData[di+13] = pixelData[si+10]; rgbaData[di+14] = pixelData[si+11]; rgbaData[di+15] = 255;
      rgbaData[di+16] = pixelData[si+12]; rgbaData[di+17] = pixelData[si+13]; rgbaData[di+18] = pixelData[si+14]; rgbaData[di+19] = 255;
      rgbaData[di+20] = pixelData[si+15]; rgbaData[di+21] = pixelData[si+16]; rgbaData[di+22] = pixelData[si+17]; rgbaData[di+23] = 255;
      rgbaData[di+24] = pixelData[si+18]; rgbaData[di+25] = pixelData[si+19]; rgbaData[di+26] = pixelData[si+20]; rgbaData[di+27] = 255;
      rgbaData[di+28] = pixelData[si+21]; rgbaData[di+29] = pixelData[si+22]; rgbaData[di+30] = pixelData[si+23]; rgbaData[di+31] = 255;
      si += 24; di += 32;
    }
    
    // Handle remaining pixels
    for (let p = limit; p < pixels; p++) {
      rgbaData[di++] = pixelData[si++];
      rgbaData[di++] = pixelData[si++];
      rgbaData[di++] = pixelData[si++];
      rgbaData[di++] = 255;
    }

    tempCtx.putImageData(imgData, 0, 0);
    console.log(`[RAW] 8. RGB->RGBA conversion + putImageData: ${(performance.now() - t8).toFixed(1)}ms`);
    
    // Draw to final canvas
    const t9 = performance.now();
    ctx.drawImage(tempCanvas, 0, 0);
    console.log(`[RAW] 9. Canvas draw: ${(performance.now() - t9).toFixed(1)}ms`);
    
    // Convert to data URL (high quality for caching)
    const t10 = performance.now();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    console.log(`[RAW] 10. toDataURL: ${(performance.now() - t10).toFixed(1)}ms`);
    
    // Cache the full-size result
    rawImageCache.set(filePath, dataUrl);
    
    console.log(`[RAW TOTAL] Full decode completed in ${(performance.now() - startTime).toFixed(1)}ms`);
    console.log('---');
    
    return dataUrl;
  } catch (error) {
    console.error('Failed to decode RAW file:', error);
    throw error;
  } finally {
    // Clean up ongoing decode tracking
    ongoingDecodes.delete(filePath);
  }
  })();
  
  // Store the promise to prevent duplicate work
  ongoingDecodes.set(filePath, decodePromise);
  
  // Wait for decode to complete
  const fullDataUrl = await decodePromise;
  
  // If thumbnail requested, scale down from the full image
  if (thumbnail) {
    const thumbStart = performance.now();
    const thumbnailUrl = await createThumbnailFromDataUrl(fullDataUrl);
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
      // Scale down to max 320px width
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
 * Clear the RAW image cache
 */
export function clearRawCache() {
  rawImageCache.clear();
}

/**
 * Check if a file extension is a RAW format
 */
export function isRawExtension(extension: string): boolean {
  const rawExts = ['ARW', 'CR2', 'NEF', 'DNG', 'ORF', 'RAF', 'SRW'];
  return rawExts.includes(extension.toUpperCase());
}
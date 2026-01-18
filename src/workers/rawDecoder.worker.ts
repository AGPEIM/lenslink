import LibRaw from 'libraw-wasm';

// Worker message types
interface DecodeRequest {
  type: 'decode';
  id: string;
  fileBuffer: ArrayBuffer;
  thumbnail: boolean;
}

interface DecodeResponse {
  type: 'success' | 'error';
  id: string;
  dataUrl?: string;
  error?: string;
  timing?: {
    total: number;
    fileRead: number;
    decode: number;
    conversion: number;
  };
}

// Handle messages from main thread
self.onmessage = async (e: MessageEvent<DecodeRequest>) => {
  const { type, id, fileBuffer, thumbnail } = e.data;

  if (type !== 'decode') {
    return;
  }

  const startTime = performance.now();
  const timing = {
    total: 0,
    fileRead: 0,
    decode: 0,
    conversion: 0,
  };

  try {
    // Initialize LibRaw
    const t1 = performance.now();
    const raw = new LibRaw();
    timing.fileRead = performance.now() - t1;

    // Configure settings for fast decoding
    const settings = {
      halfSize: true,        // Use half size for faster decoding
      outputBps: 8,
      useAutoWb: false,      // Skip auto WB for speed
      useCameraWb: true,     // Use camera WB (faster)
      outputColor: 1,        // sRGB
      userQual: 1,           // Fast interpolation (VNG)
      medPasses: 0,          // Disable median filter
      fbddNoiserd: 0,        // Disable noise reduction
    };

    // Decode the RAW file
    const t2 = performance.now();
    await raw.open(new Uint8Array(fileBuffer), settings);
    timing.decode = performance.now() - t2;

    // Get image data
    const t3 = performance.now();
    const imageData = await raw.imageData();
    const metadata = await raw.metadata(false);

    // Extract pixel data
    let pixelData: Uint8Array | number[] | undefined;
    if (imageData && typeof imageData === 'object') {
      pixelData = (imageData as any).data || (imageData as any).buffer || (imageData as any).pixels;
      if (!pixelData && imageData.length !== undefined) {
        pixelData = imageData as any;
      }
    }

    if (!pixelData || pixelData.length === 0) {
      throw new Error('No image data returned from RAW decoder');
    }

    // Get dimensions
    const width = metadata.width || metadata.sizes?.width;
    const height = metadata.height || metadata.sizes?.height;

    if (!width || !height) {
      throw new Error(`Invalid dimensions: ${width}x${height}`);
    }

    // Create canvas for rendering
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Convert RGB to RGBA
    const imgData = ctx.createImageData(width, height);
    const rgbaData = imgData.data;
    const pixels = width * height;

    // Optimized RGB→RGBA conversion (unrolled loop)
    let si = 0; // source index
    let di = 0; // destination index
    const limit = pixels - (pixels % 8);

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

    ctx.putImageData(imgData, 0, 0);

    // Scale down for thumbnail if requested
    let finalCanvas = canvas;
    if (thumbnail) {
      const maxWidth = 320;
      if (width > maxWidth) {
        const scale = maxWidth / width;
        const thumbWidth = maxWidth;
        const thumbHeight = Math.round(height * scale);
        const thumbCanvas = new OffscreenCanvas(thumbWidth, thumbHeight);
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
          finalCanvas = thumbCanvas;
        }
      }
    }

    // Convert to blob and then to data URL
    const blob = await finalCanvas.convertToBlob({ type: 'image/jpeg', quality: thumbnail ? 0.7 : 0.92 });
    const dataUrl = await blobToDataURL(blob);

    timing.conversion = performance.now() - t3;
    timing.total = performance.now() - startTime;

    // Send success response
    const response: DecodeResponse = {
      type: 'success',
      id,
      dataUrl,
      timing,
    };
    self.postMessage(response);

  } catch (error) {
    // Send error response
    const response: DecodeResponse = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};

// Helper function to convert Blob to Data URL
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Export empty object to make TypeScript happy
export {};

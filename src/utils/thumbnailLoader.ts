const cache = new Map<string, string>();
const queue: (() => void)[] = [];
let active = 0;

function drain() {
  while (active < 2 && queue.length) queue.shift()!();
}

export function loadJpgThumbnail(url: string, signal: AbortSignal): Promise<string> {
  if (signal.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
  const cached = cache.get(url);
  if (cached) {
    cache.delete(url);
    cache.set(url, cached);
    return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
      active++;
      const controller = new AbortController();
      const abort = () => controller.abort();
      const timer = setTimeout(abort, 30000);
      signal.addEventListener('abort', abort, { once: true });
      let bitmap: ImageBitmap | undefined;
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Cannot read thumbnail');
        // Decode and resize asynchronously so large JPGs do not block pointer/keyboard input.
        bitmap = await createImageBitmap(await response.blob(), { resizeWidth: 256, resizeQuality: 'low' });
        signal.throwIfAborted();
        controller.signal.throwIfAborted();
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = Math.max(1, Math.round(bitmap.height * 256 / bitmap.width));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Cannot create thumbnail');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.75);
        canvas.width = canvas.height = 0;
        cache.set(url, thumbnail);
        // ponytail: retain only 128 small previews; persistent caching can wait for larger libraries.
        while (cache.size > 128) cache.delete(cache.keys().next().value!);
        resolve(thumbnail);
      } catch (error) {
        reject(error);
      } finally {
        bitmap?.close();
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        active--;
        drain();
      }
    });
    drain();
  });
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { AutoCullResult, PhotoGroup } from '../types';
import { analyzePhoto, createFaceAnalyzer } from '../utils/autoCull';
import { photoSourceKey } from '../utils/cullingMetrics';
import { releaseRawImage } from '../utils/rawLoader';

export interface CullProgress { completed: number; total: number; filename: string; loadingModel: boolean }

export function useAutoCull(onResult: (source: string, result: AutoCullResult) => void) {
  const [progress, setProgress] = useState<CullProgress | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async (photos: PhotoGroup[]) => {
    if (controller.current || photos.length === 0) return null;
    const current = new AbortController();
    controller.current = current;
    setProgress({ completed: 0, total: photos.length, filename: '', loadingModel: true });
    const summary = { processed: 0, rejected: 0, skipped: 0, failed: 0, cancelled: false };
    let analyzer: Awaited<ReturnType<typeof createFaceAnalyzer>> | undefined;
    try {
      // Allow the progress panel to paint before initializing the local model.
      await new Promise(resolve => setTimeout(resolve, 30));
      current.signal.throwIfAborted();
      analyzer = await createFaceAnalyzer();
      for (const photo of photos) {
        current.signal.throwIfAborted();
        setProgress({ completed: summary.processed, total: photos.length, filename: photo.jpg?.name || photo.raw?.name || photo.id, loadingModel: false });
        await new Promise(resolve => setTimeout(resolve, 30));
        current.signal.throwIfAborted();
        try {
          const result = await analyzePhoto(photo, analyzer, current.signal);
          onResult(photoSourceKey(photo), result);
          if (result.issues.length) summary.rejected++;
          if (result.status !== 'analyzed') summary.skipped++;
        } catch (error) {
          if (current.signal.aborted) throw error;
          summary.failed++;
          onResult(photoSourceKey(photo), { status: 'error', faces: [], issues: [], error: error instanceof Error ? error.message : String(error) });
        } finally {
          if (!photo.jpg && photo.raw?.path) releaseRawImage(photo.raw.path);
        }
        summary.processed++;
      }
      return summary;
    } catch (error) {
      if (!current.signal.aborted) throw error;
      summary.cancelled = true;
      return summary;
    } finally {
      analyzer?.close();
      controller.current = null;
      setProgress(null);
    }
  }, [onResult]);

  return { progress, run, cancel: () => controller.current?.abort() };
}

import React, { useState, useRef, useEffect, memo } from 'react';
import { PhotoGroup } from '../types';
import { decodeRawFile, getThumbnailFromCache } from '../utils/rawLoader';
import { loadJpgThumbnail } from '../utils/thumbnailLoader';

interface LazyThumbnailProps {
  group: PhotoGroup;
  isVisible?: boolean;
}

/**
 * LazyThumbnail - 懒加载缩略图组件
 * 使用 IntersectionObserver 实现可见性检测，只在进入视口时才加载图片
 */
const LazyThumbnail: React.FC<LazyThumbnailProps> = memo(({ group, isVisible = false }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(isVisible);

  // IntersectionObserver 检测可见性
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            // 一旦进入视口，停止观察（只加载一次）
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin: '100px', // 提前100px开始加载
        threshold: 0.01,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 加载缩略图
  useEffect(() => {
    const controller = new AbortController();
    setThumbnailUrl(null);
    setHasError(false);
    if (!inView) return;
    const jpgUrl = group.jpg?.previewUrl;
    const rawPath = group.raw?.path;
    const cached = rawPath && !jpgUrl ? getThumbnailFromCache(rawPath) : null;
    if (cached) { setThumbnailUrl(cached); setIsLoading(false); return; }
    if (!jpgUrl && !rawPath) return;
    setIsLoading(true);
    const loading = jpgUrl ? loadJpgThumbnail(jpgUrl, controller.signal) : decodeRawFile(rawPath!, true);
    loading.then(url => {
      if (!controller.signal.aborted) { setThumbnailUrl(url); setIsLoading(false); }
    }).catch(error => {
      if (!controller.signal.aborted) {
        console.error('Failed to load thumbnail:', error);
        setHasError(true);
        setIsLoading(false);
      }
    });
    return () => controller.abort();
  }, [inView, group.jpg?.previewUrl, group.raw?.path]);

  return (
    <div ref={containerRef} className="w-full h-full">
      {isLoading ? (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <i className="fa-solid fa-spinner fa-spin text-zinc-600 text-xs"></i>
        </div>
      ) : hasError ? (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xs"></i>
        </div>
      ) : thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          className="w-full h-full object-cover"
          alt={group.id}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <i className="fa-solid fa-file-image text-zinc-700 text-xs"></i>
        </div>
      )}
    </div>
  );
});

LazyThumbnail.displayName = 'LazyThumbnail';

export default LazyThumbnail;

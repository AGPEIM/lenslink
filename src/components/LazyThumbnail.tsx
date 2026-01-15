import React, { useState, useRef, useEffect, memo } from 'react';
import { PhotoGroup } from '../types';
import { decodeRawFile, getThumbnailFromCache } from '../utils/rawLoader';

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
  const loadedRef = useRef(false);

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
    if (!inView || loadedRef.current) return;

    // 如果有 JPG，直接使用
    if (group.jpg?.previewUrl) {
      setThumbnailUrl(group.jpg.previewUrl);
      loadedRef.current = true;
      return;
    }

    // 如果只有 RAW，先检查缓存
    if (group.raw?.path) {
      // 先尝试从缓存获取
      const cachedThumbnail = getThumbnailFromCache(group.raw.path);
      if (cachedThumbnail) {
        setThumbnailUrl(cachedThumbnail);
        loadedRef.current = true;
        return;
      }

      // 缓存未命中，开始解码
      setIsLoading(true);
      decodeRawFile(group.raw.path, true) // true = thumbnail mode
        .then((dataUrl) => {
          setThumbnailUrl(dataUrl);
          loadedRef.current = true;
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to load RAW thumbnail:', error);
          setHasError(true);
          setIsLoading(false);
        });
    }
  }, [inView, group.id, group.jpg, group.raw]);

  // 组件重置时（group.id 改变）重置状态
  useEffect(() => {
    loadedRef.current = false;
    setThumbnailUrl(null);
    setHasError(false);
  }, [group.id]);

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

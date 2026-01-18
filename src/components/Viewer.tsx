
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhotoGroup, SelectionState } from '../types';
import { formatSize } from '../utils/fileHelpers';
import { decodeRawFile, getImageFromCache } from '../utils/rawLoader';
import { getTranslations, Language } from '../i18n';
import { useShortcuts } from '../contexts/ShortcutsContext';

interface ViewerProps {
  group: PhotoGroup;
  animationClass: string;
  onUpdateSelection?: (state: SelectionState) => void;
  theme: 'light' | 'dark';
  language?: Language;
}

const Viewer: React.FC<ViewerProps> = ({ group, animationClass, onUpdateSelection, theme, language = 'zh' }) => {
  const t = getTranslations(language);
  const { getKeyByAction } = useShortcuts();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // 使用双缓冲策略消除闪烁：保持当前显示的图片直到新图片加载完成
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const currentGroupId = useRef<string | null>(null);

  // Load image for current group (RAW decoding or JPG)
  useEffect(() => {
    // 避免重复加载同一组
    if (currentGroupId.current === group.id && displayUrl) {
      return;
    }
    currentGroupId.current = group.id;

    // 如果有 JPG，直接使用（不需要闪烁处理）
    if (group.jpg) {
      setDisplayUrl(group.jpg.previewUrl);
      setIsLoadingRaw(false);
      setRawError(null);
      setImageReady(true);
      return;
    }

    // 只有 RAW 文件时，需要解码
    if (group.raw && group.raw.path) {
      // 先检查缓存
      const cachedUrl = getImageFromCache(group.raw.path);
      if (cachedUrl) {
        setDisplayUrl(cachedUrl);
        setIsLoadingRaw(false);
        setRawError(null);
        setImageReady(true);
        return;
      }

      // 缓存未命中，开始解码（但保持当前图片显示）
      setIsLoadingRaw(true);
      setRawError(null);
      
      decodeRawFile(group.raw.path, false) // false = full quality for viewer
        .then(dataUrl => {
          // 只有当这个请求仍然是当前组时才更新
          if (currentGroupId.current === group.id) {
            setNextUrl(dataUrl);
          }
        })
        .catch(error => {
          console.error('Failed to load RAW preview:', error);
          if (currentGroupId.current === group.id) {
            setRawError(error.message || 'Failed to decode RAW file');
            setIsLoadingRaw(false);
          }
        });
    } else {
      // 没有可显示的图片
      setDisplayUrl(null);
      setIsLoadingRaw(false);
      setRawError(null);
      setImageReady(false);
    }
  }, [group.id, group.jpg, group.raw]);

  // 当新图片准备好时，平滑切换
  useEffect(() => {
    if (nextUrl) {
      // 预加载新图片
      const img = new Image();
      img.onload = () => {
        setDisplayUrl(nextUrl);
        setNextUrl(null);
        setIsLoadingRaw(false);
        setImageReady(true);
      };
      img.src = nextUrl;
    }
  }, [nextUrl]);

  // Reset zoom when switching photos
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [group.id]);

  // Handle wheel event with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = 0.1;
      setZoom(prevZoom => {
        const newZoom = Math.min(Math.max(prevZoom + (delta > 0 ? factor : -factor) * prevZoom, 1), 10);
        if (newZoom === 1) setOffset({ x: 0, y: 0 });
        return newZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && zoom > 1) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [isDragging, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const resetZoom = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${animationClass}`}>
      {/* Main Image Stage */}
      <div 
        ref={containerRef}
        className={`flex-1 flex items-center justify-center p-4 relative overflow-hidden cursor-crosshair ${theme === 'dark' ? 'bg-zinc-950' : 'bg-gray-100'}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={resetZoom}
      >
        <div 
          className="transition-transform duration-75 ease-out will-change-transform max-w-full max-h-full flex items-center justify-center relative"
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
        >
          {/* 主图片显示 - 使用 displayUrl 实现无闪烁切换 */}
          {displayUrl ? (
            <img 
              src={displayUrl} 
              alt={group.id}
              draggable={false}
              className={`max-w-full max-h-[calc(100vh-8rem)] w-auto h-auto object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-sm select-none transition-opacity duration-200 ${imageReady ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : isLoadingRaw && !displayUrl ? (
            // Loading RAW file (only show when no previous image to display)
            <div className="flex flex-col items-center justify-center gap-6 p-12">
              <div className="w-32 h-32 bg-indigo-600/10 rounded-full flex items-center justify-center border-4 border-indigo-600/30 animate-pulse">
                <i className="fa-solid fa-spinner fa-spin text-6xl text-indigo-400"></i>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-zinc-200">{t.viewer.rawLoading.title}</h3>
                <p className="text-zinc-400 max-w-md leading-relaxed">
                  {t.viewer.rawLoading.processing} <span className="text-indigo-400 font-semibold">{group.raw?.extension}</span> {t.viewer.rawLoading.file}
                </p>
                <p className="text-sm text-zinc-500">{group.raw?.name}</p>
              </div>
            </div>
          ) : rawError ? (
            // Error loading RAW
            <div className="flex flex-col items-center justify-center gap-6 p-12 bg-zinc-900/50 rounded-2xl border-2 border-dashed border-rose-700/50 shadow-2xl">
              <div className="w-32 h-32 bg-rose-600/10 rounded-full flex items-center justify-center border-4 border-rose-600/30">
                <i className="fa-solid fa-triangle-exclamation text-6xl text-rose-400"></i>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-zinc-200">{t.viewer.rawError.title}</h3>
                <p className="text-zinc-400 max-w-md leading-relaxed">
                  {t.viewer.rawError.couldNotProcess} <span className="text-rose-400 font-semibold">{group.raw?.extension}</span> {t.viewer.rawError.file}
                </p>
                <p className="text-sm text-zinc-500 font-mono">{rawError}</p>
                <div className="pt-4 text-sm text-zinc-500">
                  <p className="font-mono">{group.raw?.name}</p>
                  <p className="text-xs mt-1">{formatSize(group.raw?.size || 0)}</p>
                </div>
              </div>
            </div>
          ) : (
            // Fallback placeholder
            <div className="flex flex-col items-center justify-center gap-6 p-12 bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-700/50 shadow-2xl">
              <div className="w-32 h-32 bg-indigo-600/10 rounded-full flex items-center justify-center border-4 border-indigo-600/30">
                <i className="fa-solid fa-file-image text-6xl text-indigo-400"></i>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-zinc-200">{t.viewer.noPreview.title}</h3>
                <p className="text-zinc-400 max-w-md leading-relaxed">
                  {group.raw ? (
                    <>{t.viewer.noPreview.rawWithoutPreview}<br />({group.raw.extension})</>
                  ) : (
                    <>{t.viewer.noPreview.noImageFound}</>
                  )}
                </p>
              </div>
            </div>
          )}
          
          {/* 加载指示器覆盖层 - 当有图片显示但正在加载新图片时 */}
          {isLoadingRaw && displayUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-sm">
              <div className="bg-black/60 px-4 py-2 rounded-full flex items-center gap-2">
                <i className="fa-solid fa-spinner fa-spin text-indigo-400"></i>
                <span className="text-sm text-zinc-300">{t.viewer.rawLoading.title}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Zoom Controls Overlay */}
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 backdrop-blur-md px-3 py-2 rounded-full border shadow-2xl z-20 ${theme === 'dark' ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-gray-300'}`}>
          <button 
            onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-200 text-gray-600'}`}
          >
            <i className="fa-solid fa-magnifying-glass-minus"></i>
          </button>
          <span className={`text-[10px] font-mono font-bold min-w-[40px] text-center ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={() => setZoom(z => Math.min(z + 0.5, 10))}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-200 text-gray-600'}`}
          >
            <i className="fa-solid fa-magnifying-glass-plus"></i>
          </button>
          <div className={`w-px h-4 mx-1 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-300'}`}></div>
          <button 
            onClick={resetZoom}
            className="px-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {t.viewer.zoom.reset}
          </button>
        </div>

        {/* Quick Selection Status Overlay */}
        <div className="absolute top-10 right-10 pointer-events-none z-20">
           {group.selection === SelectionState.PICKED && (
             <div className="bg-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
               <i className="fa-solid fa-check"></i> {t.viewer.statusLabel.picked}
             </div>
           )}
           {group.selection === SelectionState.REJECTED && (
             <div className="bg-rose-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
               <i className="fa-solid fa-xmark"></i> {t.viewer.statusLabel.rejected}
             </div>
           )}
        </div>
      </div>

      {/* Info Panel */}
      <div className={`w-80 border-l flex flex-col backdrop-blur-sm ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white/50 border-gray-200'}`}>
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
        <section>
          <h2 className={`text-xl font-bold mb-1 truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} title={group.id}>{group.id}</h2>
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              group.status === 'COMPLETE' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
            }`}>
              {group.status.replace('_', ' ')}
            </span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <ExifTile icon="fa-stopwatch" label={t.viewer.exif.shutter} value={group.exif?.shutterSpeed} theme={theme} />
          <ExifTile icon="fa-circle-dot" label={t.viewer.exif.aperture} value={group.exif?.aperture} theme={theme} />
          <ExifTile icon="fa-camera" label={t.viewer.exif.iso} value={group.exif?.iso} theme={theme} />
          <ExifTile icon="fa-arrows-left-right" label={t.viewer.exif.focal} value={group.exif?.focalLength} theme={theme} />
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <p className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>{t.viewer.exif.device}</p>
            <p className={`text-sm ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-700'}`}>{group.exif?.model || '--'}</p>
          </div>
          <div className="space-y-1">
            <p className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>{t.viewer.exif.optics}</p>
            <p className={`text-sm ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-700'}`}>{group.exif?.lens || '--'}</p>
          </div>
          <div className="space-y-1">
             <p className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>{t.viewer.exif.timestamp}</p>
             <p className={`text-sm ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-700'}`}>{group.exif?.dateTime || '--'}</p>
          </div>
        </section>

        <section className={`space-y-2 pt-6 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
          <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>{t.viewer.files.bundleFiles}</p>
          {group.jpg && <FileItem ext="JPG" size={formatSize(group.jpg.size)} theme={theme} />}
          {group.raw && <FileItem ext={group.raw.extension} size={formatSize(group.raw.size)} isRaw theme={theme} />}
        </section>
        
        </div>

        {/* Fixed Rating Actions at bottom */}
        <section className={`border-t p-4 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/80' : 'border-gray-200 bg-white/80'}`}>
          <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>{t.viewer.rating.title}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onUpdateSelection?.(SelectionState.PICKED)}
              className={`group relative flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                group.selection === SelectionState.PICKED
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                  : (theme === 'dark'
                      ? 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-emerald-500/10 hover:border-emerald-500/50'
                      : 'bg-gray-100/60 border-gray-300/50 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300')
              }`}
              title={`${t.viewer.rating.pressPToPick.replace('P', getKeyByAction('mark_picked')?.displayKey || 'P')}`}
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-flag text-base"></i>
                <span className="font-semibold text-sm">{t.viewer.rating.pick}</span>
              </span>
              <kbd className={`px-2 py-1 text-[10px] font-mono font-bold border rounded transition-colors ${
                group.selection === SelectionState.PICKED
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : (theme === 'dark' ? 'bg-zinc-900/50 border-zinc-700/50 group-hover:bg-zinc-900' : 'bg-white border-gray-300 group-hover:bg-gray-50')
              }`}>{getKeyByAction('mark_picked')?.displayKey || 'P'}</kbd>
            </button>

            <button
              onClick={() => onUpdateSelection?.(SelectionState.UNMARKED)}
              className={`group relative flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                group.selection === SelectionState.UNMARKED
                  ? (theme === 'dark'
                      ? 'bg-zinc-700 border-zinc-600 text-white shadow-lg'
                      : 'bg-gray-200 border-gray-400 text-gray-900 shadow-md')
                  : (theme === 'dark'
                      ? 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/20 hover:border-zinc-600/50'
                      : 'bg-gray-100/60 border-gray-300/50 text-gray-700 hover:bg-gray-200/60 hover:border-gray-400/50')
              }`}
              title={`${t.viewer.rating.pressUToUnmark.replace('U', getKeyByAction('mark_unmarked')?.displayKey || 'U')}`}
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-circle-dot text-base"></i>
                <span className="font-semibold text-sm">{t.viewer.rating.unmark}</span>
              </span>
              <kbd className={`px-2 py-1 text-[10px] font-mono font-bold border rounded transition-colors ${
                group.selection === SelectionState.UNMARKED
                  ? (theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-gray-300 border-gray-400 text-gray-800')
                  : (theme === 'dark' ? 'bg-zinc-900/50 border-zinc-700/50 group-hover:bg-zinc-900' : 'bg-white border-gray-300 group-hover:bg-gray-50')
              }`}>{getKeyByAction('mark_unmarked')?.displayKey || 'U'}</kbd>
            </button>

            <button
              onClick={() => onUpdateSelection?.(SelectionState.REJECTED)}
              className={`group relative flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                group.selection === SelectionState.REJECTED
                  ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/30'
                  : (theme === 'dark'
                      ? 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-rose-500/10 hover:border-rose-500/50'
                      : 'bg-gray-100/60 border-gray-300/50 text-gray-700 hover:bg-rose-50 hover:border-rose-300')
              }`}
              title={`${t.viewer.rating.pressXToReject.replace('X', getKeyByAction('mark_rejected')?.displayKey || 'X')}`}
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-trash-can text-base"></i>
                <span className="font-semibold text-sm">{t.viewer.rating.reject}</span>
              </span>
              <kbd className={`px-2 py-1 text-[10px] font-mono font-bold border rounded transition-colors ${
                group.selection === SelectionState.REJECTED
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : (theme === 'dark' ? 'bg-zinc-900/50 border-zinc-700/50 group-hover:bg-zinc-900' : 'bg-white border-gray-300 group-hover:bg-gray-50')
              }`}>{getKeyByAction('mark_rejected')?.displayKey || 'X'}</kbd>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

const ExifTile = ({ icon, label, value, theme }: { icon: string, label: string, value?: string, theme: 'light' | 'dark' }) => (
  <div className={`border p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-800/40 border-zinc-700/30' : 'bg-gray-100/60 border-gray-300/30'}`}>
    <div className={`flex items-center gap-2 mb-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
      <i className={`fa-solid ${icon} text-[10px]`}></i>
      <span className="text-[9px] uppercase font-bold">{label}</span>
    </div>
    <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-800'}`}>{value || '--'}</div>
  </div>
);

const FileItem = ({ ext, size, isRaw, theme }: { ext: string, size: string, isRaw?: boolean, theme: 'light' | 'dark' }) => (
  <div className={`flex items-center justify-between p-2 rounded border text-xs ${theme === 'dark' ? 'bg-zinc-800/30 border-zinc-700/20' : 'bg-gray-100/60 border-gray-300/20'}`}>
    <span className={isRaw ? 'text-indigo-400 font-bold' : (theme === 'dark' ? 'text-zinc-400' : 'text-gray-600')}>{ext}</span>
    <span className={`font-mono ${theme === 'dark' ? 'text-zinc-600' : 'text-gray-500'}`}>{size}</span>
  </div>
);

export default Viewer;

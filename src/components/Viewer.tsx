
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhotoGroup, SelectionState } from '../types';
import { formatSize } from '../utils/fileHelpers';
import { decodeRawFile } from '../utils/rawLoader';

interface ViewerProps {
  group: PhotoGroup;
  animationClass: string;
  onUpdateSelection?: (state: SelectionState) => void;
}

const Viewer: React.FC<ViewerProps> = ({ group, animationClass, onUpdateSelection }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null);
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Load RAW preview if no JPG is available
  useEffect(() => {
    if (!group.jpg && group.raw && group.raw.path) {
      setIsLoadingRaw(true);
      setRawError(null);
      setRawPreviewUrl(null);
      
      decodeRawFile(group.raw.path, false) // false = full quality for viewer
        .then(dataUrl => {
          setRawPreviewUrl(dataUrl);
          setIsLoadingRaw(false);
        })
        .catch(error => {
          console.error('Failed to load RAW preview:', error);
          setRawError(error.message || 'Failed to decode RAW file');
          setIsLoadingRaw(false);
        });
    } else {
      setRawPreviewUrl(null);
      setIsLoadingRaw(false);
      setRawError(null);
    }
  }, [group.id, group.jpg, group.raw]);

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
        className="flex-1 bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden cursor-crosshair"
        onMouseDown={handleMouseDown}
        onDoubleClick={resetZoom}
      >
        <div 
          className="transition-transform duration-75 ease-out will-change-transform max-w-full max-h-full flex items-center justify-center"
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
        >
          {group.jpg ? (
            <img 
              src={group.jpg.previewUrl} 
              alt={group.id}
              draggable={false}
              className="max-w-full max-h-[calc(100vh-8rem)] w-auto h-auto object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-sm select-none"
            />
          ) : isLoadingRaw ? (
            // Loading RAW file
            <div className="flex flex-col items-center justify-center gap-6 p-12">
              <div className="w-32 h-32 bg-indigo-600/10 rounded-full flex items-center justify-center border-4 border-indigo-600/30 animate-pulse">
                <i className="fa-solid fa-spinner fa-spin text-6xl text-indigo-400"></i>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-zinc-200">Decoding RAW File...</h3>
                <p className="text-zinc-400 max-w-md leading-relaxed">
                  Processing <span className="text-indigo-400 font-semibold">{group.raw?.extension}</span> file
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
                <h3 className="text-2xl font-bold text-zinc-200">Failed to Decode RAW</h3>
                <p className="text-zinc-400 max-w-md leading-relaxed">
                  Could not process <span className="text-rose-400 font-semibold">{group.raw?.extension}</span> file
                </p>
                <p className="text-sm text-zinc-500 font-mono">{rawError}</p>
                <div className="pt-4 text-sm text-zinc-500">
                  <p className="font-mono">{group.raw?.name}</p>
                  <p className="text-xs mt-1">{formatSize(group.raw?.size || 0)}</p>
                </div>
              </div>
            </div>
          ) : rawPreviewUrl ? (
            // RAW preview successfully decoded
            <img 
              src={rawPreviewUrl} 
              alt={group.id}
              draggable={false}
              className="max-w-full max-h-[calc(100vh-8rem)] w-auto h-auto object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-sm select-none"
            />
          ) : (
            // Fallback placeholder
            <div className="flex flex-col items-center justify-center gap-6 p-12 bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-700/50 shadow-2xl">
              <div className="w-32 h-32 bg-indigo-600/10 rounded-full flex items-center justify-center border-4 border-indigo-600/30">
                <i className="fa-solid fa-file-image text-6xl text-indigo-400"></i>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-zinc-200">No Preview Available</h3>
                <p className="text-zinc-400 max-w-md leading-relaxed">
                  {group.raw ? (
                    <>RAW file without preview<br />({group.raw.extension})</>
                  ) : (
                    <>No image file found</>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Zoom Controls Overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-3 py-2 rounded-full border border-zinc-800 shadow-2xl z-20">
          <button 
            onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <i className="fa-solid fa-magnifying-glass-minus"></i>
          </button>
          <span className="text-[10px] font-mono font-bold text-zinc-500 min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={() => setZoom(z => Math.min(z + 0.5, 10))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <i className="fa-solid fa-magnifying-glass-plus"></i>
          </button>
          <div className="w-px h-4 bg-zinc-800 mx-1"></div>
          <button 
            onClick={resetZoom}
            className="px-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            RESET
          </button>
        </div>

        {/* Quick Selection Status Overlay */}
        <div className="absolute top-10 right-10 pointer-events-none z-20">
           {group.selection === SelectionState.PICKED && (
             <div className="bg-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
               <i className="fa-solid fa-check"></i> PICKED
             </div>
           )}
           {group.selection === SelectionState.REJECTED && (
             <div className="bg-rose-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
               <i className="fa-solid fa-xmark"></i> REJECTED
             </div>
           )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="w-80 bg-zinc-900/50 border-l border-zinc-800 flex flex-col backdrop-blur-sm">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
        <section>
          <h2 className="text-xl font-bold text-white mb-1 truncate" title={group.id}>{group.id}</h2>
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              group.status === 'COMPLETE' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
            }`}>
              {group.status.replace('_', ' ')}
            </span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <ExifTile icon="fa-stopwatch" label="Shutter" value={group.exif?.shutterSpeed} />
          <ExifTile icon="fa-circle-dot" label="Aperture" value={group.exif?.aperture} />
          <ExifTile icon="fa-camera" label="ISO" value={group.exif?.iso} />
          <ExifTile icon="fa-arrows-left-right" label="Focal" value={group.exif?.focalLength} />
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Device</p>
            <p className="text-sm text-zinc-200">{group.exif?.model}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Optics</p>
            <p className="text-sm text-zinc-200">{group.exif?.lens}</p>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Timestamp</p>
             <p className="text-sm text-zinc-200">{group.exif?.dateTime}</p>
          </div>
        </section>

        <section className="space-y-2 pt-6 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Bundle Files</p>
          {group.jpg && <FileItem ext="JPG" size={formatSize(group.jpg.size)} />}
          {group.raw && <FileItem ext={group.raw.extension} size={formatSize(group.raw.size)} isRaw />}
        </section>
        
        <div className="pt-4 text-[10px] text-zinc-500 italic leading-relaxed">
          <p>• Use Mouse Wheel to zoom</p>
          <p>• Click & Drag to pan when zoomed</p>
          <p>• Double-click to reset view</p>
        </div>
        </div>

        {/* Fixed Rating Actions at bottom */}
        <section className="border-t border-zinc-800 p-4 bg-zinc-900/80">
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Quick Rating</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onUpdateSelection?.(SelectionState.PICKED)}
              className={`group relative flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                group.selection === SelectionState.PICKED
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-emerald-500/10 hover:border-emerald-500/50'
              }`}
              title="Press P to pick"
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-flag text-base"></i>
                <span className="font-semibold text-sm">Pick</span>
              </span>
              <kbd className="px-2 py-1 text-[10px] font-mono font-bold bg-zinc-900/50 border border-zinc-700/50 rounded group-hover:bg-zinc-900 transition-colors">P</kbd>
            </button>

            <button
              onClick={() => onUpdateSelection?.(SelectionState.UNMARKED)}
              className={`group relative flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                group.selection === SelectionState.UNMARKED
                  ? 'bg-zinc-700 border-zinc-600 text-white shadow-lg'
                  : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/20 hover:border-zinc-600/50'
              }`}
              title="Press U to unmark"
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-circle-dot text-base"></i>
                <span className="font-semibold text-sm">Unmark</span>
              </span>
              <kbd className="px-2 py-1 text-[10px] font-mono font-bold bg-zinc-900/50 border border-zinc-700/50 rounded group-hover:bg-zinc-900 transition-colors">U</kbd>
            </button>

            <button
              onClick={() => onUpdateSelection?.(SelectionState.REJECTED)}
              className={`group relative flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                group.selection === SelectionState.REJECTED
                  ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-rose-500/10 hover:border-rose-500/50'
              }`}
              title="Press X to reject"
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-trash-can text-base"></i>
                <span className="font-semibold text-sm">Reject</span>
              </span>
              <kbd className="px-2 py-1 text-[10px] font-mono font-bold bg-zinc-900/50 border border-zinc-700/50 rounded group-hover:bg-zinc-900 transition-colors">X</kbd>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

const ExifTile = ({ icon, label, value }: { icon: string, label: string, value?: string }) => (
  <div className="bg-zinc-800/40 border border-zinc-700/30 p-3 rounded-lg">
    <div className="flex items-center gap-2 mb-1 text-zinc-500">
      <i className={`fa-solid ${icon} text-[10px]`}></i>
      <span className="text-[9px] uppercase font-bold">{label}</span>
    </div>
    <div className="text-sm font-semibold text-zinc-100">{value || '--'}</div>
  </div>
);

const FileItem = ({ ext, size, isRaw }: { ext: string, size: string, isRaw?: boolean }) => (
  <div className="flex items-center justify-between p-2 bg-zinc-800/30 rounded border border-zinc-700/20 text-xs">
    <span className={isRaw ? 'text-indigo-400 font-bold' : 'text-zinc-400'}>{ext}</span>
    <span className="text-zinc-600 font-mono">{size}</span>
  </div>
);

export default Viewer;

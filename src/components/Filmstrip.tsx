import React, { useRef, useLayoutEffect, useState } from 'react';
import { PhotoGroup, SelectionState, SelectionMode } from '../types';
import LazyThumbnail from './LazyThumbnail';
import { filmstripRange, THUMBNAIL_WIDTH, THUMBNAIL_STRIDE, FILMSTRIP_PADDING } from '../utils/filmstripRange';

interface FilmstripProps {
  theme: 'light' | 'dark';
  filteredPhotos: PhotoGroup[];
  selectedIndex: number | null;
  onSelectPhoto: (index: number) => void;
  selectionMode: SelectionMode;
}

export const Filmstrip: React.FC<FilmstripProps> = ({
  theme,
  filteredPhotos,
  selectedIndex,
  onSelectPhoto,
  selectionMode,
}) => {
  const filmstripRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const element = filmstripRef.current;
    if (!element) return;
    const resize = new ResizeObserver(() => setViewport({ left: element.scrollLeft, width: element.clientWidth }));
    resize.observe(element);
    return () => resize.disconnect();
  }, []);

  // Keep navigation independent of whether the selected thumbnail is mounted.
  useLayoutEffect(() => {
    const element = filmstripRef.current;
    if (!element || selectedIndex === null) return;
    const left = FILMSTRIP_PADDING + selectedIndex * THUMBNAIL_STRIDE;
    if (left < element.scrollLeft + FILMSTRIP_PADDING || left + THUMBNAIL_WIDTH > element.scrollLeft + element.clientWidth - FILMSTRIP_PADDING) {
      element.scrollLeft = left - (element.clientWidth - THUMBNAIL_WIDTH) / 2;
    }
    setViewport({ left: element.scrollLeft, width: element.clientWidth });
  }, [selectedIndex, filteredPhotos.length]);

  const { start, end } = filmstripRange(filteredPhotos.length, viewport.left, viewport.width);

  // Handle mouse wheel event for photo navigation
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); // Prevent default vertical scroll behavior
    if (selectedIndex === null || filteredPhotos.length <= 1) return;

    if (e.deltaY > 0) {
      // Scroll down - go to next photo
      const nextIndex = (selectedIndex + 1) % filteredPhotos.length;
      onSelectPhoto(nextIndex);
    } else {
      // Scroll up - go to previous photo
      const prevIndex = (selectedIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
      onSelectPhoto(prevIndex);
    }
  };

  return (
    <div
      className={`h-28 flex-shrink-0 border-t px-4 overflow-x-auto overflow-y-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'}`}
      ref={filmstripRef}
      onWheel={handleWheel}
      onScroll={event => setViewport({ left: event.currentTarget.scrollLeft, width: event.currentTarget.clientWidth })}
      data-testid="filmstrip"
    >
      <div className="relative h-full" style={{ width: Math.max(0, filteredPhotos.length * THUMBNAIL_STRIDE - 8) }}>
      {filteredPhotos.slice(start, end).map((p, offset) => {
        const idx = start + offset;
        return (
        <button
          key={p.jpg?.path || p.raw?.path || p.id}
          onClick={() => onSelectPhoto(idx)}
          aria-label={p.id}
          aria-pressed={selectedIndex === idx}
          aria-posinset={idx + 1}
          aria-setsize={filteredPhotos.length}
          style={{ left: idx * THUMBNAIL_STRIDE, top: 14 }}
          className={`h-20 w-32 absolute rounded-md overflow-hidden border-2 transition-colors group ${
            selectedIndex === idx ? 'border-indigo-500 scale-105 z-10' : 'border-transparent opacity-60 hover:opacity-100 hover:border-zinc-700'
          }`}
        >
          <LazyThumbnail group={p} />

          {/* Selection Marker */}
          {selectionMode === 'pick_reject' && p.selection === SelectionState.PICKED && <div className="absolute inset-0 border-4 border-emerald-400 bg-emerald-500/30 flex items-center justify-center"><i className="fa-solid fa-flag text-emerald-300 text-sm drop-shadow-md"></i></div>}
          {selectionMode === 'pick_reject' && p.selection === SelectionState.REJECTED && <div className="absolute inset-0 border-4 border-rose-400 bg-rose-500/35 flex items-center justify-center"><i className="fa-solid fa-xmark text-rose-300 text-sm drop-shadow-md"></i></div>}
          {selectionMode === 'rating' && p.rating > 0 && (
            <div className="absolute inset-0 bg-amber-500/15 flex items-center justify-center gap-0.5">
              {Array.from({ length: p.rating }, (_, i) => (
                <i key={i} className="fa-solid fa-star text-amber-400 text-[8px]"></i>
              ))}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 backdrop-blur-sm text-[8px] text-zinc-400 font-mono truncate">
            {p.id}
          </div>
        </button>
        );
      })}
      </div>
    </div>
  );
};

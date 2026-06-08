import React, { useRef, useEffect } from 'react';
import { PhotoGroup, SelectionState, SelectionMode } from '../types';
import LazyThumbnail from './LazyThumbnail';

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

  // Scroll filmstrip to active index
  useEffect(() => {
    if (selectedIndex !== null && filmstripRef.current) {
      const activeEl = filmstripRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedIndex]);

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
      className={`h-28 border-t flex items-center px-4 gap-2 overflow-x-auto overflow-y-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'}`}
      ref={filmstripRef}
      onWheel={handleWheel}
    >
      {filteredPhotos.map((p, idx) => (
        <button
          key={p.id}
          onClick={() => onSelectPhoto(idx)}
          className={`flex-shrink-0 h-20 w-32 relative rounded-md overflow-hidden border-2 transition-all group ${
            selectedIndex === idx ? 'border-indigo-500 scale-105 z-10' : 'border-transparent opacity-60 hover:opacity-100 hover:border-zinc-700'
          }`}
        >
          <LazyThumbnail group={p} />

          {/* Selection Marker */}
          {selectionMode === 'pick_reject' && p.selection === SelectionState.PICKED && <div className="absolute inset-0 border-4 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center"><i className="fa-solid fa-flag text-emerald-500 text-xs"></i></div>}
          {selectionMode === 'pick_reject' && p.selection === SelectionState.REJECTED && <div className="absolute inset-0 border-4 border-rose-500/50 bg-rose-500/20 flex items-center justify-center"><i className="fa-solid fa-xmark text-rose-500 text-xs"></i></div>}
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
      ))}
    </div>
  );
};

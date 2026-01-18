import { useState, useCallback, useMemo } from 'react';
import { PhotoGroup, SelectionState, GroupStatus } from '../types';

type FilterType = 'ALL' | 'PICKED' | 'REJECTED' | 'UNMARKED' | 'ORPHANS';

/**
 * Custom hook for managing photo navigation and filtering
 */
export function usePhotoNavigation(photos: PhotoGroup[]) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [animationClass, setAnimationClass] = useState('');

  // Get filtered photos based on current filter
  const filteredPhotos = useMemo(() => {
    switch(filter) {
      case 'PICKED': return photos.filter(p => p.selection === SelectionState.PICKED);
      case 'REJECTED': return photos.filter(p => p.selection === SelectionState.REJECTED);
      case 'UNMARKED': return photos.filter(p => p.selection === SelectionState.UNMARKED);
      case 'ORPHANS': return photos.filter(p => p.status !== GroupStatus.COMPLETE);
      default: return photos;
    }
  }, [photos, filter]);

  // Get current photo
  const currentPhoto = selectedIndex !== null ? filteredPhotos[selectedIndex] : null;

  // Navigate to next/previous photo
  const navigate = useCallback((direction: 'prev' | 'next') => {
    if (selectedIndex === null || filteredPhotos.length === 0) return;
    if (direction === 'next') {
      setSelectedIndex((selectedIndex + 1) % filteredPhotos.length);
    } else {
      setSelectedIndex((selectedIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
    }
  }, [selectedIndex, filteredPhotos.length]);

  // Update selection with animation
  const updateSelectionWithAnimation = useCallback((
    state: SelectionState,
    onUpdate: (photoId: string, state: SelectionState) => void
  ) => {
    if (selectedIndex === null || !currentPhoto) return;

    // Trigger animation
    if (state === SelectionState.PICKED) setAnimationClass('animate-pick');
    if (state === SelectionState.REJECTED) setAnimationClass('animate-reject');

    // Small delay to allow animation before updating state and navigating
    setTimeout(() => {
      onUpdate(currentPhoto.id, state);
      setAnimationClass('');
      navigate('next');
    }, 400);
  }, [selectedIndex, currentPhoto, navigate]);

  // Select photo by index in filtered list
  const selectPhotoByIndex = useCallback((index: number) => {
    if (index >= 0 && index < filteredPhotos.length) {
      setSelectedIndex(index);
    }
  }, [filteredPhotos.length]);

  // Select photo by ID (finds it in filtered list)
  const selectPhotoById = useCallback((photoId: string) => {
    const index = filteredPhotos.findIndex(p => p.id === photoId);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  }, [filteredPhotos]);

  // Auto-select first photo when filter changes or photos are imported
  const autoSelectFirst = useCallback(() => {
    if (filteredPhotos.length > 0 && selectedIndex === null) {
      setSelectedIndex(0);
    }
  }, [filteredPhotos.length, selectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
    filter,
    setFilter,
    animationClass,
    filteredPhotos,
    currentPhoto,
    navigate,
    updateSelectionWithAnimation,
    selectPhotoByIndex,
    selectPhotoById,
    autoSelectFirst,
  };
}

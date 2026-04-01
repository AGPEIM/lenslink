import { useState, useCallback, useMemo, useEffect } from 'react';
import { PhotoGroup, SelectionState, GroupStatus } from '../types';

type FilterType = 'ALL' | 'PICKED' | 'REJECTED' | 'UNMARKED' | 'ORPHANS';

/**
 * Custom hook for managing photo navigation and filtering
 */
export function usePhotoNavigation(photos: PhotoGroup[]) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilterInternal] = useState<FilterType>('ALL');
  const [animationClass, setAnimationClass] = useState('');
  const [lastSelectedIds, setLastSelectedIds] = useState<Record<FilterType, string | null>>({
    ALL: null,
    PICKED: null,
    REJECTED: null,
    UNMARKED: null,
    ORPHANS: null,
  });

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
      // 保存当前筛选条件下选中的照片ID
      setLastSelectedIds(prev => ({
        ...prev,
        [filter]: filteredPhotos[index].id,
      }));
    }
  }, [filteredPhotos.length, filter, filteredPhotos]);

  // Select photo by ID (finds it in filtered list)
  const selectPhotoById = useCallback((photoId: string) => {
    const index = filteredPhotos.findIndex(p => p.id === photoId);
    if (index !== -1) {
      setSelectedIndex(index);
      // 保存当前筛选条件下选中的照片ID
      setLastSelectedIds(prev => ({
        ...prev,
        [filter]: photoId,
      }));
    }
  }, [filteredPhotos]);

  // 设置过滤器
  const setFilter = useCallback((newFilter: FilterType) => {
    // 保存当前筛选条件下的选中状态
    if (selectedIndex !== null && filteredPhotos[selectedIndex]) {
      setLastSelectedIds(prev => ({
        ...prev,
        [filter]: filteredPhotos[selectedIndex].id,
      }));
    }

    // 应用新的筛选条件
    setFilterInternal(newFilter);
  }, [filter, selectedIndex, filteredPhotos]);

  // 当筛选条件变化时，自动恢复或选择第一张
  useEffect(() => {
    if (filteredPhotos.length > 0) {
      // 尝试恢复之前在该筛选条件下选中的照片
      const lastId = lastSelectedIds[filter];
      if (lastId) {
        const index = filteredPhotos.findIndex(p => p.id === lastId);
        if (index !== -1) {
          setSelectedIndex(index);
          return;
        }
      }
      // 如果没有找到之前选中的照片，默认选中第一张
      setSelectedIndex(0);
    } else {
      setSelectedIndex(null);
    }
  }, [filteredPhotos, filter, lastSelectedIds]);

  // Auto-select first photo when filter changes or photos are imported
  const autoSelectFirst = useCallback(() => {
    if (filteredPhotos.length > 0 && selectedIndex === null) {
      setSelectedIndex(0);
      // 保存到对应的筛选条件
      setLastSelectedIds(prev => ({
        ...prev,
        [filter]: filteredPhotos[0].id,
      }));
    }
  }, [filteredPhotos.length, selectedIndex, filter, filteredPhotos]);

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

import { useEffect, useCallback } from 'react';
import { SelectionState } from '../types';
import { useShortcuts } from '../contexts/ShortcutsContext';

interface UseKeyboardShortcutsOptions {
  enabled: boolean;
  onNavigate: (direction: 'prev' | 'next') => void;
  onUpdateSelection: (state: SelectionState) => void;
  onUpdateRating: (rating: number) => void;
  selectionMode: 'pick_reject' | 'rating';
}

export function useKeyboardShortcuts({
  enabled,
  onNavigate,
  onUpdateSelection,
  onUpdateRating,
  selectionMode,
}: UseKeyboardShortcutsOptions) {
  const { getActionByKey } = useShortcuts();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      if (
        ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')
      ) {
        return;
      }

      if (!enabled) return;

      const key = e.key.toLowerCase();
      const action = getActionByKey(key);

      if (!action) return;

      // 阻止默认行为（如空格键滚动）
      if (key === ' ') {
        e.preventDefault();
      }

      switch (action) {
        case 'navigate_next':
          onNavigate('next');
          break;
        case 'navigate_prev':
          onNavigate('prev');
          break;
        case 'mark_picked':
          if (selectionMode === 'pick_reject') {
            onUpdateSelection(SelectionState.PICKED);
          }
          break;
        case 'mark_rejected':
          if (selectionMode === 'pick_reject') {
            onUpdateSelection(SelectionState.REJECTED);
          }
          break;
        case 'mark_unmarked':
          if (selectionMode === 'pick_reject') {
            onUpdateSelection(SelectionState.UNMARKED);
          }
          break;
        case 'rate_1':
          if (selectionMode === 'rating') {
            onUpdateRating(1);
          }
          break;
        case 'rate_2':
          if (selectionMode === 'rating') {
            onUpdateRating(2);
          }
          break;
        case 'rate_3':
          if (selectionMode === 'rating') {
            onUpdateRating(3);
          }
          break;
        case 'rate_4':
          if (selectionMode === 'rating') {
            onUpdateRating(4);
          }
          break;
        case 'rate_5':
          if (selectionMode === 'rating') {
            onUpdateRating(5);
          }
          break;
        case 'clear_rating':
          if (selectionMode === 'rating') {
            onUpdateRating(0);
          }
          break;
      }
    },
    [enabled, getActionByKey, onNavigate, onUpdateSelection, onUpdateRating, selectionMode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

import { useEffect, useCallback } from 'react';
import { SelectionState } from '../types';
import { useShortcuts } from '../contexts/ShortcutsContext';

interface UseKeyboardShortcutsOptions {
  enabled: boolean;
  onNavigate: (direction: 'prev' | 'next') => void;
  onUpdateSelection: (state: SelectionState) => void;
}

export function useKeyboardShortcuts({
  enabled,
  onNavigate,
  onUpdateSelection,
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
          onUpdateSelection(SelectionState.PICKED);
          break;
        case 'mark_rejected':
          onUpdateSelection(SelectionState.REJECTED);
          break;
        case 'mark_unmarked':
          onUpdateSelection(SelectionState.UNMARKED);
          break;
      }
    },
    [enabled, getActionByKey, onNavigate, onUpdateSelection]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

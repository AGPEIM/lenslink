import { useState } from 'react';
import { PhotoGroup, ExportMode } from '../types';

/**
 * Custom hook for managing modal states
 */
export function useModalState() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showOrphanDeleteConfirm, setShowOrphanDeleteConfirm] = useState(false);
  const [showForceDeleteConfirm, setShowForceDeleteConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [groupsToForceDelete, setGroupsToForceDelete] = useState<PhotoGroup[]>([]);
  const [orphanDeleteType, setOrphanDeleteType] = useState<'RAW' | 'JPG' | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>('BOTH');

  return {
    // Delete modal
    showDeleteConfirm,
    setShowDeleteConfirm,

    // Export modal
    showExportConfirm,
    setShowExportConfirm,
    exportMode,
    setExportMode,
    showExportMenu,
    setShowExportMenu,

    // Orphan delete modal
    showOrphanDeleteConfirm,
    setShowOrphanDeleteConfirm,
    orphanDeleteType,
    setOrphanDeleteType,

    // Force delete modal
    showForceDeleteConfirm,
    setShowForceDeleteConfirm,
    groupsToForceDelete,
    setGroupsToForceDelete,

    // Settings modal
    showSettings,
    setShowSettings,
  };
}

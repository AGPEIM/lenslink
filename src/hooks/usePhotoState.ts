import { useState, useCallback, useMemo } from 'react';
import { PhotoGroup, SelectionState, GroupStatus } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * Custom hook for managing photo state and operations
 */
export function usePhotoState() {
  const [photos, setPhotos] = useState<PhotoGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Convert Rust groups to frontend PhotoGroup format
  const convertRustGroupsToPhotoGroups = useCallback((rustGroups: any[]): PhotoGroup[] => {
    return rustGroups.map(group => ({
      id: group.id,
      jpg: group.jpg ? {
        name: group.jpg.name,
        extension: group.jpg.extension,
        file: null as any,
        previewUrl: convertFileSrc(group.jpg.path),
        size: group.jpg.size,
        path: group.jpg.path
      } : undefined,
      raw: group.raw ? {
        name: group.raw.name,
        extension: group.raw.extension,
        file: null as any,
        previewUrl: convertFileSrc(group.raw.path),
        size: group.raw.size,
        path: group.raw.path
      } : undefined,
      status: group.status as GroupStatus,
      selection: SelectionState.UNMARKED,
      exif: group.exif
    }));
  }, []);

  // Merge imported groups with existing photos, handling duplicates and orphans
  const mergeImportedGroups = useCallback((existingPhotos: PhotoGroup[], newGroups: PhotoGroup[]): { mergedPhotos: PhotoGroup[], firstNewGroupId: string | null } => {
    const existingPathMap = new Map<string, PhotoGroup>();
    existingPhotos.forEach(group => {
      if (group.jpg?.path) existingPathMap.set(group.jpg.path, group);
      if (group.raw?.path) existingPathMap.set(group.raw.path, group);
    });

    const mergedPhotos = [...existingPhotos];
    let firstNewGroupId: string | null = null;

    newGroups.forEach(newGroup => {
      const jpgDuplicate = newGroup.jpg?.path && existingPathMap.has(newGroup.jpg.path);
      const rawDuplicate = newGroup.raw?.path && existingPathMap.has(newGroup.raw.path);

      // Skip if entire group is duplicate
      if ((newGroup.jpg && jpgDuplicate) && (newGroup.raw && rawDuplicate)) {
        console.log(`跳过重复照片组: ${newGroup.id}`);
        return;
      }

      // Skip if partial duplicate
      if ((newGroup.jpg && jpgDuplicate) || (newGroup.raw && rawDuplicate)) {
        console.log(`部分文件重复，跳过: ${newGroup.id}`);
        return;
      }

      // Check if can merge with existing orphan
      const existingOrphanIndex = mergedPhotos.findIndex(existing => {
        if (existing.id !== newGroup.id) return false;
        if (existing.status === GroupStatus.COMPLETE) return false;

        const canMerge = (
          (existing.status === GroupStatus.JPG_ONLY && newGroup.raw) ||
          (existing.status === GroupStatus.RAW_ONLY && newGroup.jpg)
        );

        return canMerge;
      });

      if (existingOrphanIndex !== -1) {
        // Merge orphan files
        const existingOrphan = mergedPhotos[existingOrphanIndex];
        const mergedGroup: PhotoGroup = {
          ...existingOrphan,
          jpg: existingOrphan.jpg || newGroup.jpg,
          raw: existingOrphan.raw || newGroup.raw,
          status: GroupStatus.COMPLETE,
          exif: existingOrphan.exif || newGroup.exif,
        };
        mergedPhotos[existingOrphanIndex] = mergedGroup;
        if (firstNewGroupId === null) firstNewGroupId = mergedGroup.id;
        console.log(`成功合并孤儿文件: ${newGroup.id}`);
      } else {
        // Add as new group
        mergedPhotos.push(newGroup);
        if (firstNewGroupId === null) firstNewGroupId = newGroup.id;
      }
    });

    return { mergedPhotos, firstNewGroupId };
  }, []);

  // Import files
  const importFiles = useCallback(async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      const filePaths = await open({
        multiple: true,
        filters: [{
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'arw', 'cr2', 'nef', 'dng', 'orf', 'raf', 'srw']
        }]
      });

      if (!filePaths || (Array.isArray(filePaths) && filePaths.length === 0)) {
        return null;
      }

      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
      const rustGroups = await invoke<any[]>('scan_files', { filePaths: paths });
      const newGroups = convertRustGroupsToPhotoGroups(rustGroups);

      const { mergedPhotos, firstNewGroupId } = mergeImportedGroups(photos, newGroups);
      setPhotos(mergedPhotos);

      return firstNewGroupId;
    } catch (error) {
      console.error('Failed to import files:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [photos, convertRustGroupsToPhotoGroups, mergeImportedGroups]);

  // Import folder
  const importFolder = useCallback(async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      const folderPath = await open({
        directory: true,
        multiple: false,
      });

      if (!folderPath) {
        return null;
      }

      const rustGroups = await invoke<any[]>('scan_folder', { folderPath });
      const newGroups = convertRustGroupsToPhotoGroups(rustGroups);

      const { mergedPhotos, firstNewGroupId } = mergeImportedGroups(photos, newGroups);
      setPhotos(mergedPhotos);

      return firstNewGroupId;
    } catch (error) {
      console.error('Failed to import folder:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [photos, convertRustGroupsToPhotoGroups, mergeImportedGroups]);

  // Update photo selection
  const updatePhotoSelection = useCallback((photoId: string, selection: SelectionState) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, selection } : p));
  }, []);

  // Delete rejected photos
  const deleteRejectedPhotos = useCallback(async (): Promise<number> => {
    const rejectedGroups = photos.filter(p => p.selection === SelectionState.REJECTED);

    if (rejectedGroups.length === 0) {
      return 0;
    }

    const groupsToDelete = rejectedGroups.map(group => ({
      id: group.id,
      jpg: group.jpg ? {
        name: group.jpg.name,
        extension: group.jpg.extension,
        path: group.jpg.path,
        size: group.jpg.size
      } : null,
      raw: group.raw ? {
        name: group.raw.name,
        extension: group.raw.extension,
        path: group.raw.path,
        size: group.raw.size
      } : null,
      status: group.status,
      exif: group.exif || null
    }));

    const movedFiles = await invoke<string[]>('move_to_trash', { groups: groupsToDelete });
    setPhotos(prev => prev.filter(p => p.selection !== SelectionState.REJECTED));

    return movedFiles.length;
  }, [photos]);

  // Delete orphan photos
  const deleteOrphanPhotos = useCallback(async (type: 'RAW' | 'JPG'): Promise<number> => {
    const orphanGroups = photos.filter(p => {
      if (type === 'RAW') {
        return p.status === GroupStatus.RAW_ONLY;
      } else {
        return p.status === GroupStatus.JPG_ONLY;
      }
    });

    if (orphanGroups.length === 0) {
      return 0;
    }

    const groupsToDelete = orphanGroups.map(group => ({
      id: group.id,
      jpg: group.jpg ? {
        name: group.jpg.name,
        extension: group.jpg.extension,
        path: group.jpg.path,
        size: group.jpg.size
      } : null,
      raw: group.raw ? {
        name: group.raw.name,
        extension: group.raw.extension,
        path: group.raw.path,
        size: group.raw.size
      } : null,
      status: group.status,
      exif: group.exif || null
    }));

    const movedFiles = await invoke<string[]>('move_to_trash', { groups: groupsToDelete });

    setPhotos(prev => prev.filter(p => {
      if (type === 'RAW') {
        return p.status !== GroupStatus.RAW_ONLY;
      } else {
        return p.status !== GroupStatus.JPG_ONLY;
      }
    }));

    return movedFiles.length;
  }, [photos]);

  // Force delete photos (permanent)
  const forceDeletePhotos = useCallback(async (groupsToDelete: PhotoGroup[]): Promise<number> => {
    const groups = groupsToDelete.map(group => ({
      id: group.id,
      jpg: group.jpg ? {
        name: group.jpg.name,
        extension: group.jpg.extension,
        path: group.jpg.path,
        size: group.jpg.size
      } : null,
      raw: group.raw ? {
        name: group.raw.name,
        extension: group.raw.extension,
        path: group.raw.path,
        size: group.raw.size
      } : null,
      status: group.status,
      exif: group.exif || null
    }));

    const deletedFiles = await invoke<string[]>('delete_files_permanently', { groups });
    setPhotos(prev => prev.filter(p => !groupsToDelete.find(g => g.id === p.id)));

    return deletedFiles.length;
  }, []);

  // Export picked photos
  const exportPickedPhotos = useCallback(async (
    exportMode: 'JPG' | 'RAW' | 'BOTH',
    operation: 'COPY' | 'MOVE',
    destinationFolder: string
  ): Promise<number> => {
    const pickedGroups = photos.filter(p => p.selection === SelectionState.PICKED);

    if (pickedGroups.length === 0) {
      return 0;
    }

    const groupsToExport = pickedGroups.map(group => ({
      id: group.id,
      jpg: group.jpg ? {
        name: group.jpg.name,
        extension: group.jpg.extension,
        path: group.jpg.path,
        size: group.jpg.size
      } : null,
      raw: group.raw ? {
        name: group.raw.name,
        extension: group.raw.extension,
        path: group.raw.path,
        size: group.raw.size
      } : null,
      status: group.status,
      exif: group.exif || null
    }));

    const exportedFiles = await invoke<string[]>('export_files', {
      groups: groupsToExport,
      exportMode: exportMode,
      operation: operation,
      destinationFolder: destinationFolder
    });

    // If move operation, remove from list
    if (operation === 'MOVE') {
      setPhotos(prev => prev.filter(p => p.selection !== SelectionState.PICKED));
    }

    return exportedFiles.length;
  }, [photos]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: photos.length,
      picked: photos.filter(p => p.selection === SelectionState.PICKED).length,
      rejected: photos.filter(p => p.selection === SelectionState.REJECTED).length,
      orphans: photos.filter(p => p.status !== GroupStatus.COMPLETE).length,
      orphanRaw: photos.filter(p => p.status === GroupStatus.RAW_ONLY).length,
      orphanJpg: photos.filter(p => p.status === GroupStatus.JPG_ONLY).length,
      unmarked: photos.filter(p => p.selection === SelectionState.UNMARKED).length,
    };
  }, [photos]);

  return {
    photos,
    isLoading,
    stats,
    importFiles,
    importFolder,
    updatePhotoSelection,
    deleteRejectedPhotos,
    deleteOrphanPhotos,
    forceDeletePhotos,
    exportPickedPhotos,
  };
}

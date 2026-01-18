import React, { useState, useEffect } from 'react';
import { SelectionState, GroupStatus, ExportOperation } from './types';
import Viewer from './components/Viewer';
import { Toolbar } from './components/Toolbar';
import { Filmstrip } from './components/Filmstrip';
import { StatusBar } from './components/StatusBar';
import { EmptyState } from './components/EmptyState';
import ConfirmationModal from './components/ConfirmationModal';
import SettingsPanel from './components/SettingsPanel';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getTranslations, Language } from './i18n';
import { usePlatform } from './hooks/usePlatform';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePhotoState } from './hooks/usePhotoState';
import { useModalState } from './hooks/useModalState';
import { usePhotoNavigation } from './hooks/usePhotoNavigation';

const App: React.FC = () => {
  // Custom hooks for state management
  const photoState = usePhotoState();
  const modalState = useModalState();
  const navigation = usePhotoNavigation(photoState.photos);

  // Settings
  const { theme, themeMode, setThemeMode } = useTheme();
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('lenslink-language');
    return (saved === 'zh' || saved === 'en') ? saved : 'zh';
  });
  const t = getTranslations(language);

  // Platform detection
  const { isMacOS } = usePlatform();

  // Window controls
  const appWindow = getCurrentWindow();

  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = async () => {
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  };

  const handleClose = () => {
    appWindow.close();
  };

  // Persist language setting
  useEffect(() => {
    localStorage.setItem('lenslink-language', language);
  }, [language]);

  // Show window after app is ready
  useEffect(() => {
    const showWindow = async () => {
      try {
        await invoke('show_main_window');
        const loadingEl = document.getElementById('app-loading');
        if (loadingEl) {
          loadingEl.classList.add('fade-out');
          setTimeout(() => {
            loadingEl.style.display = 'none';
          }, 300);
        }
      } catch (error) {
        console.error('Failed to show window:', error);
      }
    };

    const timer = setTimeout(showWindow, 100);
    return () => clearTimeout(timer);
  }, []);

  // Import handlers
  const handleImportFiles = async () => {
    try {
      const firstNewGroupId = await photoState.importFiles();
      if (firstNewGroupId) {
        navigation.selectPhotoById(firstNewGroupId);
      } else if (navigation.selectedIndex === null && photoState.photos.length > 0) {
        navigation.setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Failed to import files:', error);
      alert(`${t.messages.importFailed}: ${error}`);
    }
  };

  const handleImportFolder = async () => {
    try {
      const firstNewGroupId = await photoState.importFolder();
      if (firstNewGroupId) {
        navigation.selectPhotoById(firstNewGroupId);
      } else if (navigation.selectedIndex === null && photoState.photos.length > 0) {
        navigation.setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Failed to import folder:', error);
      alert(`${t.messages.importFailed}: ${error}`);
    }
  };

  // Delete handlers
  const handleDeleteRejected = async () => {
    try {
      const deletedCount = await photoState.deleteRejectedPhotos();
      modalState.setShowDeleteConfirm(false);
      navigation.setSelectedIndex(photoState.photos.length > deletedCount ? 0 : null);
      console.log(`Successfully moved ${deletedCount} files to trash`);
    } catch (error) {
      console.error('Failed to move files to trash:', error);
      modalState.setShowDeleteConfirm(false);

      // Show force delete confirmation
      const rejectedGroups = photoState.photos.filter(p => p.selection === SelectionState.REJECTED);
      modalState.setGroupsToForceDelete(rejectedGroups);
      modalState.setShowForceDeleteConfirm(true);
    }
  };

  const handleOrphanDeleteStart = (type: 'RAW' | 'JPG') => {
    const orphanGroups = photoState.photos.filter(p => {
      if (type === 'RAW') {
        return p.status === GroupStatus.RAW_ONLY;
      } else {
        return p.status === GroupStatus.JPG_ONLY;
      }
    });

    if (orphanGroups.length === 0) {
      alert(type === 'RAW' ? t.messages.noOrphanRawFiles : t.messages.noOrphanJpgFiles);
      return;
    }

    modalState.setOrphanDeleteType(type);
    modalState.setShowOrphanDeleteConfirm(true);
  };

  const handleOrphanDelete = async () => {
    if (!modalState.orphanDeleteType) {
      modalState.setShowOrphanDeleteConfirm(false);
      return;
    }

    try {
      const deletedCount = await photoState.deleteOrphanPhotos(modalState.orphanDeleteType);
      modalState.setShowOrphanDeleteConfirm(false);
      modalState.setOrphanDeleteType(null);

      if (photoState.photos.length > deletedCount) {
        navigation.setSelectedIndex(0);
      } else {
        navigation.setSelectedIndex(null);
      }

      alert(`${t.messages.orphanDeleteSuccess}: ${deletedCount} ${t.messages.files}`);
      console.log(`Successfully moved ${deletedCount} orphan files to trash`);
    } catch (error) {
      console.error('Failed to move orphan files to trash:', error);
      modalState.setShowOrphanDeleteConfirm(false);

      // Show force delete confirmation
      if (modalState.orphanDeleteType) {
        const orphanGroups = photoState.photos.filter(p => {
          if (modalState.orphanDeleteType === 'RAW') {
            return p.status === GroupStatus.RAW_ONLY;
          } else {
            return p.status === GroupStatus.JPG_ONLY;
          }
        });
        modalState.setGroupsToForceDelete(orphanGroups);
        modalState.setShowForceDeleteConfirm(true);
      } else {
        modalState.setOrphanDeleteType(null);
      }
    }
  };

  const handleForceDelete = async () => {
    try {
      const deletedCount = await photoState.forceDeletePhotos(modalState.groupsToForceDelete);
      modalState.setShowForceDeleteConfirm(false);
      modalState.setGroupsToForceDelete([]);
      modalState.setOrphanDeleteType(null);

      navigation.setSelectedIndex(photoState.photos.length > deletedCount ? 0 : null);

      console.log(`Successfully deleted ${deletedCount} files permanently`);
    } catch (error) {
      console.error('Failed to force delete files:', error);
      alert(`${t.messages.deleteFailed}: ${error}`);
      modalState.setShowForceDeleteConfirm(false);
      modalState.setGroupsToForceDelete([]);
      modalState.setOrphanDeleteType(null);
    }
  };

  // Export handlers
  const handleExportStart = (mode: 'JPG' | 'RAW' | 'BOTH') => {
    if (photoState.stats.picked === 0) {
      alert(t.messages.noPhotosToExport);
      return;
    }
    modalState.setExportMode(mode);
    modalState.setShowExportConfirm(true);
  };

  const handleExport = async (operation?: ExportOperation) => {
    if (!operation) {
      modalState.setShowExportConfirm(false);
      return;
    }

    try {
      const destinationFolder = await open({
        directory: true,
        multiple: false,
        title: `Select folder to ${operation === 'COPY' ? 'copy' : 'move'} files to`,
      });

      if (!destinationFolder || typeof destinationFolder !== 'string') {
        modalState.setShowExportConfirm(false);
        return;
      }

      if (photoState.stats.picked === 0) {
        alert(t.messages.noPhotosToExport);
        modalState.setShowExportConfirm(false);
        return;
      }

      const exportedCount = await photoState.exportPickedPhotos(
        modalState.exportMode,
        operation,
        destinationFolder
      );

      if (operation === 'MOVE') {
        navigation.setSelectedIndex(photoState.photos.length > exportedCount ? 0 : null);
      }

      modalState.setShowExportConfirm(false);
      const operationText = operation === 'COPY' ? t.messages.exportSuccessCopied : t.messages.exportSuccessMoved;
      alert(`${t.messages.exportSuccess} ${operationText} ${exportedCount} ${t.messages.files} ${destinationFolder}`);
      console.log(`Export completed: ${exportedCount} files`);
    } catch (error) {
      console.error('Failed to export files:', error);
      alert(`${t.messages.exportFailed}: ${error}`);
      modalState.setShowExportConfirm(false);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: navigation.selectedIndex !== null,
    onNavigate: navigation.navigate,
    onUpdateSelection: (state: SelectionState) => {
      navigation.updateSelectionWithAnimation(state, photoState.updatePhotoSelection);
    },
  });

  return (
    <div className={`flex flex-col h-screen select-none ${theme === 'dark' ? 'bg-zinc-950' : 'bg-gray-50'}`}>
      {/* Top Nav */}
      <Toolbar
        theme={theme}
        language={language}
        t={t}
        filter={navigation.filter}
        onFilterChange={navigation.setFilter}
        isLoading={photoState.isLoading}
        onImportFiles={handleImportFiles}
        onImportFolder={handleImportFolder}
        stats={photoState.stats}
        onDeleteRejected={() => modalState.setShowDeleteConfirm(true)}
        onDeleteOrphanRaw={() => handleOrphanDeleteStart('RAW')}
        onDeleteOrphanJpg={() => handleOrphanDeleteStart('JPG')}
        showExportMenu={modalState.showExportMenu}
        onToggleExportMenu={() => modalState.setShowExportMenu(!modalState.showExportMenu)}
        onExportStart={handleExportStart}
        onSettingsClick={() => modalState.setShowSettings(!modalState.showSettings)}
        isMacOS={isMacOS}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {photoState.photos.length === 0 || navigation.filteredPhotos.length === 0 ? (
          <EmptyState
            theme={theme}
            t={t}
            filter={navigation.filter}
            hasPhotos={photoState.photos.length > 0}
            onImportFolder={handleImportFolder}
          />
        ) : (
          <>
            {/* Viewer Component */}
            {navigation.currentPhoto && (
              <Viewer
                group={navigation.currentPhoto}
                animationClass={navigation.animationClass}
                onUpdateSelection={(state: SelectionState) => {
                  navigation.updateSelectionWithAnimation(state, photoState.updatePhotoSelection);
                }}
                theme={theme}
                language={language}
              />
            )}

            {/* Filmstrip / Thumbnails */}
            <Filmstrip
              theme={theme}
              filteredPhotos={navigation.filteredPhotos}
              selectedIndex={navigation.selectedIndex}
              onSelectPhoto={navigation.selectPhotoByIndex}
            />
          </>
        )}
      </main>

      {/* Modals */}
      {modalState.showDeleteConfirm && (
        <ConfirmationModal
          type="delete"
          groups={photoState.photos.filter(p => p.selection === SelectionState.REJECTED)}
          onConfirm={handleDeleteRejected}
          onCancel={() => modalState.setShowDeleteConfirm(false)}
          theme={theme}
          language={language}
        />
      )}

      {modalState.showExportConfirm && (
        <ConfirmationModal
          type="export"
          groups={photoState.photos.filter(p => p.selection === SelectionState.PICKED)}
          onConfirm={handleExport}
          onCancel={() => modalState.setShowExportConfirm(false)}
          theme={theme}
          language={language}
        />
      )}

      {modalState.showOrphanDeleteConfirm && modalState.orphanDeleteType && (
        <ConfirmationModal
          type="delete"
          groups={photoState.photos.filter(p => {
            if (modalState.orphanDeleteType === 'RAW') {
              return p.status === GroupStatus.RAW_ONLY;
            } else {
              return p.status === GroupStatus.JPG_ONLY;
            }
          })}
          onConfirm={handleOrphanDelete}
          onCancel={() => {
            modalState.setShowOrphanDeleteConfirm(false);
            modalState.setOrphanDeleteType(null);
          }}
          theme={theme}
          language={language}
        />
      )}

      {modalState.showForceDeleteConfirm && (
        <ConfirmationModal
          type="forceDelete"
          groups={modalState.groupsToForceDelete}
          onConfirm={handleForceDelete}
          onCancel={() => {
            modalState.setShowForceDeleteConfirm(false);
            modalState.setGroupsToForceDelete([]);
            modalState.setOrphanDeleteType(null);
          }}
          theme={theme}
          language={language}
        />
      )}

      {/* Footer Info */}
      <StatusBar theme={theme} t={t} stats={photoState.stats} />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={modalState.showSettings}
        onClose={() => modalState.setShowSettings(false)}
        theme={theme}
        themeMode={themeMode}
        language={language}
        onThemeModeChange={setThemeMode}
        onLanguageChange={setLanguage}
      />
    </div>
  );
};

export default App;

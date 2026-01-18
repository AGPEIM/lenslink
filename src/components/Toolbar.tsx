import React, { useRef, useEffect } from 'react';
import { ExportMode } from '../types';
import { Language } from '../i18n';
import logoImg from '../assets/logo.png';

interface ToolbarProps {
  theme: 'light' | 'dark';
  language: Language;
  t: any;
  filter: 'ALL' | 'PICKED' | 'REJECTED' | 'UNMARKED' | 'ORPHANS';
  onFilterChange: (filter: 'ALL' | 'PICKED' | 'REJECTED' | 'UNMARKED' | 'ORPHANS') => void;
  isLoading: boolean;
  onImportFiles: () => void;
  onImportFolder: () => void;
  stats: {
    rejected: number;
    picked: number;
    orphanRaw: number;
    orphanJpg: number;
  };
  onDeleteRejected: () => void;
  onDeleteOrphanRaw: () => void;
  onDeleteOrphanJpg: () => void;
  showExportMenu: boolean;
  onToggleExportMenu: () => void;
  onExportStart: (mode: ExportMode) => void;
  onSettingsClick: () => void;
  isMacOS: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  theme,
  language,
  t,
  filter,
  onFilterChange,
  isLoading,
  onImportFiles,
  onImportFolder,
  stats,
  onDeleteRejected,
  onDeleteOrphanRaw,
  onDeleteOrphanJpg,
  showExportMenu,
  onToggleExportMenu,
  onExportStart,
  onSettingsClick,
  isMacOS,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        if (showExportMenu) {
          onToggleExportMenu();
        }
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu, onToggleExportMenu]);

  return (
    <nav className={`h-14 border-b flex items-center justify-between px-6 z-20 backdrop-blur-md ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/80' : 'border-gray-200 bg-white/80'}`} data-tauri-drag-region>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <img
            src={logoImg}
            alt="LensLink Logo"
            className="w-7 h-7 rounded-lg pointer-events-none object-contain"
          />
          <span className={`font-black text-sm tracking-tighter uppercase pointer-events-none ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>{t.appName}</span>
        </div>

        <div className={`flex items-center gap-1 p-1 rounded-lg border ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800/50' : 'bg-gray-100 border-gray-300/50'}`} data-tauri-drag-region="false" style={{WebkitAppRegion: 'no-drag'} as any}>
          {(['ALL', 'PICKED', 'REJECTED', 'UNMARKED', 'ORPHANS'] as const).map(f => {
            const filterKey = f.toLowerCase() as keyof typeof t.filters;
            return (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${filter === f ? (theme === 'dark' ? 'bg-zinc-800 text-white shadow-inner' : 'bg-white text-gray-900 shadow-md') : (theme === 'dark' ? 'text-zinc-600 hover:text-zinc-300' : 'text-gray-500 hover:text-gray-700')}`}
              >
                {t.filters[filterKey].toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3" data-tauri-drag-region="false" style={{WebkitAppRegion: 'no-drag'} as any}>
        <div className={`flex rounded-lg border overflow-hidden ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800/50' : 'bg-white border-gray-300/50'}`}>
          <button
            onClick={onImportFiles}
            disabled={isLoading}
            className={`h-9 px-3 xl:px-4 text-[11px] font-bold flex items-center gap-2 transition-colors disabled:opacity-50 border-r ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-900 border-zinc-800/50' : 'text-gray-600 hover:bg-gray-100 border-gray-300/50'}`}
            title={isLoading ? t.buttons.loading : t.buttons.importFiles}
          >
            <i className={`fa-solid fa-file-circle-plus ${isLoading ? 'animate-pulse' : ''}`}></i>
            <span className="hidden xl:inline">{isLoading ? t.buttons.loading : t.buttons.importFiles}</span>
          </button>
          <button
            onClick={onImportFolder}
            disabled={isLoading}
            className={`h-9 px-3 xl:px-4 text-[11px] font-bold flex items-center gap-2 transition-colors disabled:opacity-50 ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-900' : 'text-gray-600 hover:bg-gray-100'}`}
            title={isLoading ? t.buttons.loading : t.buttons.importFolder}
          >
            <i className={`fa-solid fa-folder-open ${isLoading ? 'animate-pulse' : ''}`}></i>
            <span className="hidden xl:inline">{isLoading ? t.buttons.loading : t.buttons.importFolder}</span>
          </button>
        </div>

        <button
           onClick={onDeleteRejected}
           disabled={stats.rejected === 0}
           className={`h-9 px-3 xl:px-4 border rounded-lg text-[11px] font-bold transition-all disabled:opacity-30 disabled:pointer-events-none ${theme === 'dark' ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border-rose-500/30' : 'bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border-rose-300'}`}
           title={language === 'zh' ? `确认删除 ${stats.rejected} 项` : `Confirm ${stats.rejected} Rejects`}
        >
          <i className="fa-solid fa-trash-can xl:mr-2"></i>
          <span className="hidden xl:inline">{language === 'zh' ? `确认删除 ${stats.rejected} 项` : `Confirm ${stats.rejected} Rejects`}</span>
          <span className="xl:hidden ml-1">{stats.rejected}</span>
        </button>

        <div className={`flex rounded-lg border overflow-hidden ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800/50' : 'bg-white border-gray-300/50'}`}>
          <button
            onClick={onDeleteOrphanRaw}
            disabled={stats.orphanRaw === 0}
            className={`h-9 px-2 xl:px-3 text-[11px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:pointer-events-none border-r ${theme === 'dark' ? 'text-amber-400 hover:bg-amber-500/10 border-zinc-800/50' : 'text-amber-600 hover:bg-amber-50 border-gray-300/50'}`}
            title={language === 'zh' ? `删RAW (${stats.orphanRaw})` : `Del RAW (${stats.orphanRaw})`}
          >
            <i className="fa-solid fa-file-image"></i>
            <span className="hidden xl:inline">{language === 'zh' ? `删RAW` : `Del RAW`}</span>
            <span>({stats.orphanRaw})</span>
          </button>
          <button
            onClick={onDeleteOrphanJpg}
            disabled={stats.orphanJpg === 0}
            className={`h-9 px-2 xl:px-3 text-[11px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:pointer-events-none ${theme === 'dark' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-600 hover:bg-amber-50'}`}
            title={language === 'zh' ? `删JPG (${stats.orphanJpg})` : `Del JPG (${stats.orphanJpg})`}
          >
            <i className="fa-solid fa-image"></i>
            <span className="hidden xl:inline">{language === 'zh' ? `删JPG` : `Del JPG`}</span>
            <span>({stats.orphanJpg})</span>
          </button>
        </div>

        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => {
              if (stats.picked === 0) {
                alert("No photos are picked for export.");
                return;
              }
              onToggleExportMenu();
            }}
            disabled={stats.picked === 0}
            className={`h-9 px-3 xl:px-5 rounded-lg text-[11px] font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-30 disabled:pointer-events-none ${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/30'}`}
            title={t.buttons.exportPicks}
          >
            <i className="fa-solid fa-paper-plane"></i>
            <span className="hidden xl:inline">{t.buttons.exportPicks}</span>
          </button>
          {showExportMenu && (
            <div className={`absolute top-full right-0 mt-2 w-44 border rounded-xl shadow-2xl z-50 p-1 flex flex-col ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
              <button onClick={() => { onExportStart('JPG'); onToggleExportMenu(); }} className={`px-4 py-2.5 text-[10px] font-bold text-left rounded-lg transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>{t.exportMenu.jpgOnly}</button>
              <button onClick={() => { onExportStart('RAW'); onToggleExportMenu(); }} className={`px-4 py-2.5 text-[10px] font-bold text-left rounded-lg transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>{t.exportMenu.rawOnly}</button>
              <button onClick={() => { onExportStart('BOTH'); onToggleExportMenu(); }} className={`px-4 py-2.5 text-[10px] font-bold text-left rounded-lg transition-colors border-t mt-1 pt-2 ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white border-zinc-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-gray-200'}`}>{t.exportMenu.rawAndJpg}</button>
            </div>
          )}
        </div>

        <button
          onClick={onSettingsClick}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800'}`}
          title={t.settings.title}
        >
          <i className="fa-solid fa-gear text-sm"></i>
        </button>

        {!isMacOS && (
          <div className={`flex items-center gap-1 ml-2 border-l pl-3 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-300'}`}>
            <button
              onClick={onMinimize}
              className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
              title={t.window.minimize}
            >
              <i className="fa-solid fa-window-minimize text-[10px]"></i>
            </button>
            <button
              onClick={onMaximize}
              className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
              title={t.window.maximize}
            >
              <i className="fa-regular fa-window-maximize text-xs"></i>
            </button>
            <button
              onClick={onClose}
              className={`w-9 h-9 flex items-center justify-center rounded hover:bg-red-600 transition-colors hover:text-white ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}
              title={t.window.close}
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

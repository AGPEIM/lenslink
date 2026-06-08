import React, { useRef, useEffect } from 'react';
import { ExportMode, AppFilter, SelectionMode } from '../types';
import { Language } from '../i18n';
import logoImg from '../assets/logo.png';

interface ToolbarProps {
  theme: 'light' | 'dark';
  language: Language;
  t: any;
  filter: AppFilter;
  onFilterChange: (filter: AppFilter) => void;
  selectionMode: SelectionMode;
  isLoading: boolean;
  onImportFiles: () => void;
  onImportFolder: () => void;
  stats: {
    rejected: number;
    picked: number;
    orphanRaw: number;
    orphanJpg: number;
  };
  filteredCount: number;
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
  selectionMode,
  isLoading,
  onImportFiles,
  onImportFolder,
  stats,
  onDeleteRejected,
  onDeleteOrphanRaw,
  onDeleteOrphanJpg,
  filteredCount,
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

  // Shared icon button base classes
  const iconBtnBase = 'h-8 px-2 xl:px-3 flex items-center justify-center rounded-lg transition-all text-xs font-medium';
  const iconBtnDark = 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800';
  const iconBtnLight = 'text-gray-500 hover:text-gray-800 hover:bg-gray-100';
  const iconBtnDisabled = 'opacity-30 pointer-events-none';

  // Segmented filter button classes
  const segBase = 'px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap';
  const segActiveDark = 'bg-zinc-700/80 text-zinc-100 shadow-sm';
  const segActiveLight = 'bg-white text-gray-900 shadow-sm';
  const segInactiveDark = 'text-zinc-500 hover:text-zinc-300';
  const segInactiveLight = 'text-gray-500 hover:text-gray-700';

  // Divider
  const dividerDark = 'w-px h-4 bg-zinc-700/60';
  const dividerLight = 'w-px h-4 bg-gray-300/60';

  const divider = theme === 'dark' ? dividerDark : dividerLight;

  return (
    <nav
      className={`h-12 border-b flex items-center px-3 z-20 backdrop-blur-md overflow-hidden min-w-0 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/95' : 'border-gray-200 bg-white/95'}`}
      data-tauri-drag-region
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2 flex-shrink-0" data-tauri-drag-region>
        <img
          src={logoImg}
          alt="LensLink Logo"
          className="w-6 h-6 rounded-md pointer-events-none object-contain"
        />
        <span className={`font-bold text-xs tracking-tight pointer-events-none ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
          {t.appName}
        </span>
      </div>

      {/* Divider */}
      <div className={`${divider} mx-3 flex-shrink-0`} />

      {/* Center: Filter segmented control */}
      <div
        className={`flex items-center gap-0.5 p-0.5 rounded-lg min-w-0 overflow-hidden ${theme === 'dark' ? 'bg-zinc-800/50' : 'bg-gray-100'}`}
        data-tauri-drag-region="false"
        style={{WebkitAppRegion: 'no-drag'} as any}
      >
        {selectionMode === 'pick_reject'
          ? (['ALL', 'PICKED', 'REJECTED', 'UNMARKED', 'ORPHANS'] as const).map(f => {
              const filterKey = f.toLowerCase() as keyof typeof t.filters;
              return (
                <button
                  key={f}
                  onClick={() => onFilterChange(f)}
                  className={`${segBase} ${filter === f
                    ? (theme === 'dark' ? segActiveDark : segActiveLight)
                    : (theme === 'dark' ? segInactiveDark : segInactiveLight)
                  }`}
                >
                  {t.filters[filterKey]}
                </button>
              );
            })
          : (() => {
              const getActiveMinRating = (): number => {
                if (filter === 'RATING_5') return 5;
                if (filter === 'RATING_4_PLUS') return 4;
                if (filter === 'RATING_3_PLUS') return 3;
                if (filter === 'RATING_2_PLUS') return 2;
                if (filter === 'RATING_1_PLUS') return 1;
                return 0;
              };
              const activeMin = getActiveMinRating();
              return (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onFilterChange('ALL')}
                    className={`${segBase} ${filter === 'ALL'
                      ? (theme === 'dark' ? segActiveDark : segActiveLight)
                      : (theme === 'dark' ? segInactiveDark : segInactiveLight)
                    }`}
                  >
                    {t.filters.all}
                  </button>
                  <div className={`flex items-center mx-0.5 px-1 py-0.5 rounded-md ${theme === 'dark' ? 'bg-zinc-900/50' : 'bg-gray-200/60'}`}>
                    {[1, 2, 3, 4, 5].map(star => {
                      const filterForStar = (star === 5 ? 'RATING_5' : `RATING_${star}_PLUS`) as AppFilter;
                      const isActive = star <= activeMin;
                      const isSelected = filter === filterForStar;
                      return (
                        <button
                          key={star}
                          onClick={() => onFilterChange(filter === filterForStar ? 'ALL' : filterForStar)}
                          className={`w-6 h-6 flex items-center justify-center rounded transition-all ${isSelected
                            ? (theme === 'dark' ? 'bg-zinc-600 shadow-sm' : 'bg-white shadow-sm')
                            : (theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-white')
                          }`}
                        >
                          <i className={`fa-star ${isActive
                            ? 'fa-solid text-amber-400'
                            : `fa-regular ${theme === 'dark' ? 'text-zinc-600' : 'text-gray-400'}`
                          } text-xs`}></i>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => onFilterChange('UNRATED')}
                    className={`${segBase} ${filter === 'UNRATED'
                      ? (theme === 'dark' ? segActiveDark : segActiveLight)
                      : (theme === 'dark' ? segInactiveDark : segInactiveLight)
                    }`}
                  >
                    {t.filters.unrated}
                  </button>
                  <button
                    onClick={() => onFilterChange('ORPHANS')}
                    className={`${segBase} ${filter === 'ORPHANS'
                      ? (theme === 'dark' ? segActiveDark : segActiveLight)
                      : (theme === 'dark' ? segInactiveDark : segInactiveLight)
                    }`}
                  >
                    {t.filters.orphans}
                  </button>
                </div>
              );
            })()
        }
      </div>

      {/* Spacer */}
      <div className="flex-1" data-tauri-drag-region />

      {/* Right: Action buttons */}
      <div
        className="flex items-center gap-1 flex-shrink-0"
        data-tauri-drag-region="false"
        style={{WebkitAppRegion: 'no-drag'} as any}
      >
        {/* Import group */}
        <button
          onClick={onImportFiles}
          disabled={isLoading}
          className={`${iconBtnBase} ${isLoading ? iconBtnDisabled : ''} ${theme === 'dark' ? iconBtnDark : iconBtnLight}`}
          title={isLoading ? t.buttons.loading : t.buttons.importFiles}
        >
          <i className={`fa-solid fa-file-circle-plus text-sm ${isLoading ? 'animate-pulse' : ''}`}></i>
          <span className="hidden xl:inline ml-1.5 whitespace-nowrap">{t.buttons.importFiles}</span>
        </button>
        <button
          onClick={onImportFolder}
          disabled={isLoading}
          className={`${iconBtnBase} ${isLoading ? iconBtnDisabled : ''} ${theme === 'dark' ? iconBtnDark : iconBtnLight}`}
          title={isLoading ? t.buttons.loading : t.buttons.importFolder}
        >
          <i className={`fa-solid fa-folder-open text-sm ${isLoading ? 'animate-pulse' : ''}`}></i>
          <span className="hidden xl:inline ml-1.5 whitespace-nowrap">{t.buttons.importFolder}</span>
        </button>

        {/* Divider */}
        <div className={`${divider} mx-0.5`} />

        {/* Delete group */}
        <button
          onClick={onDeleteRejected}
          disabled={selectionMode === 'rating'
            ? (filteredCount === 0 || filter === 'ALL')
            : stats.rejected === 0}
          className={`${iconBtnBase} ${(selectionMode === 'rating'
            ? (filteredCount === 0 || filter === 'ALL')
            : stats.rejected === 0) ? iconBtnDisabled : ''} ${theme === 'dark'
              ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
              : 'text-gray-500 hover:text-rose-500 hover:bg-rose-50'
          }`}
          title={selectionMode === 'rating'
            ? (language === 'zh' ? `删除当前 ${filteredCount} 张` : `Delete ${filteredCount} filtered`)
            : (language === 'zh' ? `确认删除 ${stats.rejected} 项` : `Confirm ${stats.rejected} Rejects`)}
        >
          <i className="fa-solid fa-trash-can text-sm"></i>
          <span className="hidden xl:inline ml-1.5 whitespace-nowrap">
            {selectionMode === 'rating'
              ? (language === 'zh' ? `删除 ${filteredCount} 项` : `Del ${filteredCount}`)
              : (language === 'zh' ? `删除 ${stats.rejected} 项` : `Del ${stats.rejected}`)}
          </span>
        </button>
        <button
          onClick={onDeleteOrphanRaw}
          disabled={stats.orphanRaw === 0}
          className={`${iconBtnBase} ${stats.orphanRaw === 0 ? iconBtnDisabled : ''} ${theme === 'dark'
              ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
              : 'text-gray-500 hover:text-rose-500 hover:bg-rose-50'
          }`}
          title={language === 'zh' ? `删RAW (${stats.orphanRaw})` : `Del RAW (${stats.orphanRaw})`}
        >
          <i className="fa-solid fa-file-image text-sm"></i>
          <span className="hidden xl:inline ml-1.5 whitespace-nowrap">{language === 'zh' ? `删RAW (${stats.orphanRaw})` : `Del RAW (${stats.orphanRaw})`}</span>
        </button>
        <button
          onClick={onDeleteOrphanJpg}
          disabled={stats.orphanJpg === 0}
          className={`${iconBtnBase} ${stats.orphanJpg === 0 ? iconBtnDisabled : ''} ${theme === 'dark'
              ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
              : 'text-gray-500 hover:text-rose-500 hover:bg-rose-50'
          }`}
          title={language === 'zh' ? `删JPG (${stats.orphanJpg})` : `Del JPG (${stats.orphanJpg})`}
        >
          <i className="fa-solid fa-image text-sm"></i>
          <span className="hidden xl:inline ml-1.5 whitespace-nowrap">{language === 'zh' ? `删JPG (${stats.orphanJpg})` : `Del JPG (${stats.orphanJpg})`}</span>
        </button>

        {/* Divider */}
        <div className={`${divider} mx-0.5`} />

        {/* Export */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => {
              const count = selectionMode === 'rating' ? filteredCount : stats.picked;
              if (count === 0 || (selectionMode === 'rating' && filter === 'ALL')) {
                alert(selectionMode === 'rating'
                  ? (language === 'zh' ? '没有可导出的筛选照片。' : 'No filtered photos to export.')
                  : (language === 'zh' ? '没有照片被精选。' : 'No photos are picked for export.'));
                return;
              }
              onToggleExportMenu();
            }}
            disabled={selectionMode === 'rating' ? (filteredCount === 0 || filter === 'ALL') : stats.picked === 0}
            className={`${iconBtnBase} ${(selectionMode === 'rating' ? (filteredCount === 0 || filter === 'ALL') : stats.picked === 0) ? iconBtnDisabled : ''} ${theme === 'dark'
              ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300'
              : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-600'
            }`}
            title={selectionMode === 'rating'
              ? (language === 'zh' ? `导出当前 ${filteredCount} 张` : `Export ${filteredCount} filtered`)
              : t.buttons.exportPicks}
          >
            <i className="fa-solid fa-paper-plane text-sm"></i>
            <span className="hidden xl:inline ml-1.5 whitespace-nowrap">{t.buttons.exportPicks}</span>
          </button>
          {showExportMenu && (
            <div className={`absolute top-full right-0 mt-2 w-44 border rounded-xl shadow-2xl z-50 p-1 flex flex-col ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
              <button
                onClick={() => { onExportStart('JPG'); onToggleExportMenu(); }}
                className={`px-4 py-2.5 text-xs font-medium text-left rounded-lg transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                {t.exportMenu.jpgOnly}
              </button>
              <button
                onClick={() => { onExportStart('RAW'); onToggleExportMenu(); }}
                className={`px-4 py-2.5 text-xs font-medium text-left rounded-lg transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                {t.exportMenu.rawOnly}
              </button>
              <button
                onClick={() => { onExportStart('BOTH'); onToggleExportMenu(); }}
                className={`px-4 py-2.5 text-xs font-medium text-left rounded-lg transition-colors border-t mt-1 pt-2 ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white border-zinc-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-gray-200'}`}
              >
                {t.exportMenu.rawAndJpg}
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={`${divider} mx-0.5`} />

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0 ${theme === 'dark' ? iconBtnDark : iconBtnLight}`}
          title={t.settings.title}
        >
          <i className="fa-solid fa-gear text-sm"></i>
        </button>

        {/* Window controls (Windows only) */}
        {!isMacOS && (
          <>
            <div className={`${divider} mx-0.5`} />
            <div className="flex items-center gap-0.5">
              <button
                onClick={onMinimize}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'}`}
                title={t.window.minimize}
              >
                <i className="fa-solid fa-window-minimize text-[10px]"></i>
              </button>
              <button
                onClick={onMaximize}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'}`}
                title={t.window.maximize}
              >
                <i className="fa-regular fa-window-maximize text-xs"></i>
              </button>
              <button
                onClick={onClose}
                className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-600 transition-colors hover:text-white ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}
                title={t.window.close}
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PhotoGroup, SelectionState, GroupStatus, ExportMode, ExportOperation } from './types';
import { analyzeSession } from './services/geminiService';
import Viewer from './components/Viewer';
import ConfirmationModal from './components/ConfirmationModal';
import SettingsPanel from './components/SettingsPanel';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { decodeRawFile } from './utils/rawLoader';
import { getTranslations, Language } from './i18n';

const App: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoGroup[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [animationClass, setAnimationClass] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PICKED' | 'REJECTED' | 'UNMARKED' | 'ORPHANS'>('ALL');
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('BOTH');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [language, setLanguage] = useState<Language>('zh');
  const t = getTranslations(language);

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

  // Thumbnail component for lazy loading RAW previews
  const ThumbnailImage: React.FC<{ group: PhotoGroup }> = ({ group }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      // If JPG exists, use it directly
      if (group.jpg?.previewUrl) {
        setThumbnailUrl(group.jpg.previewUrl);
        return;
      }

      // If only RAW exists, decode it as thumbnail
      if (group.raw?.path) {
        setIsLoading(true);
        decodeRawFile(group.raw.path, true) // true = thumbnail mode
          .then(dataUrl => {
            setThumbnailUrl(dataUrl);
            setIsLoading(false);
          })
          .catch(error => {
            console.error('Failed to load RAW thumbnail:', error);
            setIsLoading(false);
          });
      }
    }, [group.id, group.jpg, group.raw]);

    if (isLoading) {
      return (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <i className="fa-solid fa-spinner fa-spin text-zinc-600 text-xs"></i>
        </div>
      );
    }

    if (!thumbnailUrl) {
      return (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <i className="fa-solid fa-file-image text-zinc-600 text-xs"></i>
        </div>
      );
    }

    return (
      <img 
        src={thumbnailUrl} 
        className="w-full h-full object-cover" 
        alt={group.id} 
      />
    );
  };

  // 转换Rust返回的数据为前端格式
  const convertRustGroupsToPhotoGroups = (rustGroups: any[]): PhotoGroup[] => {
    return rustGroups.map(group => ({
      id: group.id,
      jpg: group.jpg ? {
        name: group.jpg.name,
        extension: group.jpg.extension,
        file: null as any, // 在Rust模式下不需要File对象
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
  };

  // 检测重复路径并合并孤儿文件
  const mergeImportedGroups = (existingPhotos: PhotoGroup[], newGroups: PhotoGroup[]): { mergedPhotos: PhotoGroup[], firstNewGroupId: string | null } => {
    // 构建现有路径映射表：path -> PhotoGroup
    const existingPathMap = new Map<string, PhotoGroup>();
    existingPhotos.forEach(group => {
      if (group.jpg?.path) existingPathMap.set(group.jpg.path, group);
      if (group.raw?.path) existingPathMap.set(group.raw.path, group);
    });

    const mergedPhotos = [...existingPhotos];
    const addedGroupIds = new Set<string>();
    let firstNewGroupId: string | null = null;

    newGroups.forEach(newGroup => {
      // 检查是否有重复路径
      const jpgDuplicate = newGroup.jpg?.path && existingPathMap.has(newGroup.jpg.path);
      const rawDuplicate = newGroup.raw?.path && existingPathMap.has(newGroup.raw.path);

      // 如果整个组都重复，跳过
      if ((newGroup.jpg && jpgDuplicate) && (newGroup.raw && rawDuplicate)) {
        console.log(`跳过重复照片组: ${newGroup.id}`);
        return;
      }

      // 如果只有部分重复，跳过该文件
      if ((newGroup.jpg && jpgDuplicate) || (newGroup.raw && rawDuplicate)) {
        console.log(`部分文件重复，跳过: ${newGroup.id}`);
        return;
      }

      // 检查是否能与现有的孤儿组合并
      const existingOrphanIndex = mergedPhotos.findIndex(existing => {
        // 同一个 ID（文件基础名相同）
        if (existing.id !== newGroup.id) return false;
        
        // 现有组必须是孤儿状态
        if (existing.status === GroupStatus.COMPLETE) return false;
        
        // 新导入的文件正好是缺失的配对文件
        const canMerge = (
          (existing.status === GroupStatus.JPG_ONLY && newGroup.raw) ||
          (existing.status === GroupStatus.RAW_ONLY && newGroup.jpg)
        );
        
        return canMerge;
      });

      if (existingOrphanIndex !== -1) {
        // 合并孤儿文件
        const existingOrphan = mergedPhotos[existingOrphanIndex];
        const mergedGroup: PhotoGroup = {
          ...existingOrphan,
          jpg: existingOrphan.jpg || newGroup.jpg,
          raw: existingOrphan.raw || newGroup.raw,
          status: GroupStatus.COMPLETE,
          // 保留原有的selection状态，不自动改变
          exif: existingOrphan.exif || newGroup.exif,
        };
        mergedPhotos[existingOrphanIndex] = mergedGroup;
        // 记录第一个新导入/合并的组
        if (firstNewGroupId === null) firstNewGroupId = mergedGroup.id;
        console.log(`成功合并孤儿文件: ${newGroup.id}`);
      } else {
        // 添加为新组，保持newGroup原有的selection状态（UNMARKED）
        mergedPhotos.push(newGroup);
        addedGroupIds.add(newGroup.id);
        // 记录第一个新导入的组
        if (firstNewGroupId === null) firstNewGroupId = newGroup.id;
      }
    });

    return { mergedPhotos, firstNewGroupId };
  };

  const handleImportFiles = async () => {
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
        setIsLoading(false);
        return;
      }
      
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
      const rustGroups = await invoke<any[]>('scan_files', { filePaths: paths });
      const newGroups = convertRustGroupsToPhotoGroups(rustGroups);
      
      // 使用合并逻辑处理新导入的文件
      const { mergedPhotos, firstNewGroupId } = mergeImportedGroups(photos, newGroups);
      setPhotos(mergedPhotos);
      
      // 自动选中第一张新导入的图片
      if (firstNewGroupId !== null) {
        const newIndex = mergedPhotos.findIndex(p => p.id === firstNewGroupId);
        if (newIndex !== -1) setSelectedIndex(newIndex);
      } else if (selectedIndex === null && mergedPhotos.length > 0) {
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Failed to import files:', error);
      alert(`${t.messages.importFailed}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportFolder = async () => {
    try {
      setIsLoading(true);
      const folderPath = await open({
        directory: true,
        multiple: false,
      });
      
      if (!folderPath) {
        setIsLoading(false);
        return;
      }
      
      const rustGroups = await invoke<any[]>('scan_folder', { folderPath });
      const newGroups = convertRustGroupsToPhotoGroups(rustGroups);
      
      // 使用合并逻辑处理新导入的文件
      const { mergedPhotos, firstNewGroupId } = mergeImportedGroups(photos, newGroups);
      setPhotos(mergedPhotos);
      
      // 自动选中第一张新导入的图片
      if (firstNewGroupId !== null) {
        const newIndex = mergedPhotos.findIndex(p => p.id === firstNewGroupId);
        if (newIndex !== -1) setSelectedIndex(newIndex);
      } else if (selectedIndex === null && mergedPhotos.length > 0) {
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Failed to import folder:', error);
      alert(`${t.messages.importFailed}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (_e: React.ChangeEvent<HTMLInputElement>) => {
    // 保留原有的HTML文件输入作为备用
    alert('请使用 "Import Folder" 按钮选择文件夹');
  };

  const stats = useMemo(() => {
    return {
      total: photos.length,
      picked: photos.filter(p => p.selection === SelectionState.PICKED).length,
      rejected: photos.filter(p => p.selection === SelectionState.REJECTED).length,
      orphans: photos.filter(p => p.status !== GroupStatus.COMPLETE).length,
      unmarked: photos.filter(p => p.selection === SelectionState.UNMARKED).length,
    };
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    switch(filter) {
      case 'PICKED': return photos.filter(p => p.selection === SelectionState.PICKED);
      case 'REJECTED': return photos.filter(p => p.selection === SelectionState.REJECTED);
      case 'UNMARKED': return photos.filter(p => p.selection === SelectionState.UNMARKED);
      case 'ORPHANS': return photos.filter(p => p.status !== GroupStatus.COMPLETE);
      default: return photos;
    }
  }, [photos, filter]);

  const currentPhoto = selectedIndex !== null ? filteredPhotos[selectedIndex] : null;

  const navigate = useCallback((direction: 'prev' | 'next') => {
    if (selectedIndex === null || filteredPhotos.length === 0) return;
    if (direction === 'next') {
      setSelectedIndex((selectedIndex + 1) % filteredPhotos.length);
    } else {
      setSelectedIndex((selectedIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
    }
  }, [selectedIndex, filteredPhotos.length]);

  const updateSelection = useCallback((state: SelectionState) => {
    if (selectedIndex === null || !currentPhoto) return;

    // Trigger animation
    if (state === SelectionState.PICKED) setAnimationClass('animate-pick');
    if (state === SelectionState.REJECTED) setAnimationClass('animate-reject');

    // Small delay to allow animation before updating state and navigating
    setTimeout(() => {
      setPhotos(prev => prev.map(p => p.id === currentPhoto.id ? { ...p, selection: state } : p));
      setAnimationClass('');
      navigate('next');
    }, 400);
  }, [selectedIndex, currentPhoto, navigate]);

  const executeFinalDelete = async () => {
    try {
      // 获取要删除的组
      const rejectedGroups = photos.filter(p => p.selection === SelectionState.REJECTED);
      
      if (rejectedGroups.length === 0) {
        setShowDeleteConfirm(false);
        return;
      }
      
      // 将组转换为 Rust 可接受的格式
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
      
      // 调用 Rust 命令将文件移动到回收站
      const movedFiles = await invoke<string[]>('move_to_trash', { groups: groupsToDelete });
      
      // 成功移动后，从状态中移除这些组
      setPhotos(prev => prev.filter(p => p.selection !== SelectionState.REJECTED));
      setShowDeleteConfirm(false);
      setSelectedIndex(photos.length > rejectedGroups.length ? 0 : null);
      
      console.log(`Successfully moved ${movedFiles.length} files to trash`);
    } catch (error) {
      console.error('Failed to move files to trash:', error);
      alert(`${t.messages.deleteFailed}: ${error}`);
      setShowDeleteConfirm(false);
    }
  };

  const handleExportStart = (mode: ExportMode) => {
    if (stats.picked === 0) {
      alert(t.messages.noPhotosToExport);
      return;
    }
    setExportMode(mode);
    setShowExportConfirm(true);
  };

  const executeExport = async (operation?: ExportOperation) => {
    if (!operation) {
      setShowExportConfirm(false);
      return;
    }

    try {
      // 使用 Tauri 的文件对话框选择目标文件夹
      const destinationFolder = await open({
        directory: true,
        multiple: false,
        title: `Select folder to ${operation === 'COPY' ? 'copy' : 'move'} files to`,
      });
      
      if (!destinationFolder || typeof destinationFolder !== 'string') {
        setShowExportConfirm(false);
        return;
      }
      
      // 获取要导出的组
      const pickedGroups = photos.filter(p => p.selection === SelectionState.PICKED);
      
      if (pickedGroups.length === 0) {
        alert(t.messages.noPhotosToExport);
        setShowExportConfirm(false);
        return;
      }
      
      // 将组转换为 Rust 可接受的格式
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
      
      // 调用 Rust 导出命令
      const exportedFiles = await invoke<string[]>('export_files', {
        groups: groupsToExport,
        exportMode: exportMode,
        operation: operation,
        destinationFolder: destinationFolder
      });
      
      // 如果是移动操作，需要从当前列表中移除这些照片
      if (operation === 'MOVE') {
        setPhotos(prev => prev.filter(p => p.selection !== SelectionState.PICKED));
        setSelectedIndex(photos.length > pickedGroups.length ? 0 : null);
      }
      
      setShowExportConfirm(false);
      const operationText = operation === 'COPY' ? t.messages.exportSuccessCopied : t.messages.exportSuccessMoved;
      alert(`${t.messages.exportSuccess} ${operationText} ${exportedFiles.length} ${t.messages.files} ${destinationFolder}`);
      console.log(`Export completed:`, exportedFiles);
    } catch (error) {
      console.error('Failed to export files:', error);
      alert(`${t.messages.exportFailed}: ${error}`);
      setShowExportConfirm(false);
    }
  };

  const getAiInsight = async () => {
    setIsAnalyzing(true);
    const insight = await analyzeSession(stats);
    setAiInsight(insight);
    setIsAnalyzing(false);
  };

  // Shortcut handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

      switch(e.key.toLowerCase()) {
        case 'arrowright': navigate('next'); break;
        case 'arrowleft': navigate('prev'); break;
        case 'p': updateSelection(SelectionState.PICKED); break;
        case 'x': updateSelection(SelectionState.REJECTED); break;
        case 'u': updateSelection(SelectionState.UNMARKED); break;
        case ' ': e.preventDefault(); /* Preview handled by being in the viewer */ break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, navigate, updateSelection]);

  // Scroll filmstrip to active index
  useEffect(() => {
    if (selectedIndex !== null && filmstripRef.current) {
      const activeEl = filmstripRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedIndex]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  return (
    <div className={`flex flex-col h-screen select-none ${theme === 'dark' ? 'bg-zinc-950' : 'bg-gray-50'}`}>
      {/* Top Nav */}
      <nav className={`h-14 border-b flex items-center justify-between px-6 z-20 backdrop-blur-md ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/80' : 'border-gray-200 bg-white/80'}`} data-tauri-drag-region>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center rotate-3 shadow-lg shadow-indigo-500/20 pointer-events-none">
              <i className="fa-solid fa-camera-retro text-xs text-white"></i>
            </div>
            <span className={`font-black text-sm tracking-tighter uppercase pointer-events-none ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'}`}>{t.appName}</span>
          </div>
  
          <div className={`flex items-center gap-1 p-1 rounded-lg border ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800/50' : 'bg-gray-100 border-gray-300/50'}`} data-tauri-drag-region="false" style={{WebkitAppRegion: 'no-drag'} as any}>
            {(['ALL', 'PICKED', 'REJECTED', 'UNMARKED', 'ORPHANS'] as const).map(f => {
              const filterKey = f.toLowerCase() as keyof typeof t.filters;
              return (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
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
              onClick={handleImportFiles}
              disabled={isLoading}
              className={`px-4 py-2 text-[11px] font-bold flex items-center gap-2 transition-colors disabled:opacity-50 border-r ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-900 border-zinc-800/50' : 'text-gray-600 hover:bg-gray-100 border-gray-300/50'}`}
            >
              <i className={`fa-solid fa-file-circle-plus ${isLoading ? 'animate-pulse' : ''}`}></i> 
              {isLoading ? t.buttons.loading : t.buttons.importFiles}
            </button>
            <button 
              onClick={handleImportFolder}
              disabled={isLoading}
              className={`px-4 py-2 text-[11px] font-bold flex items-center gap-2 transition-colors disabled:opacity-50 ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-900' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <i className={`fa-solid fa-folder-open ${isLoading ? 'animate-pulse' : ''}`}></i> 
              {isLoading ? t.buttons.loading : t.buttons.importFolder}
            </button>
          </div>
  
          <button 
             onClick={() => setShowDeleteConfirm(true)}
             disabled={stats.rejected === 0}
             className={`px-4 py-2 border rounded-lg text-[11px] font-bold transition-all disabled:opacity-30 disabled:pointer-events-none ${theme === 'dark' ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border-rose-500/30' : 'bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border-rose-300'}`}
          >
            <i className="fa-solid fa-trash-can mr-2"></i> {language === 'zh' ? `确认删除 ${stats.rejected} 项` : `Confirm ${stats.rejected} Rejects`}
          </button>
  
          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => {
                if (stats.picked === 0) {
                  alert("No photos are picked for export.");
                  return;
                }
                setShowExportMenu(!showExportMenu);
              }}
              disabled={stats.picked === 0}
              className={`px-5 py-2 rounded-lg text-[11px] font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-30 disabled:pointer-events-none ${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/30'}`}
            >
              <i className="fa-solid fa-paper-plane"></i> {t.buttons.exportPicks}
            </button>
            {showExportMenu && (
              <div className={`absolute top-full right-0 mt-2 w-44 border rounded-xl shadow-2xl z-50 p-1 flex flex-col ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                <button onClick={() => { handleExportStart('JPG'); setShowExportMenu(false); }} className={`px-4 py-2.5 text-[10px] font-bold text-left rounded-lg transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>{t.exportMenu.jpgOnly}</button>
                <button onClick={() => { handleExportStart('RAW'); setShowExportMenu(false); }} className={`px-4 py-2.5 text-[10px] font-bold text-left rounded-lg transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>{t.exportMenu.rawOnly}</button>
                <button onClick={() => { handleExportStart('BOTH'); setShowExportMenu(false); }} className={`px-4 py-2.5 text-[10px] font-bold text-left rounded-lg transition-colors border-t mt-1 pt-2 ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white border-zinc-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-gray-200'}`}>{t.exportMenu.rawAndJpg}</button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800'}`}
            title={t.settings.title}
          >
            <i className="fa-solid fa-gear text-sm"></i>
          </button>
  
          {/* Window Controls */}
          <div className={`flex items-center gap-1 ml-2 border-l pl-3 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-300'}`}>
            <button
              onClick={handleMinimize}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
              title={t.window.minimize}
            >
              <i className="fa-solid fa-window-minimize text-[10px]"></i>
            </button>
            <button
              onClick={handleMaximize}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
              title={t.window.maximize}
            >
              <i className="fa-regular fa-window-maximize text-xs"></i>
            </button>
            <button
              onClick={handleClose}
              className={`w-8 h-8 flex items-center justify-center rounded hover:bg-red-600 transition-colors hover:text-white ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}
              title={t.window.close}
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {photos.length === 0 ? (
          <div className={`flex-1 flex flex-col items-center justify-center p-20 text-center ${theme === 'dark' ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950' : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-100 to-gray-50'}`}>
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border shadow-2xl relative ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
              <i className={`fa-solid fa-images text-4xl ${theme === 'dark' ? 'text-zinc-700' : 'text-gray-300'}`}></i>
              <div className={`absolute -top-3 -right-3 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white border-4 ${theme === 'dark' ? 'border-zinc-950' : 'border-gray-50'}`}>
                <i className="fa-solid fa-plus text-sm"></i>
              </div>
            </div>
            <h2 className={`text-3xl font-black mb-3 tracking-tighter uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.emptyState.title}</h2>
            <p className={`max-w-md text-lg font-medium leading-snug ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
              {t.emptyState.description}
            </p>
          </div>
        ) : (
          <>
            {/* Viewer Component */}
            {currentPhoto && (
              <Viewer group={currentPhoto} animationClass={animationClass} onUpdateSelection={updateSelection} theme={theme} language={language} />
            )}

            {/* Filmstrip / Thumbnails */}
            <div className={`h-28 border-t flex items-center px-4 gap-2 overflow-x-auto overflow-y-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'}`} ref={filmstripRef}>
               {filteredPhotos.map((p, idx) => (
                 <button 
                  key={p.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={`flex-shrink-0 h-20 w-32 relative rounded-md overflow-hidden border-2 transition-all group ${
                    selectedIndex === idx ? 'border-indigo-500 scale-105 z-10' : 'border-transparent opacity-60 hover:opacity-100 hover:border-zinc-700'
                  }`}
                 >
                   <ThumbnailImage group={p} />
                   
                   {/* Selection Marker */}
                   {p.selection === SelectionState.PICKED && <div className="absolute inset-0 border-4 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center"><i className="fa-solid fa-flag text-emerald-500 text-xs"></i></div>}
                   {p.selection === SelectionState.REJECTED && <div className="absolute inset-0 border-4 border-rose-500/50 bg-rose-500/20 flex items-center justify-center"><i className="fa-solid fa-xmark text-rose-500 text-xs"></i></div>}
                   
                   <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 backdrop-blur-sm text-[8px] text-zinc-400 font-mono truncate">
                     {p.id}
                   </div>
                 </button>
               ))}
            </div>
          </>
        )}
      </main>

      {/* Hidden Inputs */}
      <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleImport} accept=".jpg,.jpeg,.arw,.cr2,.nef,.dng" />
      {/* Fix: use any spread to allow non-standard webkitdirectory attribute in React with TypeScript */}
      <input type="file" {...({ webkitdirectory: "" } as any)} className="hidden" ref={folderInputRef} onChange={handleImport} />

      {/* Modals */}
      {showDeleteConfirm && (
        <ConfirmationModal 
          type="delete"
          groups={photos.filter(p => p.selection === SelectionState.REJECTED)}
          onConfirm={executeFinalDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          theme={theme}
          language={language}
        />
      )}
      
      {showExportConfirm && (
        <ConfirmationModal 
          type="export"
          groups={photos.filter(p => p.selection === SelectionState.PICKED)}
          onConfirm={executeExport}
          onCancel={() => setShowExportConfirm(false)}
          theme={theme}
          language={language}
        />
      )}

      {/* Footer Info / Insight */}
      <footer className={`h-10 border-t px-6 flex items-center justify-between text-[10px] z-20 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-500' : 'bg-white border-gray-200 text-gray-500'}`}>
        <div className="flex gap-4">
          <span>{stats.total} {t.footer.total}</span>
          <span className="text-emerald-500 font-bold">{stats.picked} {t.footer.picked}</span>
          <span className="text-rose-500 font-bold">{stats.rejected} {t.footer.stagedForTrash}</span>
          <span className="text-amber-500 font-bold">{stats.orphans} {t.footer.orphans}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 max-w-md truncate italic text-zinc-400">
            <i className="fa-solid fa-sparkles text-indigo-400"></i>
            {aiInsight || t.footer.aiInsightPlaceholder}
          </div>
          <button 
            onClick={getAiInsight}
            disabled={isAnalyzing || photos.length === 0}
            className="hover:text-indigo-400 transition-colors disabled:opacity-0"
          >
            <i className={`fa-solid fa-wand-magic-sparkles ${isAnalyzing ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </footer>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        theme={theme}
        language={language}
        onThemeChange={setTheme}
        onLanguageChange={setLanguage}
      />
    </div>
  );
};

export default App;

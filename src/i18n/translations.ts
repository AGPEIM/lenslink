export const translations = {
  zh: {
    // 应用标题
    appName: 'LensLink Pro',
    
    // 导航栏 - 过滤器
    filters: {
      all: '全部',
      picked: '精选',
      rejected: '待删除',
      unmarked: '未标记',
      orphans: '单独文件'
    },
    
    // 导航栏 - 按钮
    buttons: {
      importFiles: '导入文件',
      importFolder: '导入文件夹',
      confirmRejects: '确认删除',
      exportPicks: '导出精选',
      settings: '设置',
      loading: '加载中...',
      deleteAllOrphanRaw: '删除所有单独RAW',
      deleteAllOrphanJpg: '删除所有单独JPG'
    },
    
    // 导出菜单
    exportMenu: {
      jpgOnly: '仅 JPG',
      rawOnly: '仅 RAW',
      rawAndJpg: 'RAW + JPG'
    },
    
    // 状态文本
    status: {
      picked: '已精选',
      rejected: '已拒绝',
      unmarked: '未标记',
      complete: '完整',
      jpgOnly: '仅 JPG',
      rawOnly: '仅 RAW'
    },
    
    // 窗口控制
    window: {
      minimize: '最小化',
      maximize: '最大化',
      restore: '还原',
      close: '关闭'
    },
    
    // 空白状态
    emptyState: {
      title: '准备好导入照片了吗？',
      description: '导入文件夹或选择文件。我们会自动配对您的 RAW 和 JPG 文件以便统一管理。'
    },
    
    // 页脚统计
    footer: {
      total: '总计',
      picked: '已精选',
      stagedForTrash: '待删除',
      orphans: '单独文件',
      aiInsightPlaceholder: '点击侧边栏的魔杖图标进行会话分析。'
    },
    
    // 设置面板
    settings: {
      title: '设置',
      theme: '主题',
      lightMode: '浅色模式',
      darkMode: '深色模式',
      language: '语言',
      chinese: '中文',
      english: 'English',
      close: '关闭'
    },
    
    // 查看器组件
    viewer: {
      // 缩放控制
      zoom: {
        reset: '重置'
      },
      
      // 状态标签
      statusLabel: {
        picked: '已精选',
        rejected: '已拒绝'
      },
      
      // RAW 加载状态
      rawLoading: {
        title: '正在解码 RAW 文件...',
        processing: '正在处理',
        file: '文件'
      },
      
      // RAW 错误状态
      rawError: {
        title: '解码 RAW 失败',
        couldNotProcess: '无法处理',
        file: '文件'
      },
      
      // 无预览状态
      noPreview: {
        title: '无可用预览',
        rawWithoutPreview: 'RAW 文件无预览',
        noImageFound: '未找到图像文件'
      },
      
      // EXIF 信息标签
      exif: {
        shutter: '快门',
        aperture: '光圈',
        iso: 'ISO',
        focal: '焦距',
        device: '设备',
        optics: '镜头',
        timestamp: '时间戳'
      },
      
      // 文件信息
      files: {
        bundleFiles: '包含文件'
      },
      
      // 提示信息
      tips: {
        mouseWheel: '使用鼠标滚轮缩放',
        dragToPan: '缩放时点击并拖动平移',
        doubleClick: '双击重置视图'
      },
      
      // 快速评级
      rating: {
        title: '快速分类',
        pick: '精选',
        unmark: '取消标记',
        reject: '删除',
        pressPToPick: '按 P 键精选',
        pressUToUnmark: '按 U 键取消标记',
        pressXToReject: '按 X 键删除'
      }
    },
    
    // 确认对话框
    confirmationModal: {
      // 删除确认
      delete: {
        title: '移至回收站',
        confirmLabel: '移至回收站',
        description: '个照片组（',
        individualFiles: '个独立文件）。文件将被移至回收站，可以还原。',
        youAreAboutToMoveToTrash: '您即将移至回收站'
      },
      
      // 导出确认
      export: {
        title: '导出精选项',
        confirmLabel: '导出为',
        description: '个照片组（',
        individualFiles: '个独立文件）。',
        youAreAboutToExport: '您即将导出',
        operationType: '操作类型',
        copyFiles: '复制文件',
        moveFiles: '移动文件',
        copyDescription: '原文件将保留在当前位置',
        moveDescription: '原文件将从当前位置移动',
        copy: '复制',
        move: '移动'
      },
      
      // 通用按钮
      buttons: {
        cancel: '取消'
      },
      
      // 列表提示
      andMore: '... 还有',
      more: '项'
    },
    
    // 消息提示
    messages: {
      importFailed: '导入失败',
      exportFailed: '导出失败',
      deleteFailed: '删除失败',
      noPhotosToExport: '没有照片可导出。',
      exportSuccess: '成功',
      exportSuccessCopied: '已复制',
      exportSuccessMoved: '已移动',
      files: '个文件到',
      selectFolder: '选择文件夹以',
      selectFolderToCopy: '复制文件到',
      selectFolderToMove: '移动文件到',
      noOrphanRawFiles: '没有单独的RAW文件。',
      noOrphanJpgFiles: '没有单独的JPG文件。',
      orphanDeleteSuccess: '成功移至回收站',
      orphanDeleteConfirm: '确认删除孤儿文件',
      orphanRawCount: '个单独RAW文件',
      orphanJpgCount: '个单独JPG文件'
    }
  },
  
  en: {
    // Application title
    appName: 'LensLink Pro',
    
    // Navigation bar - Filters
    filters: {
      all: 'ALL',
      picked: 'PICKED',
      rejected: 'REJECTED',
      unmarked: 'UNMARKED',
      orphans: 'ORPHANS'
    },
    
    // Navigation bar - Buttons
    buttons: {
      importFiles: 'Import Files',
      importFolder: 'Import Folder',
      confirmRejects: 'Confirm Rejects',
      exportPicks: 'Export Picks',
      settings: 'Settings',
      loading: 'Loading...',
      deleteAllOrphanRaw: 'Delete All Orphan RAW',
      deleteAllOrphanJpg: 'Delete All Orphan JPG'
    },
    
    // Export menu
    exportMenu: {
      jpgOnly: 'JPG ONLY',
      rawOnly: 'RAW ONLY',
      rawAndJpg: 'RAW + JPG'
    },
    
    // Status text
    status: {
      picked: 'PICKED',
      rejected: 'REJECTED',
      unmarked: 'UNMARKED',
      complete: 'COMPLETE',
      jpgOnly: 'JPG ONLY',
      rawOnly: 'RAW ONLY'
    },
    
    // Window controls
    window: {
      minimize: 'Minimize',
      maximize: 'Maximize',
      restore: 'Restore',
      close: 'Close'
    },
    
    // Empty state
    emptyState: {
      title: 'Ready for your shoot?',
      description: 'Import a folder or selection of files. We\'ll automatically pair your RAW and JPG files for consistent management.'
    },
    
    // Footer statistics
    footer: {
      total: 'TOTAL',
      picked: 'PICKED',
      stagedForTrash: 'STAGED FOR TRASH',
      orphans: 'ORPHANS',
      aiInsightPlaceholder: 'Press the wand icon in sidebar for session analysis.'
    },
    
    // Settings panel
    settings: {
      title: 'Settings',
      theme: 'Theme',
      lightMode: 'Light Mode',
      darkMode: 'Dark Mode',
      language: 'Language',
      chinese: '中文',
      english: 'English',
      close: 'Close'
    },
    
    // Viewer component
    viewer: {
      // Zoom controls
      zoom: {
        reset: 'RESET'
      },
      
      // Status labels
      statusLabel: {
        picked: 'PICKED',
        rejected: 'REJECTED'
      },
      
      // RAW loading status
      rawLoading: {
        title: 'Decoding RAW File...',
        processing: 'Processing',
        file: 'file'
      },
      
      // RAW error status
      rawError: {
        title: 'Failed to Decode RAW',
        couldNotProcess: 'Could not process',
        file: 'file'
      },
      
      // No preview status
      noPreview: {
        title: 'No Preview Available',
        rawWithoutPreview: 'RAW file without preview',
        noImageFound: 'No image file found'
      },
      
      // EXIF labels
      exif: {
        shutter: 'Shutter',
        aperture: 'Aperture',
        iso: 'ISO',
        focal: 'Focal',
        device: 'Device',
        optics: 'Optics',
        timestamp: 'Timestamp'
      },
      
      // File information
      files: {
        bundleFiles: 'Bundle Files'
      },
      
      // Tips
      tips: {
        mouseWheel: '• Use Mouse Wheel to zoom',
        dragToPan: '• Click & Drag to pan when zoomed',
        doubleClick: '• Double-click to reset view'
      },
      
      // Quick rating
      rating: {
        title: 'Quick Rating',
        pick: 'Pick',
        unmark: 'Unmark',
        reject: 'Reject',
        pressPToPick: 'Press P to pick',
        pressUToUnmark: 'Press U to unmark',
        pressXToReject: 'Press X to reject'
      }
    },
    
    // Confirmation modal
    confirmationModal: {
      // Delete confirmation
      delete: {
        title: 'Move to Trash',
        confirmLabel: 'Move to Trash',
        description: ' photo groups (',
        individualFiles: ' individual files). Files will be moved to the recycle bin and can be restored.',
        youAreAboutToMoveToTrash: 'You are about to move to trash'
      },
      
      // Export confirmation
      export: {
        title: 'Export Selected',
        confirmLabel: 'Export as',
        description: ' photo groups (',
        individualFiles: ' individual files).',
        youAreAboutToExport: 'You are about to export',
        operationType: 'Operation Type',
        copyFiles: 'Copy Files',
        moveFiles: 'Move Files',
        copyDescription: 'Original files will remain in their current location',
        moveDescription: 'Original files will be moved from their current location',
        copy: 'Copy',
        move: 'Move'
      },
      
      // Common buttons
      buttons: {
        cancel: 'Cancel'
      },
      
      // List hints
      andMore: '... and',
      more: 'more'
    },
    
    // Message prompts
    messages: {
      importFailed: 'Import failed',
      exportFailed: 'Export failed',
      deleteFailed: 'Delete failed',
      noPhotosToExport: 'No photos are picked for export.',
      exportSuccess: 'Successfully',
      exportSuccessCopied: 'copied',
      exportSuccessMoved: 'moved',
      files: 'files to',
      selectFolder: 'Select folder to',
      selectFolderToCopy: 'copy files to',
      selectFolderToMove: 'move files to',
      noOrphanRawFiles: 'No orphan RAW files.',
      noOrphanJpgFiles: 'No orphan JPG files.',
      orphanDeleteSuccess: 'Successfully moved to trash',
      orphanDeleteConfirm: 'Confirm Delete Orphan Files',
      orphanRawCount: ' orphan RAW files',
      orphanJpgCount: ' orphan JPG files'
    }
  }
};

export type TranslationKey = keyof typeof translations.zh;

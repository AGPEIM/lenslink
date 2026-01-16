import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  ShortcutConfig,
  ShortcutAction,
  ShortcutBinding,
  DEFAULT_SHORTCUTS,
} from '../types/shortcuts';

const STORAGE_KEY = 'lenslink-shortcuts';

function validateConfig(config: unknown): config is ShortcutConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as ShortcutConfig;
  if (!Array.isArray(c.bindings)) return false;
  return c.bindings.every(
    (b) =>
      typeof b.action === 'string' &&
      typeof b.key === 'string' &&
      typeof b.displayKey === 'string'
  );
}

function loadConfig(): ShortcutConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (validateConfig(parsed)) {
        const existingActions = new Set(
          parsed.bindings.map((b: ShortcutBinding) => b.action)
        );
        const missingBindings = DEFAULT_SHORTCUTS.bindings.filter(
          (b) => !existingActions.has(b.action)
        );
        if (missingBindings.length > 0) {
          return {
            bindings: [...parsed.bindings, ...missingBindings],
          };
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse shortcuts config:', e);
  }
  return DEFAULT_SHORTCUTS;
}

interface ShortcutsContextValue {
  config: ShortcutConfig;
  updateBinding: (action: ShortcutAction, key: string, displayKey: string) => void;
  checkConflict: (action: ShortcutAction, key: string) => ShortcutBinding | null;
  resetToDefault: () => void;
  getActionByKey: (key: string) => ShortcutAction | null;
  getKeyByAction: (action: ShortcutAction) => ShortcutBinding | null;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ShortcutConfig>(loadConfig);

  // 持久化到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // 更新单个快捷键
  const updateBinding = useCallback(
    (action: ShortcutAction, key: string, displayKey: string) => {
      setConfig((prev) => ({
        bindings: prev.bindings.map((b) =>
          b.action === action ? { ...b, key, displayKey } : b
        ),
      }));
    },
    []
  );

  // 检测冲突：返回使用相同按键的其他动作
  const checkConflict = useCallback(
    (action: ShortcutAction, key: string): ShortcutBinding | null => {
      if (!key) return null;
      const conflict = config.bindings.find(
        (b) => b.key.toLowerCase() === key.toLowerCase() && b.action !== action
      );
      return conflict || null;
    },
    [config]
  );

  // 恢复默认
  const resetToDefault = useCallback(() => {
    setConfig(DEFAULT_SHORTCUTS);
  }, []);

  // 按键到动作的映射（用于快速查找）
  const keyToActionMap = useMemo(() => {
    const map = new Map<string, ShortcutAction>();
    for (const binding of config.bindings) {
      if (binding.key) {
        map.set(binding.key.toLowerCase(), binding.action);
      }
    }
    return map;
  }, [config]);

  // 根据按键获取动作
  const getActionByKey = useCallback(
    (key: string): ShortcutAction | null => {
      return keyToActionMap.get(key.toLowerCase()) || null;
    },
    [keyToActionMap]
  );

  // 根据动作获取按键
  const getKeyByAction = useCallback(
    (action: ShortcutAction): ShortcutBinding | null => {
      return config.bindings.find((b) => b.action === action) || null;
    },
    [config]
  );

  const value = useMemo(
    () => ({
      config,
      updateBinding,
      checkConflict,
      resetToDefault,
      getActionByKey,
      getKeyByAction,
    }),
    [config, updateBinding, checkConflict, resetToDefault, getActionByKey, getKeyByAction]
  );

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts(): ShortcutsContextValue {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutsProvider');
  }
  return context;
}

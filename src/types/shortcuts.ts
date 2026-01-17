// 所有支持的快捷键动作
export type ShortcutAction =
  | 'navigate_next'
  | 'navigate_prev'
  | 'mark_picked'
  | 'mark_rejected'
  | 'mark_unmarked';

// 单个快捷键配置
export interface ShortcutBinding {
  action: ShortcutAction;
  key: string;        // 按键标识符，如 'p', 'arrowright', 'space'
  displayKey: string; // 用于显示的按键名称，如 'P', '→', 'Space'
}

// 完整的快捷键配置
export interface ShortcutConfig {
  bindings: ShortcutBinding[];
}

// 默认快捷键配置
export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  bindings: [
    { action: 'navigate_next', key: 'arrowright', displayKey: '→' },
    { action: 'navigate_prev', key: 'arrowleft', displayKey: '←' },
    { action: 'mark_picked', key: 'p', displayKey: 'P' },
    { action: 'mark_rejected', key: 'x', displayKey: 'X' },
    { action: 'mark_unmarked', key: 'u', displayKey: 'U' },
  ]
};

// 快捷键动作的元数据（用于 UI 显示）
export interface ShortcutActionMeta {
  action: ShortcutAction;
  icon: string;    // FontAwesome 图标类名
  labelKey: string; // i18n 翻译键
}

export const SHORTCUT_ACTIONS_META: ShortcutActionMeta[] = [
  { action: 'navigate_prev', icon: 'fa-arrow-left', labelKey: 'navigatePrev' },
  { action: 'navigate_next', icon: 'fa-arrow-right', labelKey: 'navigateNext' },
  { action: 'mark_picked', icon: 'fa-flag', labelKey: 'markPicked' },
  { action: 'mark_rejected', icon: 'fa-trash-can', labelKey: 'markRejected' },
  { action: 'mark_unmarked', icon: 'fa-circle-dot', labelKey: 'markUnmarked' },
];

// 按键显示名称映射
export const KEY_DISPLAY_MAP: Record<string, string> = {
  'arrowup': '↑',
  'arrowdown': '↓',
  'arrowleft': '←',
  'arrowright': '→',
  ' ': 'Space',
  'enter': 'Enter',
  'escape': 'Esc',
  'backspace': '⌫',
  'delete': 'Del',
  'tab': 'Tab',
};

export function getDisplayKey(key: string): string {
  const lowerKey = key.toLowerCase();
  if (KEY_DISPLAY_MAP[lowerKey]) {
    return KEY_DISPLAY_MAP[lowerKey];
  }
  // 单字符按键显示为大写
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key;
}

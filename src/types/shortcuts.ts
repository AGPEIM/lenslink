// 所有支持的快捷键动作
export type ShortcutAction =
  | 'navigate_next'
  | 'navigate_prev'
  | 'mark_picked'
  | 'mark_rejected'
  | 'mark_unmarked'
  | 'rate_1'
  | 'rate_2'
  | 'rate_3'
  | 'rate_4'
  | 'rate_5'
  | 'clear_rating';

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
    { action: 'rate_1', key: '1', displayKey: '1' },
    { action: 'rate_2', key: '2', displayKey: '2' },
    { action: 'rate_3', key: '3', displayKey: '3' },
    { action: 'rate_4', key: '4', displayKey: '4' },
    { action: 'rate_5', key: '5', displayKey: '5' },
    { action: 'clear_rating', key: '0', displayKey: '0' },
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
  { action: 'rate_1', icon: 'fa-star', labelKey: 'rate1' },
  { action: 'rate_2', icon: 'fa-star', labelKey: 'rate2' },
  { action: 'rate_3', icon: 'fa-star', labelKey: 'rate3' },
  { action: 'rate_4', icon: 'fa-star', labelKey: 'rate4' },
  { action: 'rate_5', icon: 'fa-star', labelKey: 'rate5' },
  { action: 'clear_rating', icon: 'fa-star-half-stroke', labelKey: 'clearRating' },
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

import React, { useState } from 'react';
import { ResolvedTheme } from '../hooks/useTheme';
import { Language, getTranslations } from '../i18n';
import { useShortcuts } from '../contexts/ShortcutsContext';
import { SHORTCUT_ACTIONS_META, ShortcutAction } from '../types/shortcuts';
import KeyRecorder from './KeyRecorder';

interface ShortcutSettingsProps {
  theme: ResolvedTheme;
  language: Language;
}

const ShortcutSettings: React.FC<ShortcutSettingsProps> = ({
  theme,
  language,
}) => {
  const t = getTranslations(language);
  const { updateBinding, checkConflict, resetToDefault, getKeyByAction } =
    useShortcuts();
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(
    null
  );
  const [pendingConflict, setPendingConflict] = useState<{
    action: ShortcutAction;
    key: string;
    displayKey: string;
  } | null>(null);

  const handleKeyRecorded = (
    action: ShortcutAction,
    key: string,
    displayKey: string
  ) => {
    const conflict = checkConflict(action, key);

    if (conflict) {
      setPendingConflict({ action, key, displayKey });
    } else {
      updateBinding(action, key, displayKey);
      setRecordingAction(null);
    }
  };

  const handleConfirmOverride = () => {
    if (pendingConflict) {
      const conflict = checkConflict(
        pendingConflict.action,
        pendingConflict.key
      );
      if (conflict) {
        updateBinding(conflict.action, '', '');
      }
      updateBinding(
        pendingConflict.action,
        pendingConflict.key,
        pendingConflict.displayKey
      );
      setPendingConflict(null);
      setRecordingAction(null);
    }
  };

  const handleCancelOverride = () => {
    setPendingConflict(null);
    setRecordingAction(null);
  };

  return (
    <div className="space-y-3">
      {/* 标题和重置按钮 */}
      <div className="flex items-center justify-between">
        <label
          className={`text-sm font-bold ${
            theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
          }`}
        >
          <i className="fa-solid fa-keyboard mr-2"></i>
          {t.settings.shortcuts.title}
        </label>
        <button
          onClick={resetToDefault}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            theme === 'dark'
              ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          }`}
        >
          <i className="fa-solid fa-rotate-left mr-1"></i>
          {t.settings.shortcuts.resetToDefault}
        </button>
      </div>

      {/* 快捷键列表 */}
      <div className="space-y-2">
        {SHORTCUT_ACTIONS_META.map((meta) => {
          const binding = getKeyByAction(meta.action);
          const isRecording = recordingAction === meta.action;
          const actionLabel =
            t.settings.shortcuts.actions[
              meta.labelKey as keyof typeof t.settings.shortcuts.actions
            ];

          return (
            <div
              key={meta.action}
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-zinc-800/50' : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <i
                  className={`fa-solid ${meta.icon} w-4 text-center text-xs ${
                    theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'
                  }`}
                ></i>
                <span
                  className={`text-sm ${
                    theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'
                  }`}
                >
                  {actionLabel}
                </span>
              </div>
              <KeyRecorder
                currentDisplayKey={binding?.displayKey || '--'}
                isRecording={isRecording}
                onStartRecording={() => setRecordingAction(meta.action)}
                onKeyRecorded={(key, displayKey) =>
                  handleKeyRecorded(meta.action, key, displayKey)
                }
                onCancel={() => setRecordingAction(null)}
                theme={theme}
              />
            </div>
          );
        })}
      </div>

      {/* 冲突确认对话框 */}
      {pendingConflict && (
        <div
          className={`p-2.5 rounded-lg border ${
            theme === 'dark'
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <p
            className={`text-xs mb-2 ${
              theme === 'dark' ? 'text-amber-300' : 'text-amber-700'
            }`}
          >
            <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
            {t.settings.shortcuts.conflictWarning}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmOverride}
              className="px-2.5 py-1 text-xs font-bold rounded bg-amber-500 text-white hover:bg-amber-600"
            >
              {t.settings.shortcuts.override}
            </button>
            <button
              onClick={handleCancelOverride}
              className={`px-2.5 py-1 text-xs font-bold rounded ${
                theme === 'dark'
                  ? 'bg-zinc-700 text-zinc-300'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {t.settings.shortcuts.cancel}
            </button>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      <p
        className={`text-[11px] ${
          theme === 'dark' ? 'text-zinc-600' : 'text-gray-500'
        }`}
      >
        {t.settings.shortcuts.hint}
      </p>
    </div>
  );
};

export default ShortcutSettings;

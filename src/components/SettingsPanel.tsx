import React from 'react';
import { getTranslations, Language } from '../i18n';
import { ThemeMode, ResolvedTheme } from '../hooks/useTheme';
import { SelectionMode } from '../types';
import ShortcutSettings from './ShortcutSettings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  language: Language;
  onThemeModeChange: (mode: ThemeMode) => void;
  onLanguageChange: (language: Language) => void;
  enableAnimation: boolean;
  onEnableAnimationChange: (enabled: boolean) => void;
  selectionMode: SelectionMode;
  onSelectionModeChange: (mode: SelectionMode) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  theme,
  themeMode,
  language,
  onThemeModeChange,
  onLanguageChange,
  enableAnimation,
  onEnableAnimationChange,
  selectionMode,
  onSelectionModeChange,
}) => {
  if (!isOpen) return null;

  const t = getTranslations(language);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <div className={`fixed top-16 right-6 w-96 max-h-[calc(100vh-5rem)] flex flex-col border rounded-xl shadow-2xl z-50 overflow-hidden ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.settings.title}</h3>
          <button
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Theme Setting */}
          <div>
            <label className={`block text-sm font-bold mb-3 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
              <i className="fa-solid fa-palette mr-2"></i>
              {t.settings.theme}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onThemeModeChange('light')}
                className={`flex-1 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                  themeMode === 'light'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                <i className="fa-solid fa-sun mr-1.5"></i>
                {t.settings.lightMode}
              </button>
              <button
                onClick={() => onThemeModeChange('dark')}
                className={`flex-1 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                  themeMode === 'dark'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                <i className="fa-solid fa-moon mr-1.5"></i>
                {t.settings.darkMode}
              </button>
              <button
                onClick={() => onThemeModeChange('system')}
                className={`flex-1 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                  themeMode === 'system'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                <i className="fa-solid fa-circle-half-stroke mr-1.5"></i>
                {t.settings.systemMode}
              </button>
            </div>
          </div>

          {/* Language Setting */}
          <div>
            <label className={`block text-sm font-bold mb-3 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
              <i className="fa-solid fa-language mr-2"></i>
              {t.settings.language}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onLanguageChange('zh')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  language === 'zh'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                {t.settings.chinese}
              </button>
              <button
                onClick={() => onLanguageChange('en')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  language === 'en'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                {t.settings.english}
              </button>
            </div>
          </div>

          {/* Selection Mode Setting */}
          <div>
            <label className={`block text-sm font-bold mb-3 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
              <i className="fa-solid fa-tags mr-2"></i>
              {t.settings.selectionMode}
            </label>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onSelectionModeChange('pick_reject')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                  selectionMode === 'pick_reject'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : (theme === 'dark'
                        ? 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/20 hover:border-zinc-600/50'
                        : 'bg-gray-100/60 border-gray-300/50 text-gray-700 hover:bg-gray-200/60 hover:border-gray-400/50')
                }`}
              >
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-flag text-base"></i>
                  <div className="text-left">
                    <div className="font-semibold text-sm">{t.settings.pickRejectMode}</div>
                    <div className={`text-[10px] ${selectionMode === 'pick_reject' ? 'text-indigo-200' : (theme === 'dark' ? 'text-zinc-500' : 'text-gray-500')}`}>{t.settings.pickRejectModeDesc}</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => onSelectionModeChange('rating')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                  selectionMode === 'rating'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : (theme === 'dark'
                        ? 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/20 hover:border-zinc-600/50'
                        : 'bg-gray-100/60 border-gray-300/50 text-gray-700 hover:bg-gray-200/60 hover:border-gray-400/50')
                }`}
              >
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-star text-base"></i>
                  <div className="text-left">
                    <div className="font-semibold text-sm">{t.settings.ratingMode}</div>
                    <div className={`text-[10px] ${selectionMode === 'rating' ? 'text-indigo-200' : (theme === 'dark' ? 'text-zinc-500' : 'text-gray-500')}`}>{t.settings.ratingModeDesc}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Animation Setting */}
          <div>
            <label className={`block text-sm font-bold mb-3 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
              <i className="fa-solid fa-film mr-2"></i>
              {t.settings.animation}
            </label>
            <button
              onClick={() => onEnableAnimationChange(!enableAnimation)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                enableAnimation
                  ? (theme === 'dark'
                      ? 'bg-emerald-900/20 border-emerald-700/30'
                      : 'bg-emerald-50 border-emerald-200')
                  : (theme === 'dark'
                      ? 'bg-zinc-800/40 border-zinc-700/50'
                      : 'bg-gray-100/60 border-gray-300/50')
              }`}
            >
              <span className={`text-sm font-semibold ${
                enableAnimation
                  ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700')
                  : (theme === 'dark' ? 'text-zinc-400' : 'text-gray-600')
              }`}>
                {t.settings.animationDescription}
              </span>
              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
                enableAnimation
                  ? 'bg-indigo-600'
                  : (theme === 'dark' ? 'bg-zinc-700' : 'bg-gray-300')
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow ${
                  enableAnimation ? 'translate-x-5' : 'translate-x-0'
                }`}></div>
              </div>
            </button>
          </div>

          {/* Keyboard Shortcuts Setting */}
          <div className={`pt-6 border-t ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
            <ShortcutSettings theme={theme} language={language} />
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;

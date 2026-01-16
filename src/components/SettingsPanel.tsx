import React from 'react';
import { getTranslations, Language } from '../i18n';
import { ThemeMode, ResolvedTheme } from '../hooks/useTheme';
import ShortcutSettings from './ShortcutSettings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  language: Language;
  onThemeModeChange: (mode: ThemeMode) => void;
  onLanguageChange: (language: Language) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  theme,
  themeMode,
  language,
  onThemeModeChange,
  onLanguageChange,
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

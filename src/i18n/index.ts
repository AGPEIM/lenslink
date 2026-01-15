import { createContext, useContext } from 'react';
import { translations } from './translations';

export type Language = 'zh' | 'en';

export type TranslationKeys = typeof translations.zh;

export interface I18nContextType {
  language: Language;
  t: TranslationKeys;
  setLanguage: (lang: Language) => void;
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
};

export const getTranslations = (language: Language): TranslationKeys => {
  return translations[language];
};

export { translations };

import React, { useState, useMemo, ReactNode } from 'react';
import { I18nContext, Language, getTranslations } from './index';

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, defaultLanguage = 'zh' }) => {
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  const value = useMemo(() => ({
    language,
    t: getTranslations(language),
    setLanguage
  }), [language]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

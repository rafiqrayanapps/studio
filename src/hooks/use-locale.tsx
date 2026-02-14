'use client';
import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import ar from '@/lib/locales/ar.json';
import en from '@/lib/locales/en.json';

type Locale = 'ar' | 'en';
type Translations = Record<string, string>;

const locales: Record<Locale, Translations> = { ar, en };

type LocaleContextType = {
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('ar');

  useEffect(() => {
    // On mount, read locale from localStorage
    const storedLocale = localStorage.getItem('locale') as Locale | null;
    if (storedLocale && ['ar', 'en'].includes(storedLocale)) {
      setLocale(storedLocale);
    }
  }, []);

  useEffect(() => {
    // This effect runs only on the client
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let translation = locales[locale][key] || key;
    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    return translation;
  }, [locale]);
  
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

'use client';
import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // On mount, read locale from localStorage
    const storedLocale = localStorage.getItem('locale') as Locale | null;
    if (storedLocale && ['ar', 'en'].includes(storedLocale)) {
      setLocale(storedLocale);
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // This effect runs only after mounting and when locale changes.
    // It prevents server/client mismatch for document attributes.
    if (isMounted) {
      localStorage.setItem('locale', locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    }
  }, [locale, isMounted]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = locales[locale][key] || key;
    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    return translation;
  };
  
  // To prevent hydration mismatch, we don't render the children until the component is mounted
  // and the initial locale is determined from localStorage. The splash screen will be visible during this time.
  if (!isMounted) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
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

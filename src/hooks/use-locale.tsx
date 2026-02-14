'use client';
import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';

type Locale = 'ar' | 'en';

type LocaleContextType = {
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('ar');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // On mount, read locale from localStorage
    const storedLocale = localStorage.getItem('locale') as Locale | null;
    if (storedLocale) {
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

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
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

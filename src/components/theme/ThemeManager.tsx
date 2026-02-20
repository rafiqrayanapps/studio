'use client';

import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import type { ThemeConfig } from '@/lib/definitions';
import { useTheme } from 'next-themes';

const DEFAULT_COLOR = '350 72% 51%';

export default function ThemeManager() {
  const firestore = useFirestore();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!firestore) return;

    const themeRef = doc(firestore, 'appConfig', 'theme');
    const unsubscribe = onSnapshot(themeRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ThemeConfig;
        const lightColor = data.primaryColor || DEFAULT_COLOR;
        const darkColor = data.primaryColorDark || lightColor;

        // Apply to CSS variables on :root
        document.documentElement.style.setProperty('--primary-light-val', lightColor);
        document.documentElement.style.setProperty('--primary-dark-val', darkColor);
        
        // Immediate UI Update hint for Tailwind
        const currentPrimary = resolvedTheme === 'dark' ? darkColor : lightColor;
        document.documentElement.style.setProperty('--primary', currentPrimary);
      }
    });

    return () => unsubscribe();
  }, [firestore, resolvedTheme]);

  // Update meta theme color when primary color or theme changes
  useEffect(() => {
      const style = window.getComputedStyle(document.documentElement);
      const primaryColorValue = style.getPropertyValue('--primary');
      if (primaryColorValue) {
          let meta = document.querySelector('meta[name="theme-color"]');
          if (!meta) {
              meta = document.createElement('meta');
              meta.setAttribute('name', 'theme-color');
              document.head.appendChild(meta);
          }
          meta.setAttribute('content', `hsl(${primaryColorValue})`);
      }
  }, [resolvedTheme]);

  return null;
}

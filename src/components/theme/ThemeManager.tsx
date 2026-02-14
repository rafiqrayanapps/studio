'use client';

import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import type { ThemeConfig } from '@/lib/definitions';
import { useTheme } from 'next-themes';

const THEME_LIGHT_KEY = 'primaryColor';
const THEME_DARK_KEY = 'primaryColorDark';
const DEFAULT_COLOR_LIGHT = '350 72% 51%';
const DEFAULT_COLOR_DARK = '350 72% 51%';

/**
 * Updates the theme-color meta tag in the document head.
 * @param color - The HSL color string (e.g., '350 72% 51%').
 */
function updateThemeColorMeta(color: string) {
  if (typeof window === 'undefined') return;

  const fullHslColor = `hsl(${color})`;
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');

  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', fullHslColor);
  } else {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    metaThemeColor.content = fullHslColor;
    document.getElementsByTagName('head')[0].appendChild(metaThemeColor);
  }
}

export default function ThemeManager() {
  const firestore = useFirestore();
  const { resolvedTheme } = useTheme();

  // This effect handles applying the theme from localStorage and Firestore updates
  useEffect(() => {
    let lightColor = DEFAULT_COLOR_LIGHT;
    let darkColor = DEFAULT_COLOR_DARK;

    // Apply from localStorage first
    try {
      const storedLightColor = window.localStorage.getItem(THEME_LIGHT_KEY);
      if (storedLightColor) lightColor = JSON.parse(storedLightColor);

      const storedDarkColor = window.localStorage.getItem(THEME_DARK_KEY);
      if (storedDarkColor) darkColor = JSON.parse(storedDarkColor);
    } catch (e) {
      console.error("Failed to parse theme color from localStorage, reverting to default.", e);
      window.localStorage.removeItem(THEME_LIGHT_KEY);
      window.localStorage.removeItem(THEME_DARK_KEY);
    }
    
    document.documentElement.style.setProperty('--primary-light-val', lightColor);
    document.documentElement.style.setProperty('--primary-dark-val', darkColor);

    if (!firestore) return;

    // Subscribe to real-time updates
    const themeRef = doc(firestore, 'appConfig', 'theme');
    const unsubscribe = onSnapshot(themeRef, (docSnap) => {
      let newLightColor = DEFAULT_COLOR_LIGHT;
      let newDarkColor = DEFAULT_COLOR_DARK;

      if (docSnap.exists()) {
        const data = docSnap.data() as ThemeConfig;
        newLightColor = data.primaryColor || DEFAULT_COLOR_LIGHT;
        newDarkColor = data.primaryColorDark || newLightColor; // Fallback to light color if dark not set
      }

      // Update CSS variables and localStorage
      document.documentElement.style.setProperty('--primary-light-val', newLightColor);
      document.documentElement.style.setProperty('--primary-dark-val', newDarkColor);
      window.localStorage.setItem(THEME_LIGHT_KEY, JSON.stringify(newLightColor));
      window.localStorage.setItem(THEME_DARK_KEY, JSON.stringify(newDarkColor));
    }, (error) => {
      console.error("ThemeManager snapshot error: ", error);
    });

    return () => unsubscribe();
  }, [firestore]);

  // This effect updates the meta tag when the theme changes
  useEffect(() => {
      if (typeof window === 'undefined') return;

      const style = window.getComputedStyle(document.documentElement);
      // We read the --primary variable which is correctly set by CSS for light/dark mode
      const primaryColorValue = style.getPropertyValue('--primary');
      
      if(primaryColorValue) {
        updateThemeColorMeta(primaryColorValue);
      }
      
  }, [resolvedTheme]);


  return null;
}

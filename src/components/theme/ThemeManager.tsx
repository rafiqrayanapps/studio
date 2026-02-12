'use client';

import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import type { ThemeConfig } from '@/lib/definitions';

const THEME_COLOR_KEY = 'primaryColor';
const DEFAULT_COLOR = '350 72% 51%';

/**
 * Updates the theme-color meta tag in the document head.
 * @param color - The HSL color string (e.g., '350 72% 51%').
 */
function updateThemeColorMeta(color: string) {
  if (typeof window === 'undefined') return;

  const fullHslColor = `hsl(${color})`;
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');

  if (metaThemeColor) {
    // If the meta tag exists, update its content.
    metaThemeColor.setAttribute('content', fullHslColor);
  } else {
    // If it doesn't exist, create it and append to the head.
    metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    metaThemeColor.content = fullHslColor;
    document.getElementsByTagName('head')[0].appendChild(metaThemeColor);
  }
}


export default function ThemeManager() {
  const firestore = useFirestore();

  useEffect(() => {
    let initialColor = DEFAULT_COLOR;
    // On first client load, try to get color from localStorage for immediate application.
    try {
      const storedColor = typeof window !== 'undefined' ? window.localStorage.getItem(THEME_COLOR_KEY) : null;
      if (storedColor) {
          initialColor = JSON.parse(storedColor);
      }
    } catch (e) {
      console.error("Failed to parse theme color from localStorage, reverting to default.", e);
      // If parsing fails, remove the invalid item from localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(THEME_COLOR_KEY);
      }
    }

    document.documentElement.style.setProperty('--primary', initialColor);
    updateThemeColorMeta(initialColor); // Update meta tag on initial load


    if (!firestore) return;

    const themeRef = doc(firestore, 'appConfig', 'theme');
    
    // Subscribe to real-time updates for the theme document.
    const unsubscribe = onSnapshot(themeRef, (docSnap) => {
      let newColor = DEFAULT_COLOR;
      if (docSnap.exists()) {
        const data = docSnap.data() as ThemeConfig;
        if (data.primaryColor) {
          newColor = data.primaryColor;
        }
      }
      // Update CSS variable and localStorage
      document.documentElement.style.setProperty('--primary', newColor);
      updateThemeColorMeta(newColor); // Update meta tag on change
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_COLOR_KEY, JSON.stringify(newColor));
      }

    }, (error) => {
        console.error("ThemeManager snapshot error: ", error);
        // In case of error, revert to default and clear storage
        const defaultColor = DEFAULT_COLOR;
        document.documentElement.style.setProperty('--primary', defaultColor);
        updateThemeColorMeta(defaultColor); // Revert meta tag
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(THEME_COLOR_KEY, JSON.stringify(defaultColor));
        }
    });

    // Cleanup the subscription when the component unmounts.
    return () => unsubscribe();
  }, [firestore]); // The effect re-runs if the firestore instance changes.

  return null; // This component does not render anything visible.
}

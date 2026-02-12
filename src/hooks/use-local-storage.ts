'use client';
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Effect to read from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(error);
    }
    // Signal that initialization from localStorage is complete
    setIsInitialized(true);
    // We only want this to run once on mount for a given key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Effect to write to localStorage whenever storedValue changes,
  // but only after the initial read from localStorage is complete.
  useEffect(() => {
    if (isInitialized) {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error(error);
      }
    }
  }, [key, storedValue, isInitialized]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;

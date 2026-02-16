'use client';
import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';

// The return type is compatible with React's `useState` dispatcher.
function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  // Initialize state from localStorage synchronously or with the initial value.
  const [storedValue, setStoredValue] = useState<T>(() => {
    // This check is important because this code can run on the server during SSR.
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  // This custom setter updates the state and synchronously writes to localStorage.
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      try {
        // The value can be a new value or a function to compute the new value.
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        // Update React state.
        setStoredValue(valueToStore);
        // Synchronously update localStorage.
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key, storedValue]
  );

  // This effect listens for changes from other tabs.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.storageArea === window.localStorage && e.key === key) {
            try {
                if (e.newValue) {
                    setStoredValue(JSON.parse(e.newValue));
                } else {
                    // When item is removed from another tab.
                    setStoredValue(initialValue);
                }
            } catch (error) {
                 console.error(`Error parsing storage change for key “${key}”:`, error);
            }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);


  return [storedValue, setValue];
}

export default useLocalStorage;

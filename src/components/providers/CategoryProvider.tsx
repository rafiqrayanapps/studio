'use client';

import React, { createContext, useContext, useMemo, ReactNode, useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import { collection, query, onSnapshot, limit, orderBy } from 'firebase/firestore';
import type { Category as CategoryType, ContentItem } from '@/lib/definitions';

interface CategoryContextType {
  allCategories: WithId<CategoryType>[] | null;
  mainCategories: WithId<CategoryType>[];
  subCategories: Map<string, WithId<CategoryType>[]>;
  categoryMap: Map<string, WithId<CategoryType>>;
  isLoadingCategories: boolean;
  isBackgroundLoading: boolean;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

  // 1. Fetch All Categories
  const categoriesQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      return query(collection(firestore, 'categories'));
    },
    [firestore]
  );
  const { data: rawCategories, isLoading: isLoadingCategories } = useCollection<CategoryType>(categoriesQuery);

  // 2. Process Categories into Maps and Lists
  const { allCategories, mainCategories, subCategories, categoryMap } = useMemo(() => {
    if (!rawCategories) return { allCategories: null, mainCategories: [], subCategories: new Map(), categoryMap: new Map() };
    
    const sortedCategories = [...rawCategories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    
    const main: WithId<CategoryType>[] = [];
    const sub = new Map<string, WithId<CategoryType>[]>();
    const catMap = new Map<string, WithId<CategoryType>>();

    sortedCategories.forEach(cat => {
        catMap.set(cat.id, cat);
        if (cat.parentId) {
            if (!sub.has(cat.parentId)) sub.set(cat.parentId, []);
            sub.get(cat.parentId)!.push(cat);
        } else {
            main.push(cat);
        }
    });

    return { allCategories: sortedCategories, mainCategories: main, subCategories: sub, categoryMap: catMap };
  }, [rawCategories]);

  // 3. Background Pre-fetching Logic (Warm up the cache)
  useEffect(() => {
    if (!firestore || !mainCategories.length) return;

    // We only want to pre-fetch items for the main categories to avoid heavy network usage
    // This populates the Firestore local IndexedDB cache
    setIsBackgroundLoading(true);
    
    const unsubscribers: (() => void)[] = [];

    // Limit pre-fetching to top 10 categories to balance speed and resource usage
    const categoriesToPreload = mainCategories.slice(0, 10);

    categoriesToPreload.forEach(cat => {
      const q = query(
        collection(firestore, 'categories', cat.id, 'items'),
        orderBy('order', 'asc'),
        limit(20) // Load first 20 items of each category in background
      );

      // We start a listener and immediately detach or keep it for a short time
      // to ensure Firestore populates the local persistence layer.
      const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        // Data is now in cache. 
        // We don't need to do anything with the result here, 
        // Firestore's persistence layer handles the storage.
      }, (error) => {
        console.warn(`Background pre-fetch failed for category ${cat.name}:`, error);
      });

      unsubscribers.push(unsub);
    });

    // Cleanup listeners after 30 seconds - by then, data should be in cache
    // and we don't want too many active listeners in the background forever.
    const timer = setTimeout(() => {
      unsubscribers.forEach(unsub => unsub());
      setIsBackgroundLoading(false);
    }, 30000);

    return () => {
      clearTimeout(timer);
      unsubscribers.forEach(unsub => unsub());
    };
  }, [firestore, mainCategories]);

  const value = {
    allCategories,
    mainCategories,
    subCategories,
    categoryMap,
    isLoadingCategories,
    isBackgroundLoading,
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
}

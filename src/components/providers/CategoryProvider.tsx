'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Category as CategoryType } from '@/lib/definitions';

interface CategoryContextType {
  allCategories: WithId<CategoryType>[] | null;
  mainCategories: WithId<CategoryType>[];
  subCategories: Map<string, WithId<CategoryType>[]>;
  categoryMap: Map<string, WithId<CategoryType>>;
  isLoadingCategories: boolean;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();

  const categoriesQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      return query(collection(firestore, 'categories'), orderBy('order', 'asc'));
    },
    [firestore]
  );
  const { data: allCategories, isLoading: isLoadingCategories } = useCollection<CategoryType>(categoriesQuery);

  const { mainCategories, subCategories, categoryMap } = useMemo(() => {
    if (!allCategories) return { mainCategories: [], subCategories: new Map(), categoryMap: new Map() };
    
    const main: WithId<CategoryType>[] = [];
    const sub = new Map<string, WithId<CategoryType>[]>();
    const catMap = new Map<string, WithId<CategoryType>>();

    allCategories.forEach(cat => {
        catMap.set(cat.id, cat);
        if (cat.parentId) {
            if (!sub.has(cat.parentId)) sub.set(cat.parentId, []);
            sub.get(cat.parentId)!.push(cat);
        } else {
            main.push(cat);
        }
    });

    return { mainCategories: main, subCategories: sub, categoryMap: catMap };
  }, [allCategories]);

  const value = {
    allCategories,
    mainCategories,
    subCategories,
    categoryMap,
    isLoadingCategories,
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

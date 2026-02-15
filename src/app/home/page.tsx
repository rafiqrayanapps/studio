'use client';
import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useFirestore, useCollection, useMemoFirebase, WithId } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Category as CategoryType } from '@/lib/definitions';
import { Input } from '@/components/ui/input';
import { Search, Crown } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import SubscriptionDialog from '@/components/dialogs/SubscriptionDialog';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import useLocalStorage from '@/hooks/use-local-storage';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import UpgradeProDialog from '@/components/dialogs/UpgradeProDialog';

export default function HomePage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const { isPro, isAdmin, isLoading: isUserLoading } = useUserProfile();
  const router = useRouter();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // 1. Read from localStorage cache first.
  const [cachedCategories, setCachedCategories] = useLocalStorage<WithId<CategoryType>[]>('allCategoriesCache', []);

  // 2. This state holds the data being displayed. It's initialized with cached data for an instant UI.
  const [displayCategories, setDisplayCategories] = useState<WithId<CategoryType>[]>(cachedCategories);

  // 3. In the background, fetch live data from Firestore.
  const categoriesQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      // Fetch all categories for all users, ordered by 'order'.
      // Security rules now allow this. The UI will handle locking.
      return query(collection(firestore, 'categories'), orderBy('order', 'asc'));
    },
    [firestore]
  );
  const { data: liveCategories, isLoading: isLoadingLive } = useCollection<CategoryType>(categoriesQuery);

  // 4. When live data arrives, update the display and save the new data to the cache.
  useEffect(() => {
    if (liveCategories) {
      setDisplayCategories(liveCategories);
      setCachedCategories(liveCategories);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCategories, setCachedCategories]); // setCachedCategories is stable

  // Filter for main categories from the current display data (cached or live)
  const mainCategories = useMemo(() => {
    // The query is now always ordered, so we don't need to sort on the client.
    const all = [...(displayCategories || [])]; 
    const main = all.filter(cat => !cat.parentId);
    
    // Then filter by search term.
    if (!searchTerm) return main;
    return main.filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [displayCategories, searchTerm]);

  const handleCategoryClick = (category: WithId<CategoryType>) => {
    const isLocked = category.visibility === 'pro' && !isPro && !isAdmin;
    if (isLocked) {
      setShowUpgradeDialog(true);
    } else {
      router.push(`/categories/${category.id}`);
    }
  };

  // Show skeleton only on the very first load when there's no cache and we are waiting for Firestore.
  const isLoading = (isLoadingLive && cachedCategories.length === 0) || isUserLoading;

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <div className="sticky top-0 z-20">
          <Header title="رفيق المصمم" />
          <div className="relative z-10 -mt-10">
              <div className="pb-4 px-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="ابحث عن القسم..." className="h-14 w-full rounded-2xl border-none bg-card pl-12 pr-4 text-lg shadow-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>
      </div>
      
      <main className="flex-1 px-6 pb-24 pt-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <CategorySkeleton key={i} className="aspect-square" />)}
          </div>
        ) : (
          <>
            <p className="text-muted-foreground text-sm mb-4">{mainCategories.length} قسم</p>
            <div className="grid grid-cols-2 gap-4">
              {mainCategories.map((cat, index) => (
                <div
                  key={cat.id}
                  className="opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleCategoryClick(cat)}
                >
                  <div className="relative bg-primary text-primary-foreground p-4 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-sm aspect-square text-center">
                    {cat.visibility === 'pro' && <Crown className="absolute top-2 left-2 h-5 w-5 text-yellow-300" />}
                    {cat.fileTypes && <div className="absolute top-2.5 right-2.5 bg-black/20 text-xs font-semibold px-2 py-0.5 rounded-full text-white">{cat.fileTypes}</div>}
                    <p className="font-bold text-lg">{cat.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <BottomNav />
      <SubscriptionDialog />
      <UpgradeProDialog isOpen={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
    </div>
  );
}

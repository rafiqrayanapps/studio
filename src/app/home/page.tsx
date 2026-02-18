'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import Header from '@/components/layout/Header';
import { WithId } from '@/firebase';
import type { Category as CategoryType, ReferralConfig, UserProfile } from '@/lib/definitions';
import { Input } from '@/components/ui/input';
import { Search, Crown, Loader2 } from 'lucide-react';
import SubscriptionDialog from '@/components/dialogs/SubscriptionDialog';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter, useSearchParams } from 'next/navigation';
import UpgradeProDialog from '@/components/dialogs/UpgradeProDialog';
import { useCategories } from '@/components/providers/CategoryProvider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, query, collection, where, getDocs, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

function HomeContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const { isPro, isAdmin, user, userProfile, isLoading: isUserLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const { mainCategories: allMainCategories, isLoadingCategories } = useCategories();

  // Capturing referral code from URL if present
  useEffect(() => {
      const refFromUrl = searchParams.get('ref');
      if (refFromUrl && !userProfile?.referredBy) {
          // The code is handled when the user opens the ReferralDialog or registers
          // For now, we can just toast a welcome message
          toast({
              title: "أهلاً بك!",
              description: "لقد وصلت عبر رابط دعوة. اضغط على عداد النقاط لتفعيل المكافأة."
          });
      }
  }, [searchParams, userProfile, toast]);

  const mainCategories = useMemo(() => {
    if (!allMainCategories) return [];
    if (!searchTerm) return allMainCategories;
    return allMainCategories.filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allMainCategories, searchTerm]);

  const handleCategoryClick = (category: WithId<CategoryType>) => {
    const isLocked = category.visibility === 'pro' && !isPro && !isAdmin;
    if (isLocked) {
      setShowUpgradeDialog(true);
    } else {
      router.push(`/categories/${category.id}`);
    }
  };

  const isLoading = isLoadingCategories || isUserLoading;

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
      
      <main className="flex-1 px-6 pb-24 pt-4 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <CategorySkeleton key={i} className="aspect-square" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">{mainCategories.length} قسم</p>
            <div className="grid grid-cols-2 gap-4">
              {mainCategories.map((cat) => {
                const isLocked = cat.visibility === 'pro' && !isPro && !isAdmin;
                return (
                <div key={cat.id} onClick={() => handleCategoryClick(cat)}>
                  <div className="relative bg-primary text-primary-foreground p-4 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-primary/90 transition-all shadow-sm aspect-square text-center active:scale-95">
                    {isLocked && <Crown className="absolute top-3 left-3 h-5 w-5 text-yellow-300" />}
                    {cat.fileTypes && <div className="absolute top-3.5 right-3.5 bg-black/20 text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase">{cat.fileTypes}</div>}
                    <p className="font-bold text-lg">{cat.name}</p>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}
      </main>
      <SubscriptionDialog />
      <UpgradeProDialog isOpen={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
    </div>
  );
}

export default function HomePage() {
    return (
        <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
            <HomeContent />
        </Suspense>
    )
}

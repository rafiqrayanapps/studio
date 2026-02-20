'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import Header from '@/components/layout/Header';
import { WithId } from '@/firebase';
import type { Category as CategoryType, ReferralConfig, UserProfile } from '@/lib/definitions';
import { Input } from '@/components/ui/input';
import { Search, Crown, Loader2, Sparkles, Hammer } from 'lucide-react';
import SubscriptionDialog from '@/components/dialogs/SubscriptionDialog';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter, useSearchParams } from 'next/navigation';
import UpgradeProDialog from '@/components/dialogs/UpgradeProDialog';
import { useCategories } from '@/components/providers/CategoryProvider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function HomeContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const { isPro, isAdmin, userProfile, isLoading: isUserLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const { mainCategories: allMainCategories, isLoadingCategories } = useCategories();

  // Handling direct referral from URL
  useEffect(() => {
      const refFromUrl = searchParams.get('ref');
      if (refFromUrl && !userProfile?.referredBy) {
          toast({
              title: "أهلاً بك في رفيق المصمم!",
              description: "لقد وصلت عبر رابط دعوة. اضغط على عداد النقاط في الأعلى لتفعيل مكافأتك.",
              duration: 6000,
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
          <Header title="رفيق المصمم" showPoints={true} />
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
            <div className="flex justify-between items-center px-1">
                <p className="text-muted-foreground text-sm font-medium">{mainCategories.length} قسم متوفر</p>
                {isPro && <div className="flex items-center gap-1 text-xs text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded-full border border-yellow-100">
                    <Sparkles className="h-3 w-3" />
                    عضوية برو نشطة
                </div>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {mainCategories.map((cat) => {
                const isLocked = cat.visibility === 'pro' && !isPro && !isAdmin;
                const isUnderMaintenance = cat.isUnderMaintenance;

                return (
                <div key={cat.id} onClick={() => handleCategoryClick(cat)}>
                  <div className={cn(
                      "relative bg-primary text-primary-foreground p-4 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-primary/90 transition-all shadow-sm aspect-square text-center active:scale-95 group overflow-hidden",
                      isUnderMaintenance && "grayscale-[0.5] opacity-90"
                  )}>
                    {/* Background Decorative Element */}
                    <div className="absolute -bottom-4 -right-4 bg-white/10 w-16 h-16 rounded-full group-hover:scale-150 transition-transform duration-500" />
                    
                    {isLocked && <Crown className="absolute top-3 left-3 h-5 w-5 text-yellow-300 drop-shadow-md z-20" />}
                    
                    {isUnderMaintenance && (
                        <div className="absolute top-3 right-3 bg-yellow-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 z-20 shadow-md">
                            <Hammer className="h-2 w-2" /> صيانة
                        </div>
                    )}

                    {cat.fileTypes && !isUnderMaintenance && (
                        <div className="absolute top-3.5 right-3.5 bg-black/20 text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase backdrop-blur-sm z-20">
                            {cat.fileTypes}
                        </div>
                    )}

                    <p className="font-bold text-lg relative z-10 leading-snug">{cat.name}</p>
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

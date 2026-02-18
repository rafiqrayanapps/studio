'use client';
import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { WithId } from '@/firebase';
import type { Category as CategoryType, ReferralConfig, UserProfile } from '@/lib/definitions';
import { Input } from '@/components/ui/input';
import { Search, Crown, Gift, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import SubscriptionDialog from '@/components/dialogs/SubscriptionDialog';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import UpgradeProDialog from '@/components/dialogs/UpgradeProDialog';
import { useCategories } from '@/components/providers/CategoryProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, query, collection, where, getDocs, writeBatch, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getDeviceFingerprint } from '@/lib/fingerprint';

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { isPro, isAdmin, user, userProfile, isLoading: isUserLoading } = useUserProfile();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  const { mainCategories: allMainCategories, isLoadingCategories } = useCategories();

  const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: refConfig } = useDoc<ReferralConfig>(referralConfigRef);

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

  const handleRedeemReferral = async () => {
      if (!firestore || !user || !referralCode) return;
      setIsSubmittingReferral(true);
      
      try {
          const fingerprint = await getDeviceFingerprint();
          
          // 1. Anti-fraud check
          const usedInvRef = doc(firestore, 'used_invitations', fingerprint);
          const usedInvSnap = await getDoc(usedInvRef);
          if (usedInvSnap.exists()) {
              throw new Error("عذراً، هذا الجهاز استخدم كود دعوة مسبقاً.");
          }

          // 2. Find referrer
          const refQuery = query(collection(firestore, 'users'), where("referralCode", "==", referralCode.toUpperCase()));
          const refSnap = await getDocs(refQuery);
          if (refSnap.empty) {
              throw new Error("كود الدعوة غير صحيح.");
          }

          const referrerDoc = refSnap.docs[0];
          const referrerData = referrerDoc.data() as UserProfile;
          
          if (referrerDoc.id === user.uid || referrerData.referralCode === userProfile?.referralCode) {
              throw new Error("لا يمكنك استخدام كود الدعوة الخاص بك.");
          }

          const pointsToAdd = refConfig?.pointsPerReferral || 10;
          const requiredForPro = refConfig?.requiredReferrals || 5;

          const batch = writeBatch(firestore);
          
          // Reward Inviter
          const newReferralCount = (referrerData.referralCount || 0) + 1;
          const inviterUpdates: any = {
              referralCount: increment(1),
              points: increment(pointsToAdd)
          };
          if (newReferralCount >= requiredForPro && referrerData.subscriptionTier !== 'pro') {
              inviterUpdates.subscriptionTier = 'pro';
          }
          batch.update(referrerDoc.ref, inviterUpdates);

          // Reward Invitee (Current User)
          batch.update(doc(firestore, 'users', user.uid), {
              referredBy: referrerDoc.id,
              points: increment(pointsToAdd) // Reward the new user too for joining
          });

          // Register Fingerprint
          batch.set(usedInvRef, {
              userId: user.uid,
              referrerId: referrerDoc.id,
              timestamp: serverTimestamp()
          });

          await batch.commit();
          toast({ title: "تم تفعيل الكود بنجاح! حصلت على نقاط مكافأة." });
          setReferralCode('');
      } catch (e: any) {
          toast({ variant: "destructive", title: "خطأ في الكود", description: e.message });
      } finally {
          setIsSubmittingReferral(false);
      }
  };

  const isLoading = isLoadingCategories || isUserLoading;
  const canShowReferralEntry = userProfile && !userProfile.referredBy && !isAdmin;

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
        {/* Referral Entry for Guests */}
        {canShowReferralEntry && (
            <Card className="border-2 border-primary/20 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-primary/5 p-4 flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground p-2 rounded-xl">
                        <Gift className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base">هل لديك كود دعوة؟</CardTitle>
                        <CardDescription className="text-[10px]">استخدم كود صديقك للحصول على {refConfig?.pointsPerReferral || 10} نقاط فورية!</CardDescription>
                    </div>
                </div>
                <CardContent className="p-4 pt-0">
                    <div className="flex gap-2 mt-3">
                        <Input 
                            placeholder="أدخل الكود هنا" 
                            className="bg-muted border-none h-11 text-center font-mono font-bold tracking-widest uppercase"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value)}
                            disabled={isSubmittingReferral}
                        />
                        <Button 
                            className="h-11 px-6" 
                            onClick={handleRedeemReferral}
                            disabled={isSubmittingReferral || !referralCode}
                        >
                            {isSubmittingReferral ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تفعيل'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}

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
                  <div className="relative bg-primary text-primary-foreground p-4 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-sm aspect-square text-center">
                    {isLocked && <Crown className="absolute top-2 left-2 h-5 w-5 text-yellow-300" />}
                    {cat.fileTypes && <div className="absolute top-2.5 right-2.5 bg-black/20 text-xs font-semibold px-2 py-0.5 rounded-full text-white">{cat.fileTypes}</div>}
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
'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import Header from '@/components/layout/Header';
import { WithId } from '@/firebase';
import type { Category as CategoryType, ReferralConfig, UserProfile } from '@/lib/definitions';
import { Input } from '@/components/ui/input';
import { Search, Crown, Gift, Loader2, Share2, Copy } from 'lucide-react';
import SubscriptionDialog from '@/components/dialogs/SubscriptionDialog';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter, useSearchParams } from 'next/navigation';
import UpgradeProDialog from '@/components/dialogs/UpgradeProDialog';
import { useCategories } from '@/components/providers/CategoryProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, query, collection, where, getDocs, writeBatch, serverTimestamp, increment, getDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getDeviceFingerprint } from '@/lib/fingerprint';

function HomeContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const { isPro, isAdmin, user, userProfile, isLoading: isUserLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  const { mainCategories: allMainCategories, isLoadingCategories } = useCategories();

  const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: refConfig } = useDoc<ReferralConfig>(referralConfigRef);

  // Auto-fill referral from URL
  useEffect(() => {
      const refFromUrl = searchParams.get('ref');
      if (refFromUrl && !userProfile?.referredBy) {
          setReferralCode(refFromUrl.toUpperCase());
      }
  }, [searchParams, userProfile]);

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

  const copyReferralLink = () => {
      if (!userProfile?.referralCode) return;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const referralLink = `${baseUrl}/home?ref=${userProfile.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      toast({
          title: "تم نسخ رابط الإحالة!",
          description: "شارك هذا الرابط مع أصدقائك لتربح نقاطاً ومميزات برو."
      });
  };

  const handleRedeemReferral = async () => {
      if (!firestore || !user || !referralCode) return;
      setIsSubmittingReferral(true);
      
      try {
          const fingerprint = await getDeviceFingerprint();
          
          // 1. Anti-fraud check: Device can only use referral once
          const usedInvRef = doc(firestore, 'used_invitations', fingerprint);
          const usedInvSnap = await getDoc(usedInvRef);
          if (usedInvSnap.exists()) {
              throw new Error("عذراً، هذا الجهاز استخدم كود دعوة مسبقاً ولا يمكنه الاستفادة من كود آخر.");
          }

          // 2. Find referrer by their unique code
          const refQuery = query(collection(firestore, 'users'), where("referralCode", "==", referralCode.trim().toUpperCase()));
          const refSnap = await getDocs(refQuery);
          if (refSnap.empty) {
              throw new Error("كود الدعوة المدخل غير صحيح.");
          }

          const referrerDoc = refSnap.docs[0];
          const referrerData = referrerDoc.data() as UserProfile;
          
          // Self-referral prevention
          if (referrerDoc.id === user.uid || referrerData.email.toLowerCase() === user.email?.toLowerCase()) {
              throw new Error("لا يمكنك استخدام كود الدعوة الخاص بك.");
          }

          const pointsToAdd = refConfig?.pointsPerReferral || 10;
          const requiredForPro = refConfig?.requiredReferrals || 5;
          const rewardInterval = refConfig?.rewardInterval || 5;

          const batch = writeBatch(firestore);
          
          // 3. Process Referrer Rewards
          const newReferralCount = (referrerData.referralCount || 0) + 1;
          const inviterUpdates: any = {
              referralCount: increment(1),
              points: increment(pointsToAdd)
          };

          // Auto-upgrade to Pro if threshold reached
          if (newReferralCount >= requiredForPro && referrerData.subscriptionTier !== 'pro') {
              inviterUpdates.subscriptionTier = 'pro';
          }

          // Accumulative Bonus: Extra codes for every interval
          if (newReferralCount % rewardInterval === 0) {
              const extraCode = `PRO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
              inviterUpdates.unlockedProCodes = arrayUnion(extraCode);
          }

          batch.update(referrerDoc.ref, inviterUpdates);

          // 4. Reward Invitee (Current User)
          batch.update(doc(firestore, 'users', user.uid), {
              referredBy: referrerDoc.id,
              points: increment(pointsToAdd) // Reward the new user too for joining
          });

          // 5. Register Fingerprint to prevent abuse
          batch.set(usedInvRef, {
              userId: user.uid,
              referrerId: referrerDoc.id,
              timestamp: serverTimestamp()
          });

          await batch.commit();
          toast({ title: "تم تفعيل الكود بنجاح!", description: `حصلت أنت وصديقك على ${pointsToAdd} نقطة مكافأة.` });
          setReferralCode('');
      } catch (e: any) {
          toast({ variant: "destructive", title: "فشل تفعيل الكود", description: e.message });
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
        {/* Visitor Referral Link Card */}
        {userProfile?.referralCode && (
            <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all duration-500" />
                <div className="p-5 relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                            <Share2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">شارك موقعنا واربح مميزات برو!</CardTitle>
                            <CardDescription className="text-white/70 text-xs">كلما زادت الإحالات، زادت فرصتك لتصبح "برو" مجاناً.</CardDescription>
                        </div>
                    </div>
                    
                    <div className="bg-black/10 p-3 rounded-xl flex items-center justify-between gap-3 border border-white/10">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">رابط الإحالة الخاص بك:</p>
                            <p className="text-sm font-mono truncate opacity-90">{typeof window !== 'undefined' ? `${window.location.origin}/?ref=${userProfile.referralCode}` : '...'}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="shrink-0 hover:bg-white/20 rounded-lg h-10 w-10" onClick={copyReferralLink}>
                            <Copy className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </Card>
        )}

        {/* Referral Entry for Guests / Users who haven't used one */}
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

export default function HomePage() {
    return (
        <Suspense fallback={<div className="p-8"><Loader2 className="animate-spin mx-auto" /></div>}>
            <HomeContent />
        </Suspense>
    )
}

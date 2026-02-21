'use client';

import { useState, useEffect, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Gift, Share2, Copy, Loader2, Info, CheckCircle2, Crown, Zap, AlertCircle, LogIn, PlayCircle, ExternalLink } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, query, collection, where, getDocs, writeBatch, serverTimestamp, increment, getDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getDeviceFingerprint } from '@/lib/fingerprint';
import type { ReferralConfig, UserProfile } from '@/lib/definitions';
import { useSearchParams, useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnityAds } from '@/components/ads/UnityAdsProvider';

function ReferralDialogContent() {
    const { points, user, userProfile, isAdmin, isPro, isLoading } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showRewarded, config: adsConfig } = useUnityAds();
    
    const [referralCodeInput, setReferralCodeInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isWatchingAd, setIsWatchingAd] = useState(false);

    const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
    const { data: refConfig } = useDoc<ReferralConfig>(referralConfigRef);

    useEffect(() => {
        if (isOpen && !user?.isAnonymous) {
            const refFromUrl = searchParams.get('ref');
            if (refFromUrl && !userProfile?.referredBy) {
                setReferralCodeInput(refFromUrl.toUpperCase());
            }
        }
    }, [isOpen, searchParams, userProfile, user]);

    const copyToClipboard = (text: string, title: string) => {
        if (!text) return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            toast({ title });
        }
    };

    const handleWatchAd = () => {
        if (!user || user.isAnonymous) {
            toast({ title: "تنبيه", description: "يجب تسجيل الدخول لجمع النقاط عبر الإعلانات." });
            return;
        }
        
        setIsWatchingAd(true);
        showRewarded(async () => {
            // Success Callback
            try {
                await updateDocumentNonBlocking(doc(firestore!, 'users', user.uid), {
                    points: increment(1)
                });
                toast({ title: "مبروك! 🎉", description: "حصلت على نقطة واحدة لدعمك لنا." });
            } catch (e) {
                console.error("Ad point increment failed:", e);
            } finally {
                setIsWatchingAd(false);
            }
        });
    };

    const handleRedeemReferral = async () => {
        if (!firestore || !user || !referralCodeInput) return;
        
        if (userProfile?.referredBy) {
            toast({ variant: "destructive", title: "تنبيه", description: "لقد استخدمت كوداً سابقاً مسبقاً." });
            return;
        }

        setIsSubmitting(true);
        
        try {
            const fingerprint = await getDeviceFingerprint();
            const usedInvRef = doc(firestore, 'used_invitations', fingerprint);
            const usedInvSnap = await getDoc(usedInvRef);
            
            if (usedInvSnap.exists()) {
                throw new Error("عذراً، هذا الجهاز استخدم كود دعوة مسبقاً.");
            }

            const codeToFind = referralCodeInput.trim().toUpperCase();
            const refQuery = query(collection(firestore, 'users'), where("referralCode", "==", codeToFind));
            const refSnap = await getDocs(refQuery);
            
            if (refSnap.empty) {
                throw new Error("كود الدعوة المدخل غير صحيح.");
            }

            const referrerDoc = refSnap.docs[0];
            const referrerData = referrerDoc.data() as UserProfile;
            
            if (referrerDoc.id === user.uid) {
                throw new Error("لا يمكنك استخدام كود الدعوة الخاص بك.");
            }

            const pointsToAdd = refConfig?.pointsPerReferral || 50;
            const batch = writeBatch(firestore);
            
            batch.update(referrerDoc.ref, {
                referralCount: increment(1),
                points: increment(pointsToAdd)
            });

            batch.update(doc(firestore, 'users', user.uid), {
                referredBy: referrerDoc.id,
                points: increment(pointsToAdd)
            });

            batch.set(usedInvRef, {
                userId: user.uid,
                referrerId: referrerDoc.id,
                timestamp: serverTimestamp()
            });

            await batch.commit();
            toast({ title: "تم تفعيل الكود بنجاح!", description: `حصلت أنت وصديقك على ${pointsToAdd} نقطة.` });
            setIsOpen(false);
        } catch (e: any) {
            toast({ variant: "destructive", title: "خطأ", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpgradeToPro = async () => {
        if (!firestore || !user || !userProfile || isPro) return;
        const threshold = refConfig?.pointsForProUpgrade || 500;
        
        if (userProfile.points < threshold) {
            toast({ variant: "destructive", title: "نقاط غير كافية", description: `تحتاج إلى ${threshold} نقطة للترقية.` });
            return;
        }

        setIsSubmitting(true);
        try {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid), {
                subscriptionTier: 'pro',
                points: increment(-threshold)
            });
            toast({ title: "تهانينا! 🎉", description: "لقد أصبحت عضواً برو الآن." });
            setIsOpen(false);
        } catch (e) {
            toast({ variant: "destructive", title: "خطأ في الترقية" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateActivationCode = async () => {
        if (!firestore || !user || !userProfile || !isPro) return;
        const cost = refConfig?.pointsToGenerateCode || 200;

        if (userProfile.points < cost) {
            toast({ variant: "destructive", title: "نقاط غير كافية", description: `تحتاج إلى ${cost} نقطة لتوليد كود.` });
            return;
        }

        setIsGenerating(true);
        try {
            const newCode = `PRO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const batch = writeBatch(firestore);
            
            // Deduct points
            batch.update(doc(firestore, 'users', user.uid), {
                points: increment(-cost),
                unlockedProCodes: arrayUnion(newCode)
            });

            // Add to whitelist
            const whitelistRef = doc(firestore, 'whitelist', `GIFT-${newCode}@designer.companion`);
            batch.set(whitelistRef, {
                email: `GIFT-${newCode}@designer.companion`,
                role: 'pro',
                activationCode: newCode,
                isActivated: false,
                createdAt: serverTimestamp()
            });

            await batch.commit();
            toast({ title: "تم إنشاء الكود!", description: `الكود الجديد: ${newCode}` });
        } catch (e) {
            toast({ variant: "destructive", title: "فشل إنشاء الكود" });
        } finally {
            setIsGenerating(false);
        }
    };

    const isGuest = !user || user.isAnonymous;

    if (isGuest) {
        return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <button className="flex items-center gap-1.5 bg-primary-foreground/10 px-3 py-1.5 rounded-full border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all active:scale-95 group">
                        <span className="font-bold text-sm leading-none">0</span>
                        <Coins className="h-4 w-4 text-yellow-400 group-hover:rotate-12 transition-transform" />
                    </button>
                </DialogTrigger>
                <DialogContent className="max-w-[92vw] sm:max-w-sm rounded-[2.5rem] p-8 border-none shadow-2xl text-center space-y-6" dir="rtl">
                    <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2rem] mx-auto flex items-center justify-center">
                        <Zap className="w-10 h-10 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <DialogTitle className="text-2xl font-black">ميزة النقاط</DialogTitle>
                        <DialogDescription className="text-sm font-medium leading-relaxed">
                            عليك تسجيل الدخول لاستخدام ميزة النقاط والاستفادة من الجوائز والاشتراكات المجانية.
                        </DialogDescription>
                    </div>
                    <Button className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20" onClick={() => { setIsOpen(false); router.push('/login'); }}>
                        <LogIn className="ml-2 h-5 w-5" /> تسجيل الدخول الآن
                    </Button>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 bg-primary-foreground/10 px-3 py-1.5 rounded-full border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all active:scale-95 group">
                    <span className="font-bold text-sm leading-none">{points}</span>
                    <Coins className="h-4 w-4 text-yellow-400 group-hover:rotate-12 transition-transform" />
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-[92vw] sm:max-w-sm rounded-[2.5rem] gap-0 p-0 overflow-hidden shadow-2xl border-none" dir="rtl">
                <ScrollArea className="max-h-[85vh] w-full">
                    <div className="p-6 space-y-6">
                        <DialogHeader className="space-y-3">
                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-[1.5rem] mx-auto flex items-center justify-center shadow-inner">
                                <Coins className="w-8 h-8" />
                            </div>
                            <div className="text-center space-y-1">
                                <DialogTitle className="text-xl font-black text-foreground">محفظة المكافآت</DialogTitle>
                                <DialogDescription className="text-xs font-medium text-muted-foreground">
                                    رصيدك الحالي: <strong className="text-primary text-lg">{points} نقطة</strong>
                                </DialogDescription>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Rewarded Ad Section */}
                            {(adsConfig?.adsterraEnabled || adsConfig?.manualAdsEnabled) && (
                                <div className="bg-yellow-50 p-5 rounded-[2rem] border border-yellow-200 space-y-3 text-center relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Coins className="h-12 w-12" /></div>
                                    <div className="flex items-center justify-center gap-2 text-yellow-700 text-xs font-black uppercase relative z-10">
                                        <Zap className="h-4 w-4 animate-pulse" />
                                        <span>نقاط مجانية</span>
                                    </div>
                                    <p className="text-[10px] text-yellow-800/70 font-medium relative z-10">ادعمنا بمشاهدة إعلان سريع واحصل على 1 نقطة فورية!</p>
                                    <Button 
                                        className="w-full rounded-2xl h-12 bg-yellow-500 hover:bg-yellow-600 text-white font-black shadow-lg shadow-yellow-200 relative z-10"
                                        onClick={handleWatchAd}
                                        disabled={isWatchingAd}
                                    >
                                        {isWatchingAd ? <Loader2 className="animate-spin ml-2 h-4 w-4" /> : <ExternalLink className="ml-2 h-5 w-5" />}
                                        افتح الإعلان واحصل على نقطة
                                    </Button>
                                </div>
                            )}

                            {/* User's Own Code */}
                            <div className="bg-muted/50 p-5 rounded-[2rem] space-y-3 text-center border-2 border-dashed border-primary/20 relative group">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm">
                                    كودك الخاص
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <div className="flex-1 bg-background rounded-2xl py-3 px-4 font-mono text-2xl font-black tracking-[0.2em] text-primary shadow-sm min-h-[3.5rem] flex items-center justify-center">
                                        {userProfile?.referralCode || "------"}
                                    </div>
                                    <Button size="icon" className="rounded-2xl h-12 w-12 shrink-0 shadow-lg" onClick={() => copyToClipboard(userProfile?.referralCode || '', "تم نسخ الكود!")}>
                                        <Copy className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Actions based on Pro/Basic status */}
                            <div className="bg-primary/5 p-5 rounded-[2rem] border border-primary/10 space-y-4">
                                <div className="flex items-center gap-2.5 text-xs font-black text-primary uppercase">
                                    <Zap className="h-4 w-4" />
                                    <span>تحويل النقاط</span>
                                </div>
                                
                                {!isPro ? (
                                    <div className="space-y-3">
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            عند وصولك لـ <strong>{refConfig?.pointsForProUpgrade || 500} نقطة</strong>، يمكنك تفعيل اشتراك برو مجاناً.
                                        </p>
                                        <Button className="w-full rounded-2xl h-12 text-sm font-black shadow-md" disabled={points < (refConfig?.pointsForProUpgrade || 500) || isSubmitting} onClick={handleUpgradeToPro}>
                                            <Crown className="ml-2 h-4 w-4" /> تحويل النقاط إلى اشتراك
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            بصفتك عضو برو، يمكنك تحويل <strong>{refConfig?.pointsToGenerateCode || 200} نقطة</strong> إلى كود تفعيل لصديق.
                                        </p>
                                        <Button variant="outline" className="w-full rounded-2xl h-12 text-sm font-black border-2" disabled={points < (refConfig?.pointsToGenerateCode || 200) || isGenerating} onClick={handleGenerateActivationCode}>
                                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Gift className="ml-2 h-4 w-4" />}
                                            تحويل النقاط لكود تفعيل
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Redeem Invite Code */}
                            {!userProfile?.referredBy && !isAdmin && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-2 text-xs font-black text-foreground px-1">
                                        <Gift className="h-4 w-4 text-green-500" />
                                        <span>هل لديك كود دعوة من صديق؟</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="أدخل الكود هنا" 
                                            className="rounded-2xl h-12 bg-muted border-none text-center font-mono font-black tracking-widest uppercase text-sm"
                                            value={referralCodeInput}
                                            onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                                            disabled={isSubmitting}
                                        />
                                        <Button className="rounded-2xl h-12 px-6 font-black text-xs shrink-0 shadow-lg" onClick={handleRedeemReferral} disabled={isSubmitting || !referralCodeInput}>
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تفعيل'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {userProfile?.referredBy && (
                                <div className="bg-green-50 p-4 rounded-2xl flex items-center gap-2 text-green-700 text-xs font-black justify-center border border-green-100">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>لقد قمت بتفعيل كود دعوة مسبقاً</span>
                                </div>
                            )}

                            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 flex gap-3 items-start shadow-sm">
                                <Info className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-yellow-800 leading-relaxed font-bold">
                                    يتم استخدام بصمة الجهاز لضمان نزاهة النظام. أي محاولة تلاعب ستؤدي لحظر الحساب نهائياً.
                                </p>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

export default function ReferralDialog() {
    return (
        <Suspense fallback={
            <button className="flex items-center gap-1.5 bg-primary-foreground/10 px-3 py-1.5 rounded-full border border-primary-foreground/20 opacity-50">
                <span className="font-bold text-sm leading-none">...</span>
                <Coins className="h-4 w-4 text-yellow-400" />
            </button>
        }>
            <ReferralDialogContent />
        </Suspense>
    );
}

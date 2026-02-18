'use client';

import { useState, useEffect, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Gift, Share2, Copy, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, query, collection, where, getDocs, writeBatch, serverTimestamp, increment, getDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getDeviceFingerprint } from '@/lib/fingerprint';
import type { ReferralConfig, UserProfile } from '@/lib/definitions';
import { useSearchParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';

function ReferralDialogContent() {
    const { points, user, userProfile, isAdmin, isLoading } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    
    const [referralCodeInput, setReferralCodeInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
    const { data: refConfig } = useDoc<ReferralConfig>(referralConfigRef);

    useEffect(() => {
        if (isOpen) {
            const refFromUrl = searchParams.get('ref');
            if (refFromUrl && !userProfile?.referredBy) {
                setReferralCodeInput(refFromUrl.toUpperCase());
            }
        }
    }, [isOpen, searchParams, userProfile]);

    const copyToClipboard = (text: string, title: string) => {
        if (!text) return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            toast({ title });
        }
    };

    const handleRedeemReferral = async () => {
        if (!firestore || !user || !referralCodeInput) return;
        
        if (userProfile?.referredBy) {
            toast({ variant: "destructive", title: "تنبيه", description: "لقد استخدمت كوداً سابقاً، لا يمكنك استخدام أكثر من كود." });
            return;
        }

        setIsSubmitting(true);
        
        try {
            const fingerprint = await getDeviceFingerprint();
            
            const usedInvRef = doc(firestore, 'used_invitations', fingerprint);
            const usedInvSnap = await getDoc(usedInvRef);
            if (usedInvSnap.exists()) {
                throw new Error("عذراً، هذا الجهاز استخدم كود دعوة مسبقاً ولا يمكنه الاستفادة من كود آخر.");
            }

            const codeToFind = referralCodeInput.trim().toUpperCase();
            const refQuery = query(collection(firestore, 'users'), where("referralCode", "==", codeToFind));
            const refSnap = await getDocs(refQuery);
            
            if (refSnap.empty) {
                throw new Error("كود الدعوة المدخل غير صحيح.");
            }

            const referrerDoc = refSnap.docs[0];
            const referrerData = referrerDoc.data() as UserProfile;
            
            if (referrerDoc.id === user.uid || referrerData.email.toLowerCase() === user.email?.toLowerCase()) {
                throw new Error("لا يمكنك استخدام كود الدعوة الخاص بك.");
            }

            const pointsToAdd = refConfig?.pointsPerReferral || 10;
            const requiredForPro = refConfig?.requiredReferrals || 5;
            const rewardInterval = refConfig?.rewardInterval || 5;

            const batch = writeBatch(firestore);
            
            const newReferralCount = (referrerData.referralCount || 0) + 1;
            const inviterUpdates: any = {
                referralCount: increment(1),
                points: increment(pointsToAdd)
            };

            if (newReferralCount >= requiredForPro && referrerData.subscriptionTier !== 'pro') {
                inviterUpdates.subscriptionTier = 'pro';
            }

            if (newReferralCount % rewardInterval === 0) {
                const extraCode = `PRO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                inviterUpdates.unlockedProCodes = arrayUnion(extraCode);
            }

            batch.update(referrerDoc.ref, inviterUpdates);

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
            
            toast({ 
                title: "تم تفعيل الكود بنجاح!", 
                description: `مبروك! حصلت أنت وصديقك على ${pointsToAdd} نقطة مكافأة.` 
            });
            setReferralCodeInput('');
            setIsOpen(false);
        } catch (e: any) {
            toast({ variant: "destructive", title: "فشل تفعيل الكود", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 bg-primary-foreground/10 px-3 py-1.5 rounded-full border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all active:scale-95 group">
                    <span className="font-bold text-sm leading-none">{points}</span>
                    <Coins className="h-4 w-4 text-yellow-400 group-hover:rotate-12 transition-transform" />
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-[92vw] sm:max-w-sm rounded-[2.5rem] gap-0 p-0 overflow-hidden shadow-2xl border-none" dir="rtl">
                <ScrollArea className="max-h-[82vh] w-full">
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
                            <div className="bg-muted/50 p-5 rounded-[2rem] space-y-3 text-center border-2 border-dashed border-primary/20 relative group">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm">
                                    كودك الخاص
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <div className="flex-1 bg-background rounded-2xl py-3 px-4 font-mono text-2xl font-black tracking-[0.2em] text-primary shadow-sm min-h-[3.5rem] flex items-center justify-center">
                                        {isLoading && !userProfile?.referralCode ? (
                                            <Loader2 className="h-6 w-6 animate-spin opacity-20" />
                                        ) : (
                                            userProfile?.referralCode || "------"
                                        )}
                                    </div>
                                    <Button 
                                        size="icon" 
                                        disabled={!userProfile?.referralCode}
                                        className="rounded-2xl h-12 w-12 shrink-0 shadow-lg active:scale-90" 
                                        onClick={() => copyToClipboard(userProfile?.referralCode || '', "تم نسخ الكود!")}
                                    >
                                        <Copy className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-primary/5 p-5 rounded-[2rem] border border-primary/10 space-y-4">
                                <div className="flex items-center gap-2.5 text-xs font-black text-primary">
                                    <Share2 className="h-4 w-4" />
                                    <span>شارك واربح مميزات برو</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                                    عن كل صديق يسجل من خلالك، ستحصلان على <strong>{refConfig?.pointsPerReferral || 10} نقاط</strong>. عند وصولك لـ {refConfig?.requiredReferrals || 5} إحالة، سيتم ترقية حسابك لـ "برو" مجاناً!
                                </p>
                                <Button 
                                    className="w-full rounded-2xl h-12 text-sm font-black shadow-md transition-all hover:shadow-primary/20" 
                                    onClick={() => copyToClipboard(userProfile?.referralCode || '', "تم نسخ الكود بنجاح!")}
                                    disabled={!userProfile?.referralCode}
                                >
                                    <Copy className="ml-2 h-4 w-4" />
                                    نسخ الكود للمشاركة
                                </Button>
                            </div>

                            {!isAdmin && (
                                <div className="space-y-4 px-1 border-t pt-6">
                                    {userProfile?.referredBy ? (
                                        <div className="bg-green-50 p-4 rounded-2xl flex items-center gap-2 text-green-700 text-xs font-black justify-center border border-green-100">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>لقد قمت بتفعيل كود دعوة مسبقاً</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-black text-foreground px-1">
                                                <Gift className="h-4 w-4 text-green-500" />
                                                <span>هل لديك كود دعوة من صديق؟</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Input 
                                                    placeholder="أدخل الكود هنا" 
                                                    className="rounded-2xl h-12 bg-muted border-none text-center font-mono font-black tracking-widest uppercase text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                                                    value={referralCodeInput}
                                                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                                                    disabled={isSubmitting}
                                                />
                                                <Button 
                                                    className="rounded-2xl h-12 px-6 font-black text-xs shrink-0 shadow-lg active:scale-95" 
                                                    onClick={handleRedeemReferral}
                                                    disabled={isSubmitting || !referralCodeInput}
                                                >
                                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تفعيل'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 flex gap-3 items-start shadow-sm">
                                <Info className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-yellow-800 leading-relaxed font-bold">
                                    يتم استخدام بصمة الجهاز لضمان نزاهة نظام المكافآت. أي محاولات تلاعب باستخدام أجهزة وهمية ستؤدي لحظر الحساب نهائياً.
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

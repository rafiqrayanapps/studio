'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Gift, Share2, Copy, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, query, collection, where, getDocs, writeBatch, serverTimestamp, increment, getDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getDeviceFingerprint } from '@/lib/fingerprint';
import type { ReferralConfig, UserProfile } from '@/lib/definitions';

export default function ReferralDialog() {
    const { points, user, userProfile, isAdmin } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [referralCode, setReferralCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
    const { data: refConfig } = useDoc<ReferralConfig>(referralConfigRef);

    const copyReferralLink = () => {
        if (!userProfile?.referralCode) return;
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const referralLink = `${baseUrl}/home?ref=${userProfile.referralCode}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(referralLink);
            toast({
                title: "تم نسخ رابط الإحالة!",
                description: "شارك هذا الرابط مع أصدقائك لتربح نقاطاً ومميزات برو."
            });
        }
    };

    const handleRedeemReferral = async () => {
        if (!firestore || !user || !referralCode) return;
        setIsSubmitting(true);
        
        try {
            const fingerprint = await getDeviceFingerprint();
            
            // 1. Check if device already used a referral
            const usedInvRef = doc(firestore, 'used_invitations', fingerprint);
            const usedInvSnap = await getDoc(usedInvRef);
            if (usedInvSnap.exists()) {
                throw new Error("عذراً، هذا الجهاز استخدم كود دعوة مسبقاً ولا يمكنه الاستفادة من كود آخر.");
            }

            // 2. Find the referrer
            const codeToFind = referralCode.trim().toUpperCase();
            const refQuery = query(collection(firestore, 'users'), where("referralCode", "==", codeToFind));
            const refSnap = await getDocs(refQuery);
            
            if (refSnap.empty) {
                throw new Error("كود الدعوة المدخل غير صحيح.");
            }

            const referrerDoc = refSnap.docs[0];
            const referrerData = referrerDoc.data() as UserProfile;
            
            // 3. Prevent self-referral
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

            // Auto-upgrade referrer to Pro if threshold reached
            if (newReferralCount >= requiredForPro && referrerData.subscriptionTier !== 'pro') {
                inviterUpdates.subscriptionTier = 'pro';
            }

            // Bonus logic: reward with extra codes every X referrals
            if (newReferralCount % rewardInterval === 0) {
                const extraCode = `PRO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                inviterUpdates.unlockedProCodes = arrayUnion(extraCode);
            }

            // Update Referrer
            batch.update(referrerDoc.ref, inviterUpdates);

            // Update Current User
            batch.update(doc(firestore, 'users', user.uid), {
                referredBy: referrerDoc.id,
                points: increment(pointsToAdd)
            });

            // Register Fingerprint to prevent fraud
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
            setReferralCode('');
            setIsOpen(false);
        } catch (e: any) {
            toast({ variant: "destructive", title: "فشل تفعيل الكود", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show redeem section only if user hasn't been referred yet
    const canShowRedeem = userProfile && !userProfile.referredBy && !isAdmin;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 bg-primary-foreground/10 px-3 py-1.5 rounded-full border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all active:scale-95 group">
                    <span className="font-bold text-sm leading-none">{points}</span>
                    <Coins className="h-4 w-4 text-yellow-400 group-hover:rotate-12 transition-transform" />
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm rounded-[2rem] gap-6 overflow-hidden" dir="rtl">
                <DialogHeader className="space-y-3">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl mx-auto flex items-center justify-center">
                        <Coins className="w-8 h-8" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-bold">محفظة النقاط والمكافآت</DialogTitle>
                    <DialogDescription className="text-center text-base">
                        رصيدك الحالي: <strong className="text-primary text-xl">{points} نقطة</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Share & Earn Section */}
                    <div className="bg-primary/5 p-5 rounded-3xl border border-primary/10 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-primary">
                            <Share2 className="h-4 w-4" />
                            <span>شارك واربح نقاطاً ومميزات برو</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            عن كل صديق يسجل من خلالك، ستحصل أنت وهو على <strong>{refConfig?.pointsPerReferral || 10} نقاط</strong>. عند وصولك لـ {refConfig?.requiredReferrals || 5} إحالات، سيتم ترقية حسابك لـ "برو" مجاناً!
                        </p>
                        <Button className="w-full rounded-2xl h-12 text-base font-bold shadow-md" onClick={copyReferralLink}>
                            <Copy className="ml-2 h-4 w-4" />
                            نسخ رابط الإحالة الخاص بك
                        </Button>
                    </div>

                    {/* Redeem Code Section */}
                    {canShowRedeem && (
                        <div className="space-y-3 px-1">
                            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                <Gift className="h-4 w-4 text-green-500" />
                                <span>هل لديك كود دعوة من صديق؟</span>
                            </div>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="أدخل الكود هنا" 
                                    className="rounded-2xl h-12 bg-muted border-none text-center font-mono font-bold tracking-widest uppercase"
                                    value={referralCode}
                                    onChange={(e) => setReferralCode(e.target.value)}
                                    disabled={isSubmitting}
                                />
                                <Button 
                                    className="rounded-2xl h-12 px-6 font-bold" 
                                    onClick={handleRedeemReferral}
                                    disabled={isSubmitting || !referralCode}
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تفعيل'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Security Notice */}
                    <div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-100 flex gap-3 items-start">
                        <Info className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-yellow-800 leading-relaxed font-medium">
                            يتم استخدام بصمة الجهاز لضمان نزاهة نظام المكافآت. استخدام أجهزة وهمية أو محاولات التلاعب تؤدي لحظر الحساب نهائياً.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
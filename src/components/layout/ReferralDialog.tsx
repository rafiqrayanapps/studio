'use client';

import { useState, useEffect, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Gift, Share2, Copy, Loader2, Info, Ticket, CheckCircle2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, query, collection, where, getDocs, writeBatch, serverTimestamp, increment, getDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getDeviceFingerprint } from '@/lib/fingerprint';
import type { ReferralConfig, UserProfile } from '@/lib/definitions';
import { useSearchParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';

function ReferralDialogContent() {
    const { points, user, userProfile, isAdmin } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    
    const [referralCodeInput, setReferralCodeInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
    const { data: refConfig } = useDoc<ReferralConfig>(referralConfigRef);

    // Auto-fill from URL when dialog opens
    useEffect(() => {
        if (isOpen) {
            const refFromUrl = searchParams.get('ref');
            if (refFromUrl && !userProfile?.referredBy) {
                setReferralCodeInput(refFromUrl.toUpperCase());
            }
        }
    }, [isOpen, searchParams, userProfile]);

    const copyToClipboard = (text: string, title: string) => {
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
            <DialogContent className="max-w-[92vw] sm:max-w-sm rounded-[2rem] gap-0 p-0 overflow-hidden" dir="rtl">
                <ScrollArea className="max-h-[82vh] w-full">
                    <div className="p-5 space-y-5">
                        <DialogHeader className="space-y-2">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl mx-auto flex items-center justify-center">
                                <Coins className="w-7 h-7" />
                            </div>
                            <DialogTitle className="text-center text-lg font-bold">محفظة النقاط والمكافآت</DialogTitle>
                            <DialogDescription className="text-center text-xs">
                                رصيدك الحالي: <strong className="text-primary text-base">{points} نقطة</strong>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5">
                            <div className="bg-muted p-4 rounded-3xl space-y-2 text-center border-2 border-dashed border-primary/20">
                                <p className="text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-1 uppercase tracking-wider">
                                    <Ticket className="h-3 w-3" /> كود الإحالة الخاص بك
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-background rounded-2xl py-2 px-3 font-mono text-xl font-black tracking-[0.15em] text-primary">
                                        {userProfile?.referralCode}
                                    </div>
                                    <Button size="icon" variant="secondary" className="rounded-xl h-10 w-10 shrink-0" onClick={() => copyToClipboard(userProfile?.referralCode || '', "تم نسخ الكود!")}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10 space-y-3">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-primary">
                                    <Share2 className="h-3.5 w-3.5" />
                                    <span>شارك واربح نقاطاً ومميزات برو</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    عن كل صديق يسجل من خلالك، ستحصلان على <strong>{refConfig?.pointsPerReferral || 10} نقاط</strong>. عند وصولك لـ {refConfig?.requiredReferrals || 5} إحالة، سيتم ترقية حسابك لـ "برو" مجاناً!
                                </p>
                                <Button className="w-full rounded-2xl h-11 text-xs font-bold shadow-sm" onClick={() => copyToClipboard(userProfile?.referralCode || '', "تم نسخ الكود بنجاح!")}>
                                    <Copy className="ml-2 h-3.5 w-3.5" />
                                    نسخ كود الإحالة
                                </Button>
                            </div>

                            {!isAdmin && (
                                <div className="space-y-3 px-1 border-t pt-4">
                                    {userProfile?.referredBy ? (
                                        <div className="bg-green-50 p-3 rounded-2xl flex items-center gap-2 text-green-700 text-[10px] font-bold justify-center">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>لقد قمت بتفعيل كود دعوة مسبقاً</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-foreground">
                                                <Gift className="h-3.5 w-3.5 text-green-500" />
                                                <span>هل لديك كود دعوة من صديق؟</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Input 
                                                    placeholder="أدخل الكود هنا" 
                                                    className="rounded-2xl h-11 bg-muted border-none text-center font-mono font-bold tracking-widest uppercase text-xs"
                                                    value={referralCodeInput}
                                                    onChange={(e) => setReferralCodeInput(e.target.value)}
                                                    disabled={isSubmitting}
                                                />
                                                <Button 
                                                    className="rounded-2xl h-11 px-4 font-bold text-[10px] shrink-0" 
                                                    onClick={handleRedeemReferral}
                                                    disabled={isSubmitting || !referralCodeInput}
                                                >
                                                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'تفعيل'}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-100 flex gap-2.5 items-start">
                                <Info className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
                                <p className="text-[9px] text-yellow-800 leading-relaxed font-medium">
                                    يتم استخدام بصمة الجهاز لضمان نزاهة نظام المكافآت. أي محاولات تلاعب تؤدي لحظر الحساب نهائياً من النظام.
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

'use client';
import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, getDocs, query, where, writeBatch, collection, serverTimestamp, increment } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Key, CheckCircle, EyeOff, User, Mail, ShieldCheck, UserPlus, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import type { WhitelistEntry, ReferralConfig, UserProfile } from '@/lib/definitions';
import { getDeviceFingerprint } from '@/lib/fingerprint';

// Schemas
const codeSchema = z.object({ code: z.string().min(1, 'الرجاء إدخال كود التفعيل.') });
const contractSchema = z.object({
  fullName: z.string().min(3, 'الاسم الكامل مطلوب.'),
  email: z.string().email(),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'),
  confirmPassword: z.string(),
  referralCode: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, { message: "كلمتا المرور غير متطابقتين", path: ["confirmPassword"] });

type CodeValues = z.infer<typeof codeSchema>;
type ContractValues = z.infer<typeof contractSchema>;

type Step = 'code' | 'contract' | 'success' | 'error';

function ActivationForm() {
  const [step, setStep] = useState<Step>('code');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [activationData, setActivationData] = useState<{
    whitelistEntry: WhitelistEntry & { id: string };
    fingerprint: string;
    code: string;
  } | null>(null);

  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const codeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });
  const contractForm = useForm<ContractValues>({ resolver: zodResolver(contractSchema), defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', referralCode: '' } });

  useEffect(() => {
    const codeFromURL = searchParams.get('code');
    if (codeFromURL) {
      codeForm.setValue('code', codeFromURL);
      codeForm.handleSubmit(onCodeSubmit)();
    }
  }, [searchParams]);

  const onCodeSubmit = async (data: CodeValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!firestore) throw new Error("خدمة قاعدة البيانات غير متاحة");
      
      const currentFingerprint = await getDeviceFingerprint();
      const q = query(collection(firestore, 'whitelist'), where("activationCode", "==", data.code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) throw new Error("كود التفعيل غير صالح.");
      
      const whitelistDoc = querySnapshot.docs[0];
      const entry = whitelistDoc.data() as WhitelistEntry;

      if (entry.isActivated) {
          throw new Error("عذراً، هذا الكود تم استخدامه مسبقاً.");
      }
      
      setActivationData({ whitelistEntry: { ...entry, id: whitelistDoc.id }, fingerprint: currentFingerprint, code: data.code });
      contractForm.setValue('email', whitelistDoc.id);
      setStep('contract');
    } catch (e: any) {
      setError(e.message || "فشل التحقق من الكود.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateReferralCode = (email: string) => {
      const prefix = email.split('@')[0].substring(0, 4).toUpperCase();
      const random = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}${random}`;
  };

  const onContractSubmit = async (data: ContractValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!firestore || !activationData) throw new Error("فقدت بيانات التفعيل. يرجى المحاولة مرة أخرى.");
      const currentFingerprint = activationData.fingerprint;

      // 1. Anti-Fraud & Referral Checks
      let referrerId: string | null = null;
      let referrerDocRef: any = null;
      let pointsToAdd = 10;
      let requiredForPro = 5;

      // Fetch Global Config
      const configRef = doc(firestore, 'appConfig', 'referral');
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
          const conf = configSnap.data() as ReferralConfig;
          pointsToAdd = conf.pointsPerReferral || 10;
          requiredForPro = conf.requiredReferrals || 5;
      }

      if (data.referralCode) {
          // Rule: Device can only use referral once
          const usedInvRef = doc(firestore, 'used_invitations', currentFingerprint);
          const usedInvSnap = await getDoc(usedInvRef);
          if (usedInvSnap.exists()) {
              throw new Error("عذراً، هذا الجهاز استخدم كود دعوة مسبقاً ولا يمكنه الاستفادة من كود آخر.");
          }

          // Find referrer
          const refQuery = query(collection(firestore, 'users'), where("referralCode", "==", data.referralCode));
          const refSnap = await getDocs(refQuery);
          if (refSnap.empty) {
              throw new Error("كود الدعوة المدخل غير صحيح.");
          }
          
          const referrerData = refSnap.docs[0].data() as UserProfile;
          referrerId = refSnap.docs[0].id;
          referrerDocRef = refSnap.docs[0].ref;

          if (referrerData.email.toLowerCase() === data.email.toLowerCase()) {
              throw new Error("لا يمكنك استخدام كود الدعوة الخاص بك.");
          }
      }

      // 2. Atomic Creation & Update
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      const batch = writeBatch(firestore);
      
      // Update Whitelist
      const whitelistRef = doc(firestore, 'whitelist', activationData.whitelistEntry.id);
      batch.update(whitelistRef, {
        isActivated: true,
        activatedByUid: user.uid,
        deviceFingerprints: [currentFingerprint],
      });

      // Create new user profile
      const userProfileRef = doc(firestore, 'users', user.uid);
      const myReferralCode = generateReferralCode(data.email);
      
      batch.set(userProfileRef, {
        email: data.email,
        displayName: data.fullName,
        subscriptionTier: 'pro', // Users activated via code are Pro by default in this flow
        createdAt: serverTimestamp(),
        points: 0,
        referralCode: myReferralCode,
        referralCount: 0,
        unlockedProCodes: [],
        referredBy: referrerId,
      });

      // 3. Process Referrer Reward (Atomic)
      if (referrerId && referrerDocRef) {
          // Fetch latest referrer data to check thresholds
          const rSnap = await getDoc(referrerDocRef);
          const rData = rSnap.data() as UserProfile;
          const newCount = (rData.referralCount || 0) + 1;
          
          const updates: any = {
              referralCount: increment(1),
              points: increment(pointsToAdd)
          };

          // Auto-upgrade to Pro if limit reached
          if (newCount >= requiredForPro && rData.subscriptionTier !== 'pro') {
              updates.subscriptionTier = 'pro';
          }

          batch.update(referrerDocRef, updates);

          // Record device usage to prevent fraud
          const usedInvRef = doc(firestore, 'used_invitations', currentFingerprint);
          batch.set(usedInvRef, {
              userId: user.uid,
              referrerId: referrerId,
              timestamp: serverTimestamp()
          });
      }

      await batch.commit();

      setSuccessMessage('تم تفعيل حسابك بنجاح! سيتم توجيهك الآن...');
      setStep('success');
      setTimeout(() => router.push('/home'), 3000);

    } catch (e: any) {
      if (e instanceof FirebaseError && e.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مستخدم بالفعل.');
      } else {
        setError(e.message || "فشل إنشاء الحساب.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderStep = () => {
    switch(step) {
      case 'code':
        return (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>تفعيل اشتراك برو</CardTitle>
              <CardDescription>أدخل كود التفعيل الذي حصلت عليه للمتابعة</CardDescription>
            </CardHeader>
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(onCodeSubmit)}>
                <CardContent><FormField control={codeForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>كود التفعيل</FormLabel><FormControl><div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)}/></CardContent>
                <CardFooter><Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'تحقق من الكود'}</Button></CardFooter>
              </form>
            </Form>
          </Card>
        );
      case 'contract':
        return (
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <CardTitle>إنشاء الحساب</CardTitle>
              <CardDescription>أكمل بياناتك لتفعيل اشتراكك.</CardDescription>
            </CardHeader>
            <Form {...contractForm}>
              <form onSubmit={contractForm.handleSubmit(onContractSubmit)}>
                <CardContent className="space-y-4">
                  <FormField control={contractForm.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>الاسم الكامل</FormLabel><FormControl><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={contractForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>بريد التسجيل</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input {...field} className="pl-10 text-left" dir="ltr" readOnly disabled /></div></FormControl><FormMessage /></FormItem>)} />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={contractForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>كلمة المرور</FormLabel><FormControl><div className="relative"><EyeOff className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="password" {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={contractForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>تأكيد كلمة المرور</FormLabel><FormControl><div className="relative"><ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="password" {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)} />
                  </div>

                  <div className="pt-4 border-t">
                      <FormField control={contractForm.control} name="referralCode" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="text-primary flex items-center gap-2 font-bold"><UserPlus className="h-4 w-4" /> كود الدعوة (اختياري)</FormLabel>
                              <FormControl>
                                  <Input {...field} placeholder="أدخل كود صديقك هنا" className="text-left font-mono" dir="ltr" />
                              </FormControl>
                              <FormDescription className="text-xs text-muted-foreground">باستخدام كود صديقك، ستمنحه نقاطاً إضافية وتقربه من تفعيل ميزات برو مجاناً.</FormDescription>
                              <FormMessage />
                          </FormItem>
                      )} />
                  </div>
                </CardContent>
                {error && (
                    <div className="bg-destructive/10 p-3 rounded-lg flex items-center gap-2 mx-6 mb-4 text-destructive text-sm font-bold">
                        <ShieldAlert className="h-5 w-5" />
                        <p>{error}</p>
                    </div>
                )}
                <CardFooter><Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'تفعيل الحساب'}</Button></CardFooter>
              </form>
            </Form>
          </Card>
        );
      case 'success':
        return (
          <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">تم التفعيل بنجاح!</h2>
            <p className="text-muted-foreground">{successMessage}</p>
          </CardContent></Card>
        );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
        <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-700 leading-relaxed">
            <strong>ملاحظة هامة:</strong> نظام المكافآت مخصص لمشاركة التطبيق مع مستخدمين حقيقيين. أي محاولة للتلاعب باستخدام أجهزة وهمية ستؤدي إلى حظر الجهاز نهائياً.
        </div>
        {renderStep()}
    </div>
  );
}

export default function ActivatePage() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
            <Suspense fallback={<Card className="w-full max-w-md h-96"><CardContent className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>}>
                <ActivationForm />
            </Suspense>
        </div>
    );
}

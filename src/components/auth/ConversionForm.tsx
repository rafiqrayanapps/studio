
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDocs, query, collection, where, writeBatch, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, ShieldAlert, CheckCircle2, Coins, AlertCircle } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getDeviceFingerprint } from '@/lib/fingerprint';
import type { UserProfile, ReferralConfig } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { ScrollArea } from '@/components/ui/scroll-area';

const conversionSchema = z.object({
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

type ConversionValues = z.infer<typeof conversionSchema>;

export default function ConversionForm() {
  const [checking, setChecking] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [guestData, setGuestData] = useState<UserProfile & { id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ConversionValues>({
    resolver: zodResolver(conversionSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    async function checkEligibility() {
      if (!firestore) return;
      try {
        const fingerprint = await getDeviceFingerprint();
        
        const q = query(collection(firestore, 'users'), 
            where("deviceFingerprint", "==", fingerprint), 
            where("subscriptionTier", "==", "free"));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setEligible(false);
          setChecking(false);
          return;
        }

        const data = snap.docs[0].data() as UserProfile;
        const configRef = doc(firestore, 'appConfig', 'referral');
        const configSnap = await getDoc(configRef);
        const required = (configSnap.data() as ReferralConfig)?.requiredReferrals || 5;

        if (data.referralCount >= required) {
          setEligible(true);
          setGuestData({ ...data, id: snap.docs[0].id });
        } else {
          setEligible(false);
        }
      } catch (e) {
        console.error("Eligibility check error:", e);
      } finally {
        setChecking(false);
      }
    }
    checkEligibility();
  }, [firestore]);

  const onSubmit = async (values: ConversionValues) => {
    if (!firestore || !guestData) return;
    setError(null);
    try {
      // 1. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. Set profile name
      await updateProfile(user, { displayName: 'مستخدم برو' });

      // 3. Calculate 90 days expiry
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);

      const batch = writeBatch(firestore);
      
      // Update/Create User Profile with the new UID
      const userRef = doc(firestore, 'users', user.uid);
      batch.set(userRef, {
        ...guestData,
        email: values.email,
        subscriptionTier: 'pro',
        subscriptionEndDate: Timestamp.fromDate(expiryDate),
        updatedAt: serverTimestamp()
      });

      // Delete the old guest profile document if UID changed
      if (guestData.id !== user.uid) {
        batch.delete(doc(firestore, 'users', guestData.id));
      }

      await batch.commit();
      setSuccess(true);
      toast({ title: "تهانينا! تم تفعيل اشتراك برو لمدة 90 يوم" });
      setTimeout(() => router.push('/home'), 2000);

    } catch (e: any) {
      console.error("Conversion error:", e);
      const errorCode = e.code || (e as any).code;
      
      if (errorCode === 'auth/email-already-in-use') {
          setError("هذا البريد الإلكتروني مسجل بالفعل.");
      } else if (errorCode === 'auth/admin-restricted-operation') {
          setError("تنبيه أمان: يرجى تفعيل 'Email/Password' وإضافة النطاق الحالي لـ 'Authorized Domains' في إعدادات Firebase Console.");
      } else {
          setError(e.message || "فشل تحويل الحساب. يرجى التأكد من إعدادات الموقع.");
      }
    }
  };

  if (checking) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جاري التحقق من أهليتك للمكافأة...</p>
      </div>
    );
  }

  if (!eligible && !success) {
    return (
      <div className="p-6 text-center space-y-6">
        <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
          <Coins className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2 px-2">
          <CardTitle className="text-lg">غير مؤهل حالياً</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            تحتاج للوصول إلى الحد المطلوب من الإحالات ({guestData?.referralCount || 0} من أصل 5) لتحويل حسابك إلى برو مجاناً لمدة 90 يوم.
          </CardDescription>
        </div>
        <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => router.push('/home')}>
          العودة لجمع النقاط
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <CardContent className="p-8 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold">تم التحويل بنجاح!</h2>
        <p className="text-muted-foreground">لديك الآن وصول كامل لمميزات برو لمدة 90 يوم.</p>
      </CardContent>
    );
  }

  return (
    <ScrollArea className="max-h-[70vh]">
      <CardHeader className="text-center p-6 pb-2">
        <div className="bg-green-100 text-green-700 w-fit mx-auto px-3 py-1 rounded-full text-[10px] font-bold mb-2 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> مؤهل للتحويل
        </div>
        <CardTitle className="text-xl">تفعيل اشتراك 90 يوم</CardTitle>
        <CardDescription className="text-xs">لقد حققت الهدف! أنشئ حسابك الآن لتفعيل ميزات برو.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 p-6 pt-2">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">البريد الإلكتروني الجديد</FormLabel>
                <FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input {...field} className="pl-9 h-11 text-sm text-left" dir="ltr" /></div></FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 gap-4">
                <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs">كلمة المرور</FormLabel>
                    <FormControl><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" {...field} className="pl-9 h-11 text-sm text-left" dir="ltr" /></div></FormControl>
                    <FormMessage className="text-[10px]" />
                </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs">تأكيد كلمة المرور</FormLabel>
                    <FormControl><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" {...field} className="pl-9 h-11 text-sm text-left" dir="ltr" /></div></FormControl>
                    <FormMessage className="text-[10px]" />
                </FormItem>
                )} />
            </div>
            {error && (
                <div className="bg-destructive/10 p-3 rounded-xl flex items-start gap-2 text-destructive text-[10px] leading-tight border border-destructive/20">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="font-semibold">{error}</p>
                </div>
            )}
          </CardContent>
          <CardFooter className="p-6 pt-0">
            <Button type="submit" className="w-full h-12 rounded-xl text-sm font-bold" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'تفعيل اشتراك برو الآن'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </ScrollArea>
  );
}

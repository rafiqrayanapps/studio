'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, User, CheckCircle2, Eye, EyeOff, AlertCircle, UserPlus, Clock } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import { getDeviceFingerprint } from '@/lib/fingerprint';
import type { ReferralConfig } from '@/lib/definitions';

const signupSchema = z.object({
  fullName: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" }),
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

type SignupValues = z.infer<typeof signupSchema>;

export default function UserSignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const generateReferralCode = (fingerprint: string) => {
      const stableSuffix = fingerprint.substring(0, 4).toUpperCase();
      return `RF-${stableSuffix}`;
  };

  const onSubmit = async (values: SignupValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
        if (!firestore) throw new Error("خدمة قاعدة البيانات غير متاحة.");

        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        // 2. Prepare Profile Data
        const fingerprint = await getDeviceFingerprint();
        const myReferralCode = generateReferralCode(fingerprint);
        
        // Check if there's a referral config for initial points
        const configRef = doc(firestore, 'appConfig', 'referral');
        const configSnap = await getDoc(configRef);
        const initialPoints = (configSnap.data() as ReferralConfig)?.pointsPerReferral || 0;

        // 3. Create Firestore Document with 'pending' status
        await setDoc(doc(firestore, 'users', user.uid), {
            email: values.email.toLowerCase(),
            displayName: values.fullName,
            subscriptionTier: 'free',
            status: 'pending', // New accounts are pending by default
            createdAt: serverTimestamp(),
            points: initialPoints,
            referralCode: myReferralCode,
            referralCount: 0,
            unlockedProCodes: [],
            referredBy: null,
            deviceFingerprint: fingerprint
        });

        // 4. Force Sign Out (Account needs approval)
        await signOut(auth);
        setSuccess(true);

    } catch (e: any) {
       let description = "حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.";
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/email-already-in-use') {
          description = "هذا البريد الإلكتروني مسجل بالفعل لدينا.";
        } else if (e.code === 'auth/admin-restricted-operation') {
          description = "تنبيه أمان: يرجى تفعيل 'Email/Password' في إعدادات Firebase Console.";
        }
      } else {
        description = e.message;
      }
      setError(description);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
      return (
          <CardContent className="p-10 text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full mx-auto flex items-center justify-center">
                  <Clock className="w-10 h-10 animate-pulse" />
              </div>
              <div className="space-y-2">
                  <h2 className="text-2xl font-black">طلبك قيد المراجعة!</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                      تم استلام طلب تسجيلك بنجاح. سنقوم بمراجعة بياناتك وتفعيل حسابك خلال أقرب وقت ممكن. شكراً لانضمامك!
                  </p>
              </div>
              <Button onClick={() => window.location.reload()} className="w-full h-12 rounded-xl font-bold">
                  العودة للرئيسية
              </Button>
          </CardContent>
      );
  }

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-black">إنشاء حساب جديد</CardTitle>
        <CardDescription>انضم إلينا للحصول على نقاط ومميزات حصرية</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold">الاسم الكامل</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input {...field} className="h-12 rounded-xl pl-10" placeholder="مثال: محمد عبدالله" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold">البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="email" {...field} className="h-12 rounded-xl pl-10 text-left" dir="ltr" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-xs font-bold">كلمة المرور</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type={showPassword ? 'text' : 'password'} {...field} className="h-12 rounded-xl pl-10 text-left" dir="ltr" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-xs font-bold">تأكيد كلمة المرور</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type={showPassword ? 'text' : 'password'} {...field} className="h-12 rounded-xl pl-10 text-left" dir="ltr" />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg flex items-start gap-3 border border-dashed">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    ملاحظة: سيتم مراجعة حسابك يدوياً من قبل الإدارة قبل التفعيل لضمان جودة المنصة.
                </p>
            </div>

            {error && (
                <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/20 flex gap-3 items-start animate-in fade-in">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-destructive leading-relaxed">{error}</p>
                </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <><UserPlus className="ml-2 h-5 w-5" /> إرسال طلب الانضمام</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDocs, query, where, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, Key, Frown, CheckCircle, ShieldAlert } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import type { WhitelistEntry } from '@/lib/definitions';
import { getDeviceFingerprint } from '@/lib/fingerprint';

// Step 1: Activation Code Form
const activationCodeSchema = z.object({
  activationCode: z.string().min(1, { message: 'الرجاء إدخال كود التفعيل.' }),
});
type ActivationCodeValues = z.infer<typeof activationCodeSchema>;

// Step 2: Create Account Form
const createAccountSchema = z.object({
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});
type CreateAccountValues = z.infer<typeof createAccountSchema>;

type Step = 'activate' | 'createAccount' | 'success';

export default function ProActivationForm() {
  const [step, setStep] = useState<Step>('activate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedCode, setValidatedCode] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [whitelistData, setWhitelistData] = useState<WhitelistEntry | null>(null);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const activationForm = useForm<ActivationCodeValues>({
    resolver: zodResolver(activationCodeSchema),
    defaultValues: { activationCode: '' },
  });

  const createAccountForm = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onActivateSubmit = async (data: ActivationCodeValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!firestore) throw new Error("Firestore not available");
      
      const currentFingerprint = await getDeviceFingerprint();
      setFingerprint(currentFingerprint);

      const q = query(collection(firestore, 'whitelist'), where("activationCode", "==", data.activationCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("كود التفعيل غير صالح.");
      }

      const whitelistDoc = querySnapshot.docs[0];
      const entry = whitelistDoc.data() as WhitelistEntry;

      if (entry.isActivated) {
        if (entry.deviceFingerprint === currentFingerprint) {
          throw new Error("هذا الكود تم استخدامه بالفعل على هذا الجهاز.");
        } else {
          throw new Error("عذراً، هذا الكود مستخدم على جهاز آخر.");
        }
      }
      
      // Code is valid and unused
      setValidatedCode(data.activationCode);
      setWhitelistData({ ...entry, id: whitelistDoc.id }); // Save the entry data
      createAccountForm.setValue('email', whitelistDoc.id); // Pre-fill email
      setStep('createAccount');

    } catch (e: any) {
      setError(e.message || "فشل التحقق من الكود.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateAccountSubmit = async (data: CreateAccountValues) => {
     setIsSubmitting(true);
     setError(null);
     try {
        if (!firestore || !validatedCode || !fingerprint || !whitelistData) {
            throw new Error("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.");
        }

        if (data.email !== whitelistData.id) {
             throw new Error("البريد الإلكتروني لا يتطابق مع البريد المرتبط بكود التفعيل.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const user = userCredential.user;

        const batch = writeBatch(firestore);
        
        // Mark the code as used by the new user
        const whitelistRef = doc(firestore, 'whitelist', whitelistData.id);
        batch.update(whitelistRef, { 
            isActivated: true,
            activatedByUid: user.uid,
            deviceFingerprint: fingerprint,
        });
        
        // Create a user profile with pro status
        const userProfileRef = doc(firestore, 'users', user.uid);
        batch.set(userProfileRef, {
            email: data.email,
            subscriptionTier: 'pro',
            createdAt: serverTimestamp(),
            displayName: data.email.split('@')[0],
            subscriptionEndDate: whitelistData.subscriptionEndDate || null,
        });

        await batch.commit();

        setStep('success');
        setTimeout(() => router.push('/home'), 2000);

     } catch (e: any) {
        if (e instanceof FirebaseError) {
            if (e.code === 'auth/email-already-in-use') {
            setError('هذا البريد الإلكتروني مستخدم بالفعل.');
            } else {
            setError("فشل إنشاء الحساب. الرجاء المحاولة مرة أخرى.");
            }
        } else {
            setError(e.message || "فشل إنشاء الحساب.");
        }
     } finally {
        setIsSubmitting(false);
     }
  }

  // Activation Step Form
  if (step === 'activate') {
    return (
      <>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">تفعيل اشتراك برو</CardTitle>
          <CardDescription>أدخل كود التفعيل الذي حصلت عليه</CardDescription>
        </CardHeader>
        <Form {...activationForm}>
          <form onSubmit={activationForm.handleSubmit(onActivateSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={activationForm.control}
                name="activationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كود التفعيل</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input placeholder="أدخل كود التفعيل" {...field} className="pl-10 text-left" dir="ltr" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                  <div className="flex items-center justify-center gap-2 text-destructive pt-2 text-sm">
                      <ShieldAlert className="h-5 w-5" />
                      <p className="font-semibold">{error}</p>
                  </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'تفعيل'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </>
    );
  }

  // Create Account Step Form
  if (step === 'createAccount') {
      return (
         <>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
                <CardDescription>الكود صحيح! الآن قم بإنشاء حسابك لربطه بالاشتراك.</CardDescription>
            </CardHeader>
            <Form {...createAccountForm}>
                <form onSubmit={createAccountForm.handleSubmit(onCreateAccountSubmit)}>
                <CardContent className="space-y-6">
                    <FormField
                        control={createAccountForm.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>البريد الإلكتروني</FormLabel>
                            <FormControl>
                                <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input type="email" {...field} className="pl-10 text-left" dir="ltr" readOnly disabled />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField control={createAccountForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>كلمة المرور الجديدة</FormLabel><FormControl><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="password" placeholder="••••••••••••" {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={createAccountForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>تأكيد كلمة المرور</FormLabel><FormControl><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="password" placeholder="••••••••••••" {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)} />
                    
                    {error && (
                        <div className="flex items-center justify-center gap-2 text-destructive pt-2 text-sm">
                            <Frown className="h-5 w-5" />
                            <p className="font-semibold">{error}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'إنشاء وتفعيل الحساب'}
                    </Button>
                </CardFooter>
                </form>
            </Form>
        </>
      )
  }

  // Success Step
  return (
       <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[250px]">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">تم التفعيل بنجاح!</h2>
            <p className="text-muted-foreground">أهلاً بك في رفيق المصمم برو. يتم الآن توجيهك للصفحة الرئيسية.</p>
       </CardContent>
  );
}

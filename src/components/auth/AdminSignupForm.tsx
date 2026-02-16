'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, ShieldAlert, CheckCircle } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import type { WhitelistEntry } from '@/lib/definitions';

const createAccountSchema = z.object({
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

type CreateAccountValues = z.infer<typeof createAccountSchema>;

export default function AdminSignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const form = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: CreateAccountValues) => {
     setIsSubmitting(true);
     setError(null);
     try {
        if (!firestore) {
            throw new Error("خدمة قاعدة البيانات غير متاحة.");
        }

        const email = data.email.toLowerCase();
        const whitelistRef = doc(firestore, 'whitelist', email);
        const whitelistSnap = await getDoc(whitelistRef);

        if (!whitelistSnap.exists()) {
             throw new Error("هذا البريد الإلكتروني غير مصرح له بإنشاء حساب مسؤول.");
        }
        
        const whitelistData = whitelistSnap.data() as WhitelistEntry;

        if (whitelistData.role !== 'admin') {
            throw new Error("هذا البريد الإلكتروني غير مصرح له بإنشاء حساب مسؤول.");
        }

        if (whitelistData.isActivated) {
            throw new Error("هذا الحساب تم إنشاؤه وتفعيله بالفعل.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
        const user = userCredential.user;

        const batch = writeBatch(firestore);
        
        // Mark the whitelist entry as activated
        batch.update(whitelistRef, { 
            isActivated: true,
            activatedByUid: user.uid,
        });
        
        // Create user profile
        const userProfileRef = doc(firestore, 'users', user.uid);
        batch.set(userProfileRef, {
            email: email,
            subscriptionTier: 'free', // Admins aren't 'pro' by default, they just have access rights
            createdAt: serverTimestamp(),
            displayName: email.split('@')[0],
        });

        await batch.commit();

        setSuccess(true);
        setTimeout(() => router.push('/admin/dashboard'), 2000);

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
  
  if (success) {
      return (
         <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[350px]">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">تم إنشاء الحساب بنجاح!</h2>
            <p className="text-muted-foreground">يتم الآن توجيهك إلى لوحة التحكم.</p>
       </CardContent>
      );
  }

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">إنشاء حساب مسؤول</CardTitle>
        <CardDescription>أدخل البريد الإلكتروني الذي تم منحك صلاحياته.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="email" {...field} className="pl-10 text-left" dir="ltr" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="password" {...field} className="pl-10 text-left" dir="ltr" />
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
                  <FormLabel>تأكيد كلمة المرور</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="password" {...field} className="pl-10 text-left" dir="ltr" />
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
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'إنشاء حساب'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </>
  );
}

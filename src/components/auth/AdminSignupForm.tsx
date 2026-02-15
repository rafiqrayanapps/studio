'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, ShieldAlert } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import type { WhitelistEntry } from '@/lib/definitions';

const formSchema = z.object({
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof formSchema>;

export default function AdminSignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!firestore) {
        throw new Error("خدمة قاعدة البيانات غير متاحة.");
      }

      const email = data.email.toLowerCase();

      // 1. Check if the user is on the admin whitelist
      const whitelistRef = doc(firestore, 'whitelist', email);
      const whitelistSnap = await getDoc(whitelistRef);

      if (!whitelistSnap.exists() || whitelistSnap.data().role !== 'admin') {
        throw new Error("هذا الحساب غير مصرح له بإنشاء حساب مسؤول.");
      }

      // 2. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
      const user = userCredential.user;

      // 3. Create the user profile document in Firestore
      const userProfileRef = doc(firestore, 'users', user.uid);
      await setDoc(userProfileRef, {
          email: email,
          subscriptionTier: 'free', // Admins get pro access via the whitelist, not their profile
          createdAt: serverTimestamp(),
          displayName: email.split('@')[0],
      });

      // 4. Redirect to the admin dashboard
      router.push('/admin/dashboard');

    } catch (e: any) {
       let description = "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.";
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/email-already-in-use') {
          description = "هذا البريد الإلكتروني مستخدم بالفعل.";
        }
      } else {
        description = e.message;
      }
      setError(description);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">إنشاء حساب مسؤول</CardTitle>
        <CardDescription>يجب أن يكون بريدك الإلكتروني قد تمت إضافته من قبل مسؤول آخر.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="email" placeholder="email@example.com" {...field} className="pl-10 text-left" dir="ltr" />
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>كلمة المرور</FormLabel><FormControl><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="password" placeholder="••••••••••••" {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>تأكيد كلمة المرور</FormLabel><FormControl><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="password" placeholder="••••••••••••" {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)} />
            
            {error && (
                <div className="flex items-center justify-center gap-2 text-destructive pt-2 text-sm">
                    <ShieldAlert className="h-5 w-5" />
                    <p className="font-semibold">{error}</p>
                </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'إنشاء الحساب'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </>
  );
}

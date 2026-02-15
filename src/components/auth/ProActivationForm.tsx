'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, Key, Frown } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import type { WhitelistEntry } from '@/lib/definitions';

const formSchema = z.object({
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' }),
  confirmPassword: z.string(),
  activationCode: z.string().min(1, { message: 'الرجاء إدخال كود التفعيل.' }),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

type ActivationFormValues = z.infer<typeof formSchema>;

export default function ProActivationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const form = useForm<ActivationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      activationCode: '',
    },
  });

  const onSubmit = async (data: ActivationFormValues) => {
    setIsSubmitting(true);
    setError(null);
     try {
      if (!firestore) throw new Error("Firestore not available");
      
      const whitelistRef = doc(firestore, 'whitelist', data.email);
      const whitelistSnap = await getDoc(whitelistRef);

      if (!whitelistSnap.exists()) {
        throw new Error("البريد الإلكتروني أو كود التفعيل غير صالح.");
      }

      const whitelistData = whitelistSnap.data() as WhitelistEntry;

      if (whitelistData.role !== 'pro' || whitelistData.activationCode !== data.activationCode) {
        throw new Error("البريد الإلكتروني أو كود التفعيل غير صالح.");
      }

      if (whitelistData.claimedByUid) {
        throw new Error("هذا الكود تم استخدامه مسبقًا.");
      }
      
      // Code is valid and unused, create a permanent user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      const batch = writeBatch(firestore);
      
      // Mark the code as used by the new user
      batch.update(whitelistRef, { claimedByUid: user.uid });
      
      // Create a user profile with pro status
      const userProfileRef = doc(firestore, 'users', user.uid);
      batch.set(userProfileRef, {
        email: data.email,
        subscriptionTier: 'pro',
        createdAt: serverTimestamp(),
        displayName: data.email.split('@')[0], // Default display name
        subscriptionEndDate: whitelistData.subscriptionEndDate || null,
      });

      await batch.commit();

      router.push('/home');

    } catch (e: any) {
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/email-already-in-use') {
          setError('هذا البريد الإلكتروني مستخدم بالفعل.');
        } else {
          setError(e.message || "فشل التفعيل. الرجاء التأكد من بياناتك.");
        }
      } else {
         setError(e.message || "فشل التفعيل. الرجاء التأكد من بياناتك.");
      }
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">تفعيل اشتراك برو</CardTitle>
        <CardDescription>أنشئ حسابك الجديد وادخل كود التفعيل</CardDescription>
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
                      <Input type="email" placeholder="email@example.com" {...field} className="pl-10 text-left" dir="ltr" />
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
                  <FormLabel>كلمة المرور الجديدة</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="password" placeholder="••••••••••••" {...field} className="pl-10 text-left" dir="ltr" />
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
                      <Input type="password" placeholder="••••••••••••" {...field} className="pl-10 text-left" dir="ltr" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
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
                    <Frown className="h-5 w-5" />
                    <p className="font-semibold">{error}</p>
                </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'تفعيل الحساب'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </>
  );
}

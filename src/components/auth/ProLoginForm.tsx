'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, Frown, ShieldAlert } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import { getDeviceFingerprint } from '@/lib/fingerprint';
import { doc, getDoc } from 'firebase/firestore';
import { WhitelistEntry } from '@/lib/definitions';

const formSchema = z.object({
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  password: z.string().min(1, { message: 'كلمة المرور مطلوبة' }),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function ProLoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      // 1. Sign in the user
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (!firestore) throw new Error("Firestore not available");

      // 2. Get device fingerprint
      const currentFingerprint = await getDeviceFingerprint();

      // 3. Check against whitelist record
      const whitelistRef = doc(firestore, 'whitelist', user.email!);
      const whitelistSnap = await getDoc(whitelistRef);

      if (whitelistSnap.exists()) {
        const whitelistData = whitelistSnap.data() as WhitelistEntry;
        // If there's a fingerprint on record, it MUST match
        if (whitelistData.deviceFingerprint && whitelistData.deviceFingerprint !== currentFingerprint) {
            // If it doesn't match, sign the user out immediately and throw an error
            await auth.signOut();
            throw new Error("عذراً، هذا الحساب مرتبط بجهاز آخر.");
        }
      }
      
      // 4. If all checks pass, proceed
      router.push('/home');

    } catch (e: any) {
       let description = "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.";
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
          description = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
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
        <CardTitle className="text-2xl">دخول المشتركين</CardTitle>
        <CardDescription>أهلاً بعودتك! سجل الدخول للمتابعة</CardDescription>
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
                  <FormLabel>كلمة المرور</FormLabel>
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
            
            {error && (
                <div className="flex items-center justify-center gap-2 text-destructive pt-2 text-sm">
                    <ShieldAlert className="h-5 w-5" />
                    <p className="font-semibold">{error}</p>
                </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'تسجيل الدخول'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </>
  );
}

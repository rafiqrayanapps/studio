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
import { Loader2, Mail, Lock, ShieldAlert, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { WhitelistEntry } from '@/lib/definitions';
import { getDeviceFingerprint } from '@/lib/fingerprint';

const formSchema = z.object({
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  password: z.string().min(1, { message: 'كلمة المرور مطلوبة' }),
});

type LoginFormValues = z.infer<typeof formSchema>;

interface AdminLoginFormProps {
  title?: string;
  description?: string;
}

export default function AdminLoginForm({ title, description }: AdminLoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
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
        const email = data.email.toLowerCase();
        const userCredential = await signInWithEmailAndPassword(auth, email, data.password);
        const user = userCredential.user;

        if (!firestore) {
            await auth.signOut();
            throw new Error("خدمة قاعدة البيانات غير متاحة.");
        }

        const whitelistRef = doc(firestore, 'whitelist', email);
        const whitelistSnap = await getDoc(whitelistRef);

        if (whitelistSnap.exists()) {
            const whitelistData = whitelistSnap.data() as WhitelistEntry;
            const currentFingerprint = await getDeviceFingerprint();

            if (whitelistData.role === 'admin' || whitelistData.role === 'editor') {
                // Security: Update fingerprint for admin to prevent kicks
                await updateDoc(whitelistRef, { 
                    deviceFingerprints: arrayUnion(currentFingerprint) 
                });
                router.push('/admin/dashboard');
                return;
            }
            
            if (whitelistData.role === 'pro') {
                await updateDoc(whitelistRef, { 
                    deviceFingerprints: arrayUnion(currentFingerprint) 
                });
                router.push('/home');
                return;
            }
        }

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
        <CardTitle>{title || 'تسجيل الدخول'}</CardTitle>
        <CardDescription>{description || 'أهلاً بعودتك! سجل الدخول للمتابعة'}</CardDescription>
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
                      <Input 
                        type="email" 
                        {...field} 
                        className="pl-10 text-left" 
                        dir="ltr"
                        placeholder="يرجى إدخال بريدك الإلكتروني"
                      />
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
                      <Input 
                        type={showPassword ? 'text' : 'password'}
                        {...field} 
                        className="pl-10 pr-10 text-left"
                        dir="ltr" 
                        placeholder="يرجى إدخال كلمة السر"
                      />
                       <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
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
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'تسجيل الدخول'}
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground text-center">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>يسمح بجلسة نشطة واحدة فقط لكل حساب.</span>
            </div>
          </CardFooter>
        </form>
      </Form>
    </>
  );
}

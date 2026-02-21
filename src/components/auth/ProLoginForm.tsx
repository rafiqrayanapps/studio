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
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { WhitelistEntry } from '@/lib/definitions';
import { getDeviceFingerprint } from '@/lib/fingerprint';

const formSchema = z.object({
  email: z.string().email({ message: "الرجاء إدخل بريد إلكتروني صالح" }),
  password: z.string().min(1, { message: 'كلمة المرور مطلوبة' }),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function ProLoginForm() {
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

        const currentFingerprint = await getDeviceFingerprint();

        // Check Whitelist for Admins/Editors/Pro
        const whitelistRef = doc(firestore, 'whitelist', email);
        const whitelistSnap = await getDoc(whitelistRef);

        if (whitelistSnap.exists()) {
            const whitelistData = whitelistSnap.data() as WhitelistEntry;
            
            // Update device fingerprint to take over the session
            // This will trigger logout on other devices via useUserProfile listener
            await updateDoc(whitelistRef, {
                deviceFingerprints: arrayUnion(currentFingerprint),
                lastActiveFingerprint: currentFingerprint
            });

            if (whitelistData.role === 'admin' || whitelistData.role === 'editor') {
                router.push('/admin/dashboard');
                return;
            }
        }

        // Also update the general user profile fingerprint
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
            deviceFingerprint: currentFingerprint,
            lastLogin: new Date()
        }).catch(() => {}); // Ignore error if profile doesn't exist yet

        router.push('/home');

    } catch (e: any) {
       let description = "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.";
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
          description = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        } else if (e.code === 'auth/admin-restricted-operation') {
          description = "خطأ أمان: يرجى تفعيل 'Email/Password' في Firebase Console وإضافة هذا النطاق لـ 'Authorized Domains'.";
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
        <CardTitle className="text-2xl font-black">تسجيل الدخول</CardTitle>
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
                  <FormLabel className="font-bold text-xs">البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="email" {...field} className="h-12 rounded-xl pl-10 text-left font-mono" dir="ltr" placeholder="example@email.com" />
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
                  <FormLabel className="font-bold text-xs">كلمة المرور</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input 
                        type={showPassword ? 'text' : 'password'} 
                        {...field} 
                        className="h-12 rounded-xl pl-10 pr-10 text-left font-mono" 
                        dir="ltr" 
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
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
                <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/20 flex gap-3 items-start animate-in fade-in">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-destructive leading-relaxed">{error}</p>
                </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : 'تسجيل الدخول الآن'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, Key, Frown } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import type { WhitelistEntry } from '@/lib/definitions';

const formSchema = z.object({
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  activationCode: z.string().optional(),
  rememberMe: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function UnifiedLoginForm() {
  const [role, setRole] = useState<'admin' | 'pro'>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      activationCode: '',
      rememberMe: false,
    },
  });

  const handleRoleChange = (newRole: 'admin' | 'pro') => {
    setRole(newRole);
    setError(null);
    form.reset(); // Reset form fields on role change
  };

  const handleAdminLogin = async (data: LoginFormValues) => {
    if (!data.password) {
      form.setError('password', { message: 'كلمة المرور مطلوبة' });
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push('/admin/dashboard');
    } catch (e: any) {
       let description = "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.";
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
          description = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        }
      }
      setError(description);
    }
  };

  const handleProActivation = async (data: Required<Pick<LoginFormValues, 'email' | 'password' | 'activationCode'>>) => {
     try {
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
          return;
        }
      }
      setError(e.message || "فشل التفعيل. الرجاء التأكد من بياناتك.");
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setError(null);

    if (role === 'admin') {
      await handleAdminLogin(data);
    } else if (role === 'pro') {
       if (!data.password || data.password.length < 6) {
           form.setError('password', { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' });
           setIsSubmitting(false);
           return;
       }
       if (data.password !== data.confirmPassword) {
           form.setError('confirmPassword', { message: 'كلمتا المرور غير متطابقتين' });
           setIsSubmitting(false);
           return;
       }
       if (!data.activationCode) {
           form.setError('activationCode', { message: 'الرجاء إدخال كود التفعيل.' });
           setIsSubmitting(false);
           return;
       }
       await handleProActivation(data as Required<Pick<LoginFormValues, 'email' | 'password' | 'activationCode'>>);
    }
    
    setIsSubmitting(false);
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
        <CardDescription>اختر نوع الحساب للمتابعة</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="role"
              render={() => (
                <FormItem className="space-y-3">
                  <FormLabel>نوع الحساب</FormLabel>
                   <FormControl>
                    <RadioGroup
                      onValueChange={(value: 'admin' | 'pro') => handleRoleChange(value)}
                      defaultValue={role}
                      className="flex items-center space-x-4 rtl:space-x-reverse"
                    >
                      <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                        <FormControl>
                          <RadioGroupItem value="admin" id="r1" />
                        </FormControl>
                        <FormLabel htmlFor="r1" className="font-normal">مدير</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                        <FormControl>
                          <RadioGroupItem value="pro" id="r2" />
                        </FormControl>
                        <FormLabel htmlFor="r2" className="font-normal">برو</FormLabel>
                      </FormItem>
                    </RadioGroup>
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

            {role === 'admin' && (
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
            )}
            
            {role === 'pro' && (
              <>
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
              </>
            )}

            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rtl:space-x-reverse">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      تذكرني
                    </FormLabel>
                  </div>
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
              {isSubmitting ? <Loader2 className="animate-spin" /> : (role === 'pro' ? 'تفعيل الحساب' : 'تسجيل الدخول')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </>
  );
}

    
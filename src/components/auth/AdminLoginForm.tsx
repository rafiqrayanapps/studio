'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2, Mail, Lock, Frown } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { useLocale } from '@/hooks/use-locale';


export default function AdminLoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();
  const { t } = useLocale();

  const loginSchema = z.object({
    email: z.string().email({ message: t('invalidEmail') }),
    password: z.string().min(6, { message: t('passwordMinLength') }),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });
  
  const handleInputChange = () => {
    if (error) {
      setError(null);
    }
  };

  const onSubmit = (data: LoginFormValues) => {
    setIsSubmitting(true);
    setError(null);
    signInWithEmailAndPassword(auth, data.email, data.password)
      .catch((error: FirebaseError) => {
        let description = t('unexpectedError');
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          description = t('loginError');
        }
        setError(description);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <>
      <div className="text-center text-primary-foreground">
        <h1 className="text-5xl font-bold">{t('login')}</h1>
        <p className="text-lg opacity-90">{t('continue')}</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground/60" />
          <Input
            id="email"
            type="email"
            placeholder="someone@gmail.com"
            {...form.register('email')}
            onChange={(e) => {
              form.setValue('email', e.target.value);
              handleInputChange();
            }}
            disabled={isSubmitting}
            className="h-12 rounded-full border-none bg-primary-foreground/20 pl-12 pr-4 text-primary-foreground placeholder:text-primary-foreground/60 focus:bg-primary-foreground/30 focus-visible:ring-primary-foreground text-left"
            dir="ltr"
          />
           {form.formState.errors.email && (
            <p className="mt-2 text-center text-sm font-medium text-red-300">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground/60" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••••••"
            {...form.register('password')}
             onChange={(e) => {
              form.setValue('password', e.target.value);
              handleInputChange();
            }}
            disabled={isSubmitting}
            className="h-12 rounded-full border-none bg-primary-foreground/20 pl-12 pr-4 text-primary-foreground placeholder:text-primary-foreground/60 focus:bg-primary-foreground/30 focus-visible:ring-primary-foreground text-left"
            dir="ltr"
          />
          {form.formState.errors.password && (
            <p className="mt-2 text-center text-sm font-medium text-red-300">{form.formState.errors.password.message}</p>
          )}
        </div>

        {error && (
          <div className="flex flex-col items-center text-center gap-2 text-red-300 pt-2">
            <Frown className="h-10 w-10" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 rounded-full bg-primary-foreground text-primary text-lg font-bold hover:bg-primary-foreground/90 !mt-8"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : t('login')}
        </Button>
      </form>
    </>
  );
}

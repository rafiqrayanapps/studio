'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import {
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { setUserProfile } from '@/firebase/firestore';
import { isAdminUser } from '@/lib/utils';
import Loading from '@/app/loading';

const GoogleIcon = () => (
  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);


export function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const adminEmail = 'admin@example.com';

  useEffect(() => {
    if (!auth) {
        setIsAuthChecking(false);
        return;
    }

    const processRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          
          if (firestore) {
            setUserProfile(firestore, user.uid, {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            });
          }

          toast({
            title: 'تم تسجيل الدخول بنجاح!',
            description: `أهلاً بك، ${user.displayName}`,
          });

          if (isAdminUser(user.email)) {
            router.push('/admin');
          } else {
            router.push('/');
          }
        } else {
          setIsAuthChecking(false);
        }
      } catch (error: any) {
        console.error('Google Sign-In Redirect Error:', error);
        toast({
          variant: 'destructive',
          title: 'فشل تسجيل الدخول عبر جوجل',
          description: error.message || 'حدث خطأ غير متوقع.',
        });
        setIsAuthChecking(false);
      }
    };

    processRedirectResult();
  }, [auth, firestore, router, toast]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'خدمة المصادقة غير متاحة.' });
      return;
    }
    setEmailLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
      if (isAdminUser(userCredential.user.email)) {
        router.push('/admin');
      } else {
        await auth.signOut();
        toast({ variant: 'destructive', title: 'دخول غير مصرح به', description: 'هذا الحساب ليس لديه صلاحيات المسؤول.' });
      }
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'فشل تسجيل الدخول', description: 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.' });
    } finally {
      setEmailLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'خدمة المصادقة غير متاحة.' });
      return;
    }
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
        console.error("Google Sign-In Error", error);
        toast({
            variant: "destructive",
            title: "خطأ في تسجيل الدخول",
            description: "لم نتمكن من بدء عملية تسجيل الدخول باستخدام جوجل. يرجى المحاولة مرة أخرى.",
        });
        setGoogleLoading(false);
    }
  };

  if (isAuthChecking) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-3xl font-bold text-primary">
          تسجيل الدخول
        </h1>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="relative">
            <Input id="email" type="email" value={adminEmail} readOnly className="pr-12 text-lg bg-muted/50 text-center" />
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور للمسؤول"
              required
              className="pr-12 text-lg"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <Button type="submit" className="w-full text-lg" disabled={emailLoading}>
            {emailLoading ? '...جاري التسجيل' : 'تسجيل دخول المسؤول'}
            {!emailLoading && <LogIn className="mr-2 h-5 w-5" />}
          </Button>
        </form>

        <div className="my-4 flex items-center before:flex-1 before:border-t before:border-border after:flex-1 after:border-t after:border-border">
          <p className="mx-4 text-center text-sm text-muted-foreground">أو</p>
        </div>

        <Button
          variant="outline"
          className="w-full text-lg"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || emailLoading}
        >
          {googleLoading ? (
            '...جاري'
          ) : (
            <>
              <GoogleIcon />
              تسجيل الدخول باستخدام جوجل
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

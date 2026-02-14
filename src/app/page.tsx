'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SplashState = 'loading' | 'welcoming';

const AppLogo = () => {
    return (
        <div className="flex flex-col items-center justify-center text-primary-foreground text-center w-full max-w-xs leading-tight">
            <span className="text-4xl font-bold opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>رفيق المصمم</span>
            <div className="bg-primary-foreground text-primary px-4 py-0.5 mt-2 rounded-lg w-full opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <span className="text-3xl font-bold">المصمم</span>
            </div>
        </div>
    )
};

const WelcomeLoader = () => (
    <div className="relative h-10 w-10">
        <div className="absolute inset-0 bg-primary-foreground/20 rounded-full animate-ripple"></div>
        <div className="absolute inset-0 bg-primary-foreground/20 rounded-full animate-ripple" style={{ animationDelay: '0.5s' }}></div>
    </div>
);

const WelcomeMessage = () => {
    return (
        <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-primary-foreground">مرحبا بكم</h2>
        </div>
    )
};


export default function SplashPage() {
  const router = useRouter();
  const [splashState, setSplashState] = useState<SplashState>('loading');
  

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setSplashState('welcoming');
    }, 1500); // Show loading dots for 1.5 seconds

    const redirectTimer = setTimeout(() => {
        router.replace('/home');
    }, 2500); // Show welcome message for 1 second, then redirect. Total time: 2.5s

    return () => {
        clearTimeout(loadingTimer);
        clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-primary">
        <div className="z-10 flex flex-1 flex-col items-center justify-center gap-16">
            <AppLogo />
            
            <div className="h-10 flex items-center justify-center">
                {splashState === 'loading' ? <WelcomeLoader /> : <WelcomeMessage />}
            </div>
        </div>
    </div>
  );
}

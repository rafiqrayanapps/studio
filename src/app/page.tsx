'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SplashState = 'loading' | 'welcoming';

const AppLogo = () => {
    return (
        <div className="flex flex-col items-center justify-center text-primary-foreground text-center w-full max-w-xs leading-tight">
            {/* Reduced font sizes */}
            <span className="text-3xl font-bold opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>رفيق المصمم</span>
            <div className="bg-primary-foreground text-primary px-4 py-0.5 mt-2 rounded-lg w-full opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <span className="text-2xl font-bold">المصمم</span>
            </div>
        </div>
    )
};

const WelcomeLoader = () => (
    // New bouncing dots loader
    <div className="flex gap-2">
        <div className="h-2.5 w-2.5 bg-primary-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="h-2.5 w-2.5 bg-primary-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
        <div className="h-2.5 w-2.5 bg-primary-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
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
    <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-primary">
        <div className="z-10 flex flex-1 flex-col items-center justify-center gap-16">
            <AppLogo />
            
            <div className="h-10 flex items-center justify-center">
                {splashState === 'loading' ? <WelcomeLoader /> : <WelcomeMessage />}
            </div>
        </div>
    </div>
  );
}

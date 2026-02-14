'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/hooks/use-locale';

type SplashState = 'loading' | 'welcoming';

const AppLogo = () => {
    const { t } = useLocale();
    return (
        <div className="flex flex-col items-center justify-center text-primary-foreground text-center w-full leading-tight">
            <span className="text-5xl font-bold opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>{t('designerCompanion')}</span>
            <div className="bg-primary-foreground text-primary px-5 py-1 mt-2 rounded-xl w-full opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <span className="text-4xl font-bold">{t('designer')}</span>
            </div>
        </div>
    )
};

const LoadingDots = () => (
    <div className="flex items-center justify-center space-x-2" dir="ltr">
        <div className="h-3 w-3 bg-primary-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-3 w-3 bg-primary-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-3 w-3 bg-primary-foreground rounded-full animate-bounce"></div>
    </div>
);

const WelcomeMessage = () => {
    const { t } = useLocale();
    return (
        <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-primary-foreground">{t('welcome')}</h2>
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
            
            <div className="h-10">
                {splashState === 'loading' ? <LoadingDots /> : <WelcomeMessage />}
            </div>
        </div>
    </div>
  );
}

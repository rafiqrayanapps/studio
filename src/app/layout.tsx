
'use client';

import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import ThemeManager from '@/components/theme/ThemeManager';
import ServiceWorkerRegistrar from '@/components/layout/ServiceWorkerRegistrar';
import OnlineStatusDetector from '@/components/layout/OnlineStatusDetector';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import BottomNav from '@/components/layout/BottomNav';
import { CategoryProvider } from '@/components/providers/CategoryProvider';
import { AffiliateAdsProvider, AffiliateAdSlot } from '@/components/ads/AffiliateAdsManager';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isSplash = pathname === '/';
  const isAdmin = pathname?.startsWith('/admin');
  const showAds = !isSplash && !isAdmin;

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="hsl(350 72% 51%)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-body antialiased bg-[#F8F9FC]')}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <FirebaseClientProvider>
              <AffiliateAdsProvider>
                <CategoryProvider>
                  <ThemeManager />
                  <OnlineStatusDetector />
                  <ServiceWorkerRegistrar />
                  <div className="flex flex-col min-h-screen">
                    {/* Centered Mobile Frame for Desktop */}
                    <div className={cn(
                        "flex-1 w-full mx-auto bg-background transition-all duration-500",
                        !isAdmin && "max-w-md shadow-[0_0_50px_rgba(0,0,0,0.05)] border-x border-black/5"
                    )}>
                        <div className={cn("pb-[calc(60px+80px)] min-h-screen", isAdmin && "pb-0")}>
                          {children}
                        </div>
                    </div>
                    
                    {/* Floating Navigation Bar */}
                    <BottomNav />

                    {/* Banner Slot - Fixed at bottom within the mobile frame context */}
                    {showAds && (
                        <div className="fixed bottom-0 left-0 right-0 z-[120] flex justify-center pointer-events-none">
                            <div className="w-full max-w-md pointer-events-auto bg-card/80 backdrop-blur-xl border-t border-white/5 safe-area-bottom min-h-[60px] flex items-center justify-center">
                                <AffiliateAdSlot placement="banner" className="w-full h-[60px]" />
                            </div>
                        </div>
                    )}
                  </div>
                </CategoryProvider>
              </AffiliateAdsProvider>
            </FirebaseClientProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}

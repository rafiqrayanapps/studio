
import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  applicationName: 'رفيق المصمم',
  title: {
    default: 'رفيق المصمم',
    template: '%s | رفيق المصمم',
  },
  description: 'منصة شاملة للمصممين للحصول على الملحقات والتصاميم والإلهام.',
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'رفيق المصمم',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      <body className={cn('font-body antialiased')}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <FirebaseClientProvider>
              <AffiliateAdsProvider>
                <CategoryProvider>
                  <ThemeManager />
                  <OnlineStatusDetector />
                  <ServiceWorkerRegistrar />
                  <div className="flex flex-col min-h-screen">
                    <div className="flex-1 pb-[calc(60px+80px)]">
                      {children}
                    </div>
                    
                    {/* Floating Navigation Bar */}
                    <BottomNav />

                    {/* Banner Slot - Absolute bottom, Under everything */}
                    <div className="fixed bottom-0 left-0 right-0 z-[120] flex justify-center bg-card/95 backdrop-blur-md border-t border-white/10 safe-area-bottom">
                        <AffiliateAdSlot placement="banner" className="w-full max-w-md h-[60px]" />
                    </div>
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

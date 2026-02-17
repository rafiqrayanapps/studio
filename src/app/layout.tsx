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
        {/* The theme-color meta tag is now managed by ThemeManager.tsx */}
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
              <CategoryProvider>
                <ThemeManager />
                <OnlineStatusDetector />
                <ServiceWorkerRegistrar />
                {children}
                <BottomNav />
              </CategoryProvider>
            </FirebaseClientProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}

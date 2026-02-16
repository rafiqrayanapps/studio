'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Moon, Sun, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import React, { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { ShareLinkConfig } from '@/lib/definitions';
import { Button } from '@/components/ui/button';

// The SVG for the notched background
const NavBackground = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 375 88"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M0 29C0 12.4315 13.4315 0 30 0H147.519C154.276 0 160.627 2.87188 165.235 7.78401L170.054 13.0133C178.632 22.3489 191.368 22.3489 199.946 13.0133L204.765 7.78401C209.373 2.87188 215.724 0 222.481 0H345C361.569 0 375 12.4315 375 29V88H0V29Z"
      fill="currentColor"
    />
  </svg>
);


export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const firestore = useFirestore();
  const [canShare, setCanShare] = React.useState(false);

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  const shareLinkRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'shareLink') : null, [firestore]);
  const { data: shareLinkConfig } = useDoc<ShareLinkConfig>(shareLinkRef);

  const handleShare = async () => {
    if (canShare && shareLinkConfig?.enabled && shareLinkConfig.url) {
      try {
        await navigator.share({
          title: "رفيق المصمم",
          text: shareLinkConfig.text || "مشاركة التطبيق",
          url: shareLinkConfig.url,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  const navItems = useMemo(() => [
    { id: 'home', href: '/home', icon: Home },
    { id: 'favorites', href: '/favorites', icon: Heart },
    { id: 'notifications', href: '/notifications', icon: Bell },
    { id: 'theme-toggle', action: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'), icon: resolvedTheme === 'dark' ? Sun : Moon },
  ], [resolvedTheme, setTheme]);

  const getActivePath = () => {
    if (pathname.startsWith('/categories')) return '/home';
    return pathname;
  }
  const activePath = getActivePath();

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const { id, href, icon: Icon, action } = item;
    const isActive = href ? activePath === href : false;

    const content = (
      <div className="relative flex flex-col items-center justify-center gap-1 w-16 h-16">
        <Icon className={cn("h-6 w-6 transition-colors", isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
        {id === 'notifications' && hasNewNotifications && (
            <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-destructive border border-card"></span>
        )}
      </div>
    );
    
    if (href) {
        return <Link href={href} className="group">{content}</Link>;
    }
    return <button onClick={action} className="group">{content}</button>;
  };

  if (pathname.startsWith('/admin') || pathname === '/' || pathname.startsWith('/login')) {
      return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-28 md:hidden px-4 pointer-events-none">
      <div className="relative h-full w-full max-w-md mx-auto pointer-events-auto">
        <NavBackground className="absolute bottom-0 w-full h-auto text-card" style={{filter: 'drop-shadow(0 -4px 10px rgba(0,0,0,0.05))'}} />
        
        <Button
            size="icon"
            onClick={handleShare}
            className="absolute bottom-[42px] left-1/2 -translate-x-1/2 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg z-10 border-4 border-card"
            disabled={!(canShare && shareLinkConfig?.enabled)}
        >
            <Share2 className="h-7 w-7" />
        </Button>

        <div className="absolute bottom-0 w-full h-24 flex items-center justify-around z-0">
            <div className="flex justify-around items-end w-full pb-1">
                <div className="flex-1 flex justify-center"><NavItem item={navItems[0]} /></div>
                <div className="flex-1 flex justify-center"><NavItem item={navItems[1]} /></div>
                
                <div className="w-20 flex-shrink-0" />

                <div className="flex-1 flex justify-center"><NavItem item={navItems[2]} /></div>
                <div className="flex-1 flex justify-center"><NavItem item={navItems[3]} /></div>
            </div>
        </div>
      </div>
    </nav>
  );
}
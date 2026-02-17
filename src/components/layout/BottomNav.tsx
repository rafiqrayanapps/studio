'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Palette, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import React, { useState, useEffect } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const hasNewNotifications = useHasNewNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = React.useMemo(() => [
    { id: 'home', href: '/home', icon: Home, label: 'الرئيسية' },
    { id: 'favorites', href: '/favorites', icon: Heart, label: 'المفضلة' },
    { id: 'colors', href: '/colors', icon: Palette, label: 'الألوان' },
    { id: 'notifications', href: '/notifications', icon: Bell, label: 'الإشعارات' },
    { id: 'about', href: '/about', icon: Settings, label: 'حول' },
  ], []);

  const getActivePath = () => {
    if (pathname.startsWith('/categories')) return '/home';
    if (navItems.some(item => item.href === pathname)) return pathname;
    return '';
  }
  
  const activePath = getActivePath();

  const hideOnPaths = ['/', '/login', '/signup', '/activate', '/subscribe', '/admin'];
  const shouldHide = hideOnPaths.some(p => pathname.startsWith(p));

  if (!mounted || shouldHide) {
    return null;
  }

  const NavItem = ({ item }: { item: (typeof navItems)[0] }) => {
    const { id, href, icon: Icon, label } = item;
    
    const isActive = href === activePath;
    const isNotificationItem = id === 'notifications';

    const content = (
      <div className="relative flex flex-col items-center justify-center w-16 h-full">
         <div className="relative">
            <Icon className={cn(
              "h-7 w-7 transition-transform duration-200", 
              isActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-foreground'
            )} />
            {(isNotificationItem && hasNewNotifications) && (
               <span className="absolute -top-1 -right-1.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                </span>
            )}
        </div>
      </div>
    );
    
    return (
        <Link href={href || '#'} aria-label={label} className="group flex-1 flex items-center justify-center h-full">
          {content}
        </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-sm border-t z-50 flex items-stretch justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.05)] rounded-t-2xl">
        {navItems.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
    </nav>
  );
}

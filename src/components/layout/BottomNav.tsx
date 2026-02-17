'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function BottomNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const hasNewNotifications = useHasNewNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = React.useMemo(() => [
    { id: 'home', href: '/home', icon: Home, label: 'الرئيسية' },
    { id: 'favorites', href: '/favorites', icon: Heart, label: 'المفضلة' },
    { id: 'notifications', href: '/notifications', icon: Bell, label: 'الإشعارات' },
    { id: 'theme-toggle', icon: theme === 'dark' ? Sun : Moon, label: 'الوضع' },
  ], [theme, hasNewNotifications]);

  const getActivePath = () => {
    const topLevelPaths = ['/home', '/favorites', '/notifications'];
    if (topLevelPaths.includes(pathname)) {
        return pathname;
    }
    
    if (pathname.startsWith('/categories')) {
        return '/home';
    }

    return '';
  }
  
  const activePath = getActivePath();

  // Corrected logic for hiding paths
  const hideOnPaths = ['/login', '/signup', '/activate', '/subscribe', '/admin'];
  const shouldHide = pathname === '/' || hideOnPaths.some(p => pathname.startsWith(p));

  if (!mounted || shouldHide) {
    return null;
  }

  const NavItem = ({ item }: { item: (typeof navItems)[0] }) => {
    const { id, href, icon: Icon, label } = item;
    
    const isActive = href === activePath;
    const isNotificationItem = id === 'notifications';

    const content = (
      <div className="relative flex flex-col items-center justify-center w-16 h-full gap-1">
         {/* Top indicator for active item */}
        {isActive && (
          <div className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
        )}
        <div className="relative mt-2">
            <Icon className={cn(
              "h-6 w-6 transition-colors duration-200", 
              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
            )} />
            {(isNotificationItem && hasNewNotifications) && (
               <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                </span>
            )}
        </div>
        <span className={cn(
          "text-xs transition-colors",
          isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
        )}>
            {label}
        </span>
      </div>
    );

    const commonProps = {
        'aria-label': label,
        className: "group flex-1 flex items-center justify-center h-full"
    };
    
    if (id === 'theme-toggle') {
        return (
            <button {...commonProps} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {content}
            </button>
        )
    }
    
    return (
        <Link href={href || '#'} {...commonProps}>
          {content}
        </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t z-50 flex items-stretch justify-around shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
    </nav>
  );
}

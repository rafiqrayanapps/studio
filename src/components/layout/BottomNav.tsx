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
  ], [theme]);

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

  const hideOnPaths = ['/', '/login', '/signup', '/activate', '/subscribe'];
  if (hideOnPaths.some(p => pathname.startsWith(p)) || pathname.startsWith('/admin') || !mounted) {
    return null;
  }

  const NavItem = ({ item }: { item: (typeof navItems)[0] }) => {
    const { id, href, icon: Icon, label } = item;
    
    const isActive = href === activePath;
    const isNotificationItem = id === 'notifications';

    const content = (
      <div className="relative flex flex-col items-center justify-center w-16 h-16">
        {(isActive || (isNotificationItem && hasNewNotifications)) && (
           <span className="absolute top-3.5 h-1.5 w-1.5 rounded-full bg-destructive z-20"></span>
        )}
        <Icon className={cn(
          "h-6 w-6 transition-colors duration-200", 
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        )} />
      </div>
    );

    const commonProps = {
        'aria-label': label,
        className: "group flex-1 flex items-center justify-center transition-all duration-300"
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
    <nav className="fixed bottom-0 left-0 right-0 h-24 z-30 flex items-center justify-center px-4 pointer-events-none">
      <div 
        className="relative h-20 w-full max-w-sm mx-auto bg-card/95 backdrop-blur-sm rounded-full flex items-center justify-around shadow-lg border pointer-events-auto"
        >
        {navItems.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </div>
    </nav>
  );
}

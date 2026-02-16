'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function BottomNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [indicatorStyle, setIndicatorStyle] = useState({ left: '50%', opacity: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = useMemo(() => [
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
    
    // If we are on a category page, consider 'home' to be the active path.
    if (pathname.startsWith('/categories')) {
        return '/home';
    }

    return '';
  }
  
  const activePath = getActivePath();

  const activeIndex = useMemo(() => {
    return navItems.findIndex(item => item.href === activePath);
  }, [navItems, activePath]);


  useEffect(() => {
    const timeoutId = setTimeout(() => {
        const activeItemEl = itemsRef.current[activeIndex];
        const navEl = navRef.current;

        if (activeItemEl && navEl) {
            const navRect = navEl.getBoundingClientRect();
            const itemRect = activeItemEl.getBoundingClientRect();
            const left = itemRect.left + itemRect.width / 2 - navRect.left;
            setIndicatorStyle({
                left: `${left}px`,
                opacity: 1
            });
        } else {
             setIndicatorStyle(s => ({ ...s, opacity: 0 }));
        }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [activeIndex, pathname, mounted]);

  const hideOnPaths = ['/', '/login', '/signup', '/activate', '/subscribe'];
  // Hide on splash, auth pages, admin pages, and until mounted to prevent hydration issues
  if (hideOnPaths.some(p => pathname.startsWith(p)) || pathname.startsWith('/admin') || !mounted) {
    return null;
  }


  const NavItem = ({ item, index }: { item: (typeof navItems)[0], index: number }) => {
    const { id, href, icon: Icon, label } = item;
    const hasNewNotifications = useHasNewNotifications();
    
    const finalHref = href;
    const isActive = activeIndex === index;

    const content = (
      <div className="relative flex flex-col items-center justify-center w-full h-full gap-1 z-10">
        <Icon className={cn(
          "h-6 w-6 transition-colors duration-200", 
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        )} />
        {id === 'notifications' && hasNewNotifications && (
            <span className="absolute top-2 right-1/2 translate-x-3.5 h-2 w-2 rounded-full bg-destructive z-20"></span>
        )}
      </div>
    );

    const commonProps = {
        'aria-label': label,
        ref: (el: any) => (itemsRef.current[index] = el),
        className: "group flex-1 h-full flex items-center justify-center transition-all duration-300"
    };
    
    if (id === 'theme-toggle') {
        return (
            <button {...commonProps} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {content}
            </button>
        )
    }
    
    return (
        <Link href={finalHref || '#'} {...commonProps}>
          {content}
        </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-20 md:hidden flex items-center justify-center px-4">
      <div 
        ref={navRef}
        className="relative h-16 w-full max-w-md mx-auto bg-card rounded-full flex items-center justify-around"
        style={{boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}}
        >
        
        <div
            className="absolute top-2 h-1.5 w-1.5 bg-primary rounded-full transition-all duration-500 ease-in-out"
            style={{
                left: indicatorStyle.left,
                opacity: indicatorStyle.opacity,
                transform: 'translateX(-50%)'
            }}
        />

        {navItems.map((item, index) => (
          <NavItem key={item.id} item={item} index={index} />
        ))}
      </div>
    </nav>
  );
}

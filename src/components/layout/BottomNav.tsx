'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Palette, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const { isPro, isAdmin, isLoading: isUserLoading } = useUserProfile();

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  
  const getActivePath = () => {
    const topLevelPaths = ['/home', '/favorites', '/colors', '/notifications'];
    if (topLevelPaths.includes(pathname)) {
        return pathname;
    }
    
    const profileRelatedPaths = ['/account', '/login/pro', '/activate/pro', '/admin/dashboard'];
    if (profileRelatedPaths.some(p => pathname.startsWith(p))) {
        if (isAdmin) return '/admin/dashboard';
        if (isPro) return '/account';
        return '/activate/pro';
    }
    return ''; // Return empty for non-nav pages like /categories/[id]
  }
  
  const activePath = getActivePath();

  const navItems = useMemo(() => [
    { id: 'home', href: '/home', icon: Home, label: 'الرئيسية' },
    { id: 'favorites', href: '/favorites', icon: Heart, label: 'المفضلة' },
    { id: 'colors', href: '/colors', icon: Palette, label: 'الألوان' },
    { id: 'notifications', href: '/notifications', icon: Bell, label: 'الإشعارات' },
    { id: 'profile', href: '/account', icon: User, label: 'حسابي' },
  ], []);

  const activeIndex = useMemo(() => {
    return navItems.findIndex(item => {
        let finalHref = item.href;
        if (item.id === 'profile') {
            if (isAdmin) finalHref = '/admin/dashboard';
            else if (isPro) finalHref = '/account';
            else finalHref = '/activate/pro';
        }
        return finalHref === activePath;
    });
  }, [navItems, activePath, isAdmin, isPro]);


  useEffect(() => {
    const timeoutId = setTimeout(() => {
        const activeItemEl = itemsRef.current[activeIndex];
        const navEl = navRef.current;

        if (activeItemEl && navEl) {
            const navRect = navEl.getBoundingClientRect();
            const itemRect = activeItemEl.getBoundingClientRect();
            setIndicatorStyle({
                left: itemRect.left - navRect.left,
                width: itemRect.width,
                opacity: 1
            });
        } else {
             setIndicatorStyle(s => ({ ...s, opacity: 0 }));
        }
    }, 50); // A small delay to ensure DOM is ready

    return () => clearTimeout(timeoutId);
  }, [activeIndex]);


  const NavItem = ({ item, index }: { item: (typeof navItems)[0], index: number }) => {
    const { id, href, icon: Icon, label } = item;
    
    let finalHref = href;
    if (id === 'profile') {
        if (isAdmin) finalHref = '/admin/dashboard';
        else if (isPro) finalHref = '/account';
        else finalHref = '/activate/pro';
    }

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
    
    return (
        <Link 
            href={finalHref || '#'}
            aria-label={label}
            ref={(el) => (itemsRef.current[index] = el)}
            className="group flex-1 h-full flex items-center justify-center transition-all duration-300"
        >
          {content}
        </Link>
    );
  };

  // Do not render the nav on certain pages
  if (isUserLoading || pathname.startsWith('/admin') || pathname === '/') {
      return null;
  }
  
  if (pathname.startsWith('/login')) {
      return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-20 md:hidden flex items-center justify-center px-4">
      <div 
        ref={navRef}
        className="relative h-16 w-full max-w-md mx-auto bg-card rounded-full flex items-center justify-around"
        style={{boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}}
        >
        
        {/* Sliding Indicator */}
        <div
            className="absolute top-0 h-full bg-primary/10 rounded-full transition-all duration-500 ease-in-out"
            style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
                opacity: indicatorStyle.opacity,
            }}
        >
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 w-5 bg-primary rounded-full" />
        </div>

        {navItems.map((item, index) => (
          <NavItem key={item.id} item={item} index={index} />
        ))}
      </div>
    </nav>
  );
}

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
  const itemsRef = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);
  
  const getActivePath = () => {
    if (pathname.startsWith('/categories')) return '/home';
    if (pathname.startsWith('/colors')) return '/colors';
    if (pathname.startsWith('/account')) return '/account';
    if (pathname.startsWith('/login')) return '/account'; // Group login pages under profile
    if (pathname.startsWith('/activate/pro')) return '/account';
    return pathname;
  }
  const activePath = getActivePath();

  const navItems = useMemo(() => [
    { id: 'home', href: '/home', icon: Home, label: 'الرئيسية' },
    { id: 'favorites', href: '/favorites', icon: Heart, label: 'المفضلة' },
    { id: 'colors', href: '/colors', icon: Palette, label: 'الألوان' },
    { id: 'notifications', href: '/notifications', icon: Bell, label: 'الإشعارات' },
    { id: 'profile', href: '/account', icon: User, label: 'حسابي' },
  ], []);

  useEffect(() => {
    // Determine the active item based on the current path
    const activeIndex = navItems.findIndex(item => item.href && activePath === item.href);
    
    // A short timeout to ensure the DOM is ready before we measure elements
    const timeoutId = setTimeout(() => {
        const activeItem = itemsRef.current[activeIndex];
        const nav = navRef.current;
        if (activeItem && nav) {
            const navRect = nav.getBoundingClientRect();
            const itemRect = activeItem.getBoundingClientRect();
            setIndicatorStyle({
                left: itemRect.left - navRect.left,
                width: itemRect.width,
                opacity: 1
            });
        } else {
            // Hide indicator if no item is active
            setIndicatorStyle(s => ({ ...s, opacity: 0 }));
        }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [activePath, navItems]);


  const NavItem = ({ item, index }: { item: (typeof navItems)[0], index: number }) => {
    const { id, href, icon: Icon, label } = item;
    
    // Determine the correct destination for the profile link
    let finalHref = href;
    if (id === 'profile') {
        if (isAdmin) finalHref = '/admin/dashboard';
        else if (isPro) finalHref = '/account';
        else finalHref = '/activate/pro'; // Send non-pro users to activation
    }

    const isActive = activePath === finalHref;

    const content = (
      <div className="relative flex flex-col items-center justify-center w-full h-full gap-1">
        <Icon className={cn(
          "h-6 w-6 z-10 transition-colors duration-200", 
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
        )} />
        <span className={cn(
            "text-[10px] font-bold transition-colors duration-200",
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
        )}>{label}</span>
        {id === 'notifications' && hasNewNotifications && (
            <span className="absolute top-1 right-1/2 translate-x-3 h-2 w-2 rounded-full bg-destructive z-20"></span>
        )}
      </div>
    );
    
    const commonProps = {
        'aria-label': label,
        className: 'group flex-1 h-full flex items-center justify-center',
        ref: (el: any) => (itemsRef.current[index] = el),
    };

    return <Link href={finalHref} {...commonProps}>{content}</Link>;
  };

  // Do not render the nav on certain pages
  if (isUserLoading || pathname.startsWith('/admin') || pathname === '/') {
      return null;
  }
  
  if (pathname.startsWith('/login')) {
      return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-24 md:hidden px-4">
      <div 
        ref={navRef}
        className="relative h-20 w-full max-w-md mx-auto bg-card rounded-t-2xl flex items-center justify-around"
        style={{boxShadow: '0 -4px 20px rgba(0,0,0,0.08)'}}
        >
        
        {/* Active item indicator dot */}
        <div
            className="absolute top-0 -translate-y-1/2 w-2 h-2 bg-primary rounded-full transition-all duration-300 ease-in-out"
            style={{
                left: `calc(${indicatorStyle.left}px + ${indicatorStyle.width / 2}px - 4px)`,
                opacity: indicatorStyle.opacity,
            }}
        />

        {navItems.map((item, index) => (
          <NavItem key={item.id} item={item} index={index} />
        ))}
      </div>
    </nav>
  );
}

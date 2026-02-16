'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Palette, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const { setTheme, resolvedTheme } = useTheme();

  // State to manage the position and size of the active indicator
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);
  
  const getActivePath = () => {
    if (pathname.startsWith('/categories')) return '/home';
    if (pathname.startsWith('/colors')) return '/colors';
    return pathname;
  }
  const activePath = getActivePath();

  const navItems = useMemo(() => [
    { id: 'home', href: '/home', icon: Home, label: 'الرئيسية' },
    { id: 'favorites', href: '/favorites', icon: Heart, label: 'المفضلة' },
    { id: 'colors', href: '/colors', icon: Palette, label: 'الألوان' },
    { id: 'notifications', href: '/notifications', icon: Bell, label: 'الإشعارات' },
    { id: 'theme-toggle', action: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'), icon: resolvedTheme === 'dark' ? Sun : Moon, label: 'الوضع' },
  ], [resolvedTheme, setTheme]);

  useEffect(() => {
    const activeIndex = navItems.findIndex(item => item.href && activePath === item.href);
    
    // Timeout to allow the DOM to render and refs to be populated correctly.
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
            // Hide indicator if no item is active (e.g., theme toggle)
            setIndicatorStyle(s => ({ ...s, opacity: 0 }));
        }
    }, 50); // A small delay can help ensure layout is calculated

    return () => clearTimeout(timeoutId);
  }, [activePath, navItems, pathname]); // Re-run when path changes


  const NavItem = ({ item, index }: { item: (typeof navItems)[0], index: number }) => {
    const { id, href, icon: Icon, action, label } = item;
    const isActive = (item.href ? activePath === item.href : false);

    const content = (
      <div className="relative flex items-center justify-center w-full h-full">
        <Icon className={cn(
          "h-6 w-6 z-10 transition-colors duration-200", 
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
        )} />
        {id === 'notifications' && hasNewNotifications && (
            <span className="absolute top-[25%] right-[25%] translate-x-1/4 -translate-y-1/4 h-2 w-2 rounded-full bg-destructive border-2 border-card z-20"></span>
        )}
      </div>
    );
    
    const commonProps = {
        'aria-label': label,
        className: 'group flex-1 h-full flex items-center justify-center',
        ref: (el: any) => (itemsRef.current[index] = el),
    };

    if (href) {
        return <Link href={href} {...commonProps}>{content}</Link>;
    }
    return <button onClick={action} {...commonProps}>{content}</button>;
  };

  if (pathname.startsWith('/admin') || pathname === '/' || pathname.startsWith('/login')) {
      return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-20 md:hidden px-4">
      <div 
        ref={navRef}
        className="relative h-16 w-full max-w-md mx-auto bg-card rounded-full shadow-lg flex items-center justify-around"
        style={{boxShadow: '0 -4px 15px rgba(0,0,0,0.08)'}}
        >
        
        {/* Active item indicator */}
        <div
            className="absolute top-1/2 -translate-y-1/2 h-10 rounded-full bg-primary/10 transition-all duration-300 ease-in-out"
            style={indicatorStyle}
        />

        {navItems.map((item, index) => (
          <NavItem key={item.id} item={item} index={index} />
        ))}
      </div>
    </nav>
  );
}

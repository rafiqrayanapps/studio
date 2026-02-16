'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});

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

  useEffect(() => {
    const activeItem = navRef.current?.querySelector(`[data-path="${activePath}"]`);
    if (activeItem instanceof HTMLElement) {
      const { offsetLeft, clientWidth } = activeItem;
      setIndicatorStyle({
        left: `${offsetLeft}px`,
        width: `${clientWidth}px`,
      });
    }
  }, [activePath, navItems]);


  const NavItem = ({ item, isActive }: { item: (typeof navItems)[0], isActive: boolean }) => {
    const { id, href, icon: Icon, action } = item;

    const content = (
      <div className="relative flex flex-col items-center justify-center gap-1 w-full h-16 z-10">
        <Icon className={cn("h-6 w-6 transition-colors", isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
        {id === 'notifications' && hasNewNotifications && (
            <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-card"></span>
        )}
        <span className={cn("absolute -bottom-1 h-1 w-1 rounded-full bg-primary transition-opacity duration-300", isActive ? 'opacity-100' : 'opacity-0')}></span>
      </div>
    );
    
    if (href) {
        return <Link href={href} className="group flex-1" data-path={href}>{content}</Link>;
    }
    return <button onClick={action} className="group flex-1" data-path={id}>{content}</button>;
  };

  if (pathname.startsWith('/admin') || pathname === '/' || pathname.startsWith('/login')) {
      return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-24 md:hidden px-4">
      <div 
        ref={navRef}
        className="relative h-full w-full max-w-md mx-auto bg-card rounded-2xl shadow-lg flex items-center justify-around"
        style={{boxShadow: '0 -4px 10px rgba(0,0,0,0.05)'}}
        >
        
        <div 
            className="absolute top-0 h-full bg-primary/10 rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)]" 
            style={indicatorStyle}
        />

        {navItems.map((item) => (
          <NavItem key={item.id} item={item} isActive={(item.href ? activePath === item.href : false)} />
        ))}
      </div>
    </nav>
  );
}

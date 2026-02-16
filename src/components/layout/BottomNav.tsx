'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Moon, Sun, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import React, { useMemo } from 'react';
import { useTheme } from 'next-themes';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const { setTheme, resolvedTheme } = useTheme();

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

  const NavItem = ({ item }: { item: (typeof navItems)[0] }) => {
    const { id, href, icon: Icon, action, label } = item;
    const isActive = (item.href ? activePath === item.href : false);

    const content = (
      <div className="relative flex items-center justify-center w-12 h-12">
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out",
          isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"
        )}>
            <div className="w-10 h-10 bg-primary/10 rounded-full"></div>
        </div>
        <Icon className={cn(
          "h-6 w-6 z-10 transition-colors duration-300", 
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
        )} />
        {id === 'notifications' && hasNewNotifications && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border border-card z-20"></span>
        )}
      </div>
    );
    
    if (href) {
        return <Link href={href} aria-label={label} className="group">{content}</Link>;
    }
    return <button onClick={action} aria-label={label} className="group">{content}</button>;
  };

  if (pathname.startsWith('/admin') || pathname === '/' || pathname.startsWith('/login')) {
      return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-20 md:hidden px-4">
      <div 
        className="relative h-16 w-full max-w-md mx-auto bg-card rounded-full shadow-lg flex items-center justify-around"
        style={{boxShadow: '0 -4px 15px rgba(0,0,0,0.08)'}}
        >
        
        {navItems.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

const NavLink = ({ href, icon: Icon, id }: { href: string; icon: React.ElementType; id: string; }) => {
    const pathname = usePathname();
    const hasNewNotifications = useHasNewNotifications();
    
    const getIsActive = () => {
        if (id === 'home') {
            return pathname === '/home' || pathname.startsWith('/categories');
        }
        return pathname.startsWith(href);
    };
    
    const isActive = getIsActive();
    const isNotificationItem = id === 'notifications';
    
    // The dot is shown if the item is active, or if it's the notification icon with new notifications.
    const showDot = isActive || (isNotificationItem && hasNewNotifications);

    return (
        <Link href={href} className="relative flex-1 group flex flex-col items-center justify-center p-3 h-full" aria-label={id}>
             <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7 transition-colors", isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-primary/90")} />
             <div className={cn(
                "absolute top-2 h-[5px] w-[5px] rounded-full bg-primary transition-all duration-300",
                showDot ? "opacity-100 scale-100" : "opacity-0 scale-0"
             )} />
        </Link>
    );
};

const ThemeToggleButton = () => {
    const { theme, setTheme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const currentTheme = theme === 'system' ? systemTheme : theme;

    const toggleTheme = () => {
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    };
    
    if (!mounted) {
      // return a placeholder to avoid layout shift and hydration mismatch
      return <div className="flex-1" />;
    }
    
    return (
        <button onClick={toggleTheme} className="relative flex-1 group flex flex-col items-center justify-center p-3 h-full" aria-label="Toggle theme">
            {currentTheme === 'dark' ? 
                <Sun className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/70 group-hover:text-primary/90 transition-colors" /> : 
                <Moon className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/70 group-hover:text-primary/90 transition-colors" />
            }
        </button>
    );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const hideOnPaths = ['/login', '/signup', '/activate', '/payment', '/pricing', '/admin'];
  const shouldHide = pathname === '/' || hideOnPaths.some(p => pathname.startsWith(p));

  if (!mounted || shouldHide) {
    return null;
  }
  
  const navItems = [
    { id: 'home', href: '/home', icon: Home },
    { id: 'favorites', href: '/favorites', icon: Heart },
    { id: 'notifications', href: '/notifications', icon: Bell },
  ];

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center items-center pointer-events-none">
        <nav className="flex items-stretch h-16 bg-card/95 backdrop-blur-sm border shadow-lg rounded-full pointer-events-auto gap-x-2 px-3">
            {/* The order is visual, from right-to-left for RTL layout. Home -> Favorites -> Notifications -> Theme */ }
            {navItems.map((item) => (
              <NavLink key={item.id} {...item} />
            ))}
            <ThemeToggleButton />
        </nav>
    </div>
  );
}

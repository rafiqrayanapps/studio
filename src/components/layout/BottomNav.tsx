'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';

const NavLink = ({ 
    href, 
    icon: Icon, 
    id, 
    isActive, 
    hasNewNotifications 
}: { 
    href: string; 
    icon: React.ElementType; 
    id: string; 
    isActive: boolean;
    hasNewNotifications: boolean;
}) => {
    return (
        <Link 
            href={href} 
            className="relative flex-1 group flex flex-col items-center justify-center h-full z-10" 
            aria-label={id}
        >
             <Icon className={cn(
                "h-6 w-6 sm:h-7 sm:w-7 transition-all duration-500 ease-out", 
                isActive ? "text-primary scale-110" : "text-muted-foreground/50 group-hover:text-primary/70"
             )} />
             
             {/* Red dot for new notifications only */}
             {id === 'notifications' && hasNewNotifications && (
                <div className="absolute top-3 right-1/2 translate-x-4 h-2 w-2 rounded-full bg-destructive border-2 border-card animate-pulse" />
             )}
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
      return <div className="flex-1" />;
    }
    
    return (
        <button 
            onClick={toggleTheme} 
            className="relative flex-1 group flex flex-col items-center justify-center h-full transition-all z-10" 
            aria-label="Toggle theme"
        >
            {currentTheme === 'dark' ? 
                <Sun className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/50 group-hover:text-yellow-500 transition-colors" /> : 
                <Moon className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
            }
        </button>
    );
}

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = useMemo(() => [
    { id: 'home', href: '/home', icon: Home },
    { id: 'favorites', href: '/favorites', icon: Heart },
    { id: 'notifications', href: '/notifications', icon: Bell },
  ], []);

  const activeIndex = useMemo(() => {
    if (pathname === '/home' || pathname.startsWith('/categories')) return 0;
    if (pathname.startsWith('/favorites')) return 1;
    if (pathname.startsWith('/notifications')) return 2;
    return -1;
  }, [pathname]);

  const hideOnPaths = ['/login', '/signup', '/activate', '/payment', '/pricing', '/admin'];
  const shouldHide = pathname === '/' || hideOnPaths.some(p => pathname.startsWith(p));

  if (!mounted || shouldHide) {
    return null;
  }

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center items-center pointer-events-none px-6">
        <nav className="relative flex items-stretch h-16 w-full max-w-md bg-card/90 backdrop-blur-xl border border-primary/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[2rem] pointer-events-auto px-2">
            
            {/* Sliding Fluid Indicator Dot */}
            {activeIndex !== -1 && (
                <div 
                    className="absolute top-0 h-full flex justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"
                    style={{ 
                        width: '25%',
                        transform: `translateX(-${activeIndex * 100}%)`,
                        right: '8px' // Offset for padding/border
                    }}
                >
                    <div className="absolute top-0 h-1.5 w-1.5 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.8)]" />
                </div>
            )}

            {navItems.map((item, idx) => (
              <NavLink 
                key={item.id} 
                {...item} 
                isActive={activeIndex === idx}
                hasNewNotifications={hasNewNotifications}
              />
            ))}
            
            <ThemeToggleButton />
        </nav>
    </div>
  );
}

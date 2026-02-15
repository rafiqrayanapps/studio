'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import { useMemo } from 'react';
import { useTheme } from 'next-themes';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Order is logical for an RTL layout: Home is first (rightmost)
  const navItems = useMemo(() => [
    { id: 'home', href: '/home', icon: Home, label: 'الرئيسية' },
    { id: 'favorites', href: '/favorites', icon: Heart, label: 'المفضلة' },
    { id: 'notifications', href: '/notifications', icon: Bell, label: 'الإشعارات' },
    { id: 'theme-toggle', icon: Moon, label: 'الوضع الليلي' },
  ], []);

  const getActiveIndex = () => {
    // Handle special cases for parent routes
    if (pathname.startsWith('/categories')) return 0; // home
    if (pathname.startsWith('/pricing') || pathname.startsWith('/subscribe') || pathname.startsWith('/about')) return -1; // No active item

    const exactMatchIndex = navItems.findIndex(item => item.href === pathname);
    return exactMatchIndex; // Will be -1 for theme toggle
  };
  
  const activeIndex = getActiveIndex();

  if (pathname.startsWith('/admin') || pathname === '/') {
      return null;
  }
  
  const NavItem = ({ item, isActive }: { item: typeof navItems[0]; isActive: boolean; }) => {
    const { id, href, icon: Icon } = item;
    const effectiveTheme = theme === 'system' ? resolvedTheme : theme;

    const content = (
        <div className="relative z-10 flex flex-col items-center justify-center text-center group flex-1 h-full">
            {id === 'theme-toggle' ? (
                effectiveTheme === 'dark' ? 
                <Sun className={cn("h-6 w-6 transition-all duration-300", isActive ? 'text-primary -translate-y-3' : 'text-muted-foreground group-hover:text-primary')} /> :
                <Moon className={cn("h-6 w-6 transition-all duration-300", isActive ? 'text-primary -translate-y-3' : 'text-muted-foreground group-hover:text-primary')} />
            ) : (
                <Icon className={cn(
                  "h-6 w-6 transition-all duration-300",
                  isActive ? 'text-primary -translate-y-3' : 'text-muted-foreground group-hover:text-primary',
                  (id === 'favorites' || id === 'home') && isActive && 'fill-primary'
                )} />
            )}
            {id === 'notifications' && hasNewNotifications && (
              <span className={cn(
                "absolute top-2 right-1/2 h-2 w-2 rounded-full bg-destructive border border-card transition-all duration-300",
                isActive ? 'translate-x-3 -translate-y-3' : 'translate-x-4'
                )}></span>
            )}
        </div>
    );
    
    if (id === 'theme-toggle') {
        return (
            <button 
                onClick={(e) => { e.preventDefault(); setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}} 
                className="flex-1 h-full"
                aria-label="Toggle theme"
            >
                {content}
            </button>
        );
    }

    return (
      <Link href={href!} className="flex-1 h-full">
        {content}
      </Link>
    );
  };

  const ITEMS_COUNT = navItems.length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-20 md:hidden px-4">
      <div className="relative h-16 w-full max-w-xs mx-auto"> 
        <div className="absolute bottom-0 w-full h-16 bg-card rounded-3xl shadow-lg"></div>
        
        <div 
          className="absolute top-0 w-[70px] h-[35px] bg-card"
          style={{
            right: activeIndex !== -1 ? `calc(${activeIndex * (100 / ITEMS_COUNT)}% + ${(100 / ITEMS_COUNT) / 2}% - 35px)` : '-100px',
            transition: 'right 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            clipPath: 'ellipse(60% 100% at 50% 0%)'
          }}
        >
        </div>
        
        <div 
          className="absolute top-[2px] w-1.5 h-1.5 bg-primary rounded-full"
          style={{
            right: activeIndex !== -1 ? `calc(${activeIndex * (100 / ITEMS_COUNT)}% + ${(100 / ITEMS_COUNT) / 2}% - 3px)` : '-100px',
            transition: 'right 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
        
        <div className="relative h-full flex justify-around items-center">
          {navItems.map((item, index) => <NavItem key={item.id} item={item} isActive={activeIndex === index} />)}
        </div>
      </div>
    </nav>
  );
}

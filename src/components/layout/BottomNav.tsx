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

  const navItems = useMemo(() => [
    { id: 'home', href: '/home', icon: Home, label: 'الرئيسية' },
    { id: 'favorites', href: '/favorites', icon: Heart, label: 'المفضلة' },
    { id: 'notifications', href: '/notifications', icon: Bell, label: 'الإشعارات' },
    { id: 'theme-toggle', icon: Moon, label: 'الوضع الليلي' },
  ], []);

  const getActiveIndex = () => {
    if (pathname.startsWith('/categories')) return 0;
    if (pathname.startsWith('/pricing') || pathname.startsWith('/subscribe') || pathname.startsWith('/about') || pathname.startsWith('/colors')) return -1;
    const exactMatchIndex = navItems.findIndex(item => item.href === pathname);
    return exactMatchIndex;
  };
  
  const activeIndex = getActiveIndex();
  
  const ITEMS_COUNT = navItems.length;
  
  const NavItem = ({ item, isActive }: { item: typeof navItems[0]; isActive: boolean; }) => {
    const { id, href, icon: Icon } = item;
    const effectiveTheme = theme === 'system' ? resolvedTheme : theme;

    const content = (
        <div className="relative z-10 flex flex-col items-center justify-center text-center group flex-1 h-full">
            {id === 'theme-toggle' ? (
                effectiveTheme === 'dark' ? 
                <Sun className={cn("h-6 w-6 transition-colors", isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} /> :
                <Moon className={cn("h-6 w-6 transition-colors", isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
            ) : (
                <Icon className={cn(
                  "h-6 w-6 transition-colors",
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                )} />
            )}
            {id === 'notifications' && hasNewNotifications && (
              <span className="absolute top-2 right-1/2 h-2 w-2 translate-x-4 rounded-full bg-destructive border border-card"></span>
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

  if (pathname.startsWith('/admin') || pathname === '/') {
      return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-14 md:hidden px-4">
      <div className="relative h-12 w-full max-w-xs mx-auto"> 
        <div className="absolute bottom-0 w-full h-12 bg-card rounded-3xl shadow-lg pointer-events-none"></div>
        
        <div 
          className="absolute top-0 w-[80px] h-[40px] bg-card pointer-events-none"
          style={{
            right: activeIndex !== -1 ? `calc(${activeIndex * (100 / ITEMS_COUNT)}% + ${(100 / ITEMS_COUNT) / 2}% - 40px)` : '-100px',
            transition: 'right 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            clipPath: 'ellipse(60% 100% at 50% 0%)'
          }}
        >
        </div>
        
        <div 
          className="absolute top-0 w-2.5 h-2.5 bg-primary rounded-full pointer-events-none"
          style={{
            right: activeIndex !== -1 ? `calc(${activeIndex * (100 / ITEMS_COUNT)}% + ${(100 / ITEMS_COUNT) / 2}% - 5px)` : '-100px',
            transition: 'right 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: `translateY(-50%) scale(${activeIndex !== -1 ? 1 : 0.5})`,
            transformOrigin: 'bottom',
          }}
        />
        
        <div className="relative h-full flex justify-around items-center">
          {navItems.map((item, index) => <NavItem key={item.id} item={item} isActive={activeIndex === index} />)}
        </div>
      </div>
    </nav>
  );
}

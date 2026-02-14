'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Moon, Sun, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useLocale } from '@/hooks/use-locale';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isMounted, setIsMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems = [
    { href: '/home', icon: Home, label: 'الرئيسية' },
    { href: '/favorites', icon: Heart, label: 'المفضلة' },
    { href: '/notifications', icon: Bell, label: 'الإشعارات' },
  ];
  
  useEffect(() => {
    const currentActiveIndex = navItems.findIndex(item => pathname.startsWith(item.href));
    setActiveIndex(currentActiveIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (pathname.startsWith('/admin') || pathname === '/') {
      return null;
  }
  
  const NavLink = ({ href, icon: Icon }: { href: string; icon: React.ElementType; }) => {
    const isActive = pathname.startsWith(href);
    const isFavorites = href === '/favorites';
    const isNotifications = href === '/notifications';
    
    return (
      <Link href={href} className="flex flex-col items-center justify-center text-center group flex-1" >
        <div className="relative">
            <Icon className={cn(
                "h-6 w-6 transition-colors group-hover:text-primary", 
                isActive ? "text-primary" : "text-muted-foreground",
                (isActive && isFavorites) && "fill-primary",
            )} />
            {isNotifications && hasNewNotifications && (
              <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-card animate-pulse"></span>
            )}
        </div>
      </Link>
    );
  };
  
  // Positions for the 3 nav items among 5 total items in the bar.
  // In RTL, items are right-to-left. [Lang, Home, Fav, Notif, Theme]
  // Centers from right: 10% (Lang), 30% (Home), 50% (Fav), 70% (Notif), 90% (Theme)
  // activeIndex corresponds to navItems, which are at bar indices 1, 2, 3.
  const indicatorPositions = ['30%', '50%', '70%'];

  const indicatorStyle = {
    right: activeIndex > -1 ? indicatorPositions[activeIndex] : '50%',
    transform: 'translateX(50%)',
    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: activeIndex > -1 ? 1 : 0,
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const toggleLocale = () => {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  };

  const ActionButton = ({ onClick, children }: { onClick: () => void, children: React.ReactNode }) => (
      <button onClick={onClick} className="flex flex-col items-center justify-center text-center group flex-1">
          <div className="relative text-muted-foreground group-hover:text-primary transition-colors">
              {children}
          </div>
      </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden px-4 pb-4">
      <div className="relative max-w-sm mx-auto">
        {/* Main Nav Container */}
        <div className="bg-card rounded-full shadow-lg flex justify-around items-center h-14 w-full p-1 relative">
            <ActionButton onClick={toggleLocale}>
              <Globe className="h-6 w-6" />
            </ActionButton>

            {navItems.map(item => <NavLink key={item.href} {...item} />)}
            
            <ActionButton onClick={toggleTheme}>
              {isMounted && resolvedTheme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </ActionButton>
        </div>
        {/* The moving dot indicator */}
        <div 
          style={indicatorStyle}
          className="absolute -top-[6px] h-3 w-3 rounded-full bg-primary"
        />
      </div>
    </div>
  );
}

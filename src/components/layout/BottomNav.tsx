'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import { useEffect, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const [isMounted, setIsMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const navItems = useMemo(() => [
    { href: '/home', icon: Home, label: 'الرئيسية' },
    { href: '/favorites', icon: Heart, label: 'المفضلة' },
    { href: '/notifications', icon: Bell, label: 'الإشعارات' },
  ], []);
  
  const activeIndex = useMemo(() => {
    return navItems.findIndex(item => pathname.startsWith(item.href));
  }, [pathname, navItems]);


  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'translateX(-50%)'
  });

  useEffect(() => {
    if (!isMounted) return;

    const isRTL = true;
    // Total items = 4 (3 nav + 1 action)
    // Positions: 12.5%, 37.5%, 62.5%, 87.5%
    // In RTL, it's reversed. The nav items are on the right.
    const indicatorPositionsRTL = ['87.5%', '62.5%', '37.5%'];
    const positions = indicatorPositionsRTL;
    
    if (activeIndex > -1) {
        setIndicatorStyle(prev => ({
            ...prev,
            right: positions[activeIndex],
            opacity: 1,
            transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }));
    } else {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [activeIndex, isMounted]);


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
  
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
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
        <div 
          style={indicatorStyle}
          className="absolute -top-[6px] h-3 w-3 rounded-full bg-primary"
        />
        <div className="bg-card rounded-full shadow-lg flex justify-around items-center h-14 w-full p-1 relative">
            {navItems.map(item => <NavLink key={item.href} {...item} />)}
            
            <ActionButton onClick={toggleTheme}>
              {isMounted && resolvedTheme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </ActionButton>
        </div>
      </div>
    </div>
  );
}

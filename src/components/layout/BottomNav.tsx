'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import { useMemo } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();

  const navItems = useMemo(() => [
    { href: '/home', icon: Home, label: 'الرئيسية' },
    { href: '/favorites', icon: Heart, label: 'المفضلة' },
    { href: '/notifications', icon: Bell, label: 'الإشعارات' },
  ], []);

  const getActiveIndex = () => {
    if (pathname.startsWith('/categories')) return 0; // Default to home for sub-pages

    const exactMatchIndex = navItems.findIndex(item => item.href === pathname);
    if (exactMatchIndex !== -1) return exactMatchIndex;

    const parentMatches = navItems
        .map((item, index) => ({...item, index}))
        .filter(item => item.href.length > 1 && pathname.startsWith(item.href));
        
    if (parentMatches.length > 0) {
        return parentMatches.sort((a,b) => b.href.length - a.href.length)[0].index;
    }

    return 0; // Default to home
  };
  
  const activeIndex = getActiveIndex();

  if (pathname.startsWith('/admin') || pathname === '/' || pathname.startsWith('/login')) {
      return null;
  }
  
  const NavLink = ({ item, isActive }: { item: typeof navItems[0]; isActive: boolean; }) => {
    const { href, icon: Icon } = item;
    return (
      <Link href={href} className="relative z-10 flex flex-col items-center justify-center text-center group flex-1 h-full">
        <Icon className={cn(
          "h-7 w-7 transition-all duration-300",
          isActive ? 'text-primary -translate-y-3' : 'text-muted-foreground group-hover:text-primary',
          (href === '/favorites' || href === '/home') && isActive && 'fill-primary'
        )} />
        {href === '/notifications' && hasNewNotifications && (
          <span className={cn(
            "absolute top-2 right-1/2 h-2 w-2 rounded-full bg-destructive border border-card transition-all duration-300",
            isActive ? 'translate-x-3 -translate-y-3' : 'translate-x-4'
            )}></span>
        )}
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-20 md:hidden px-4" dir="ltr">
      <div className="relative h-16 w-full max-w-[280px] mx-auto">
        <div className="absolute bottom-0 w-full h-16 bg-card rounded-3xl shadow-lg"></div>
        
        <div 
          className="absolute top-0 w-[70px] h-[35px] bg-card transition-all duration-300 ease-out"
          style={{
            left: activeIndex !== -1 ? `calc(${activeIndex * (100 / 3)}% + ${(100 / 3) / 2}% - 35px)` : '-100px',
            clipPath: 'ellipse(50% 100% at 50% 0%)'
          }}
        >
        </div>
        
        <div 
          className="absolute top-[3px] w-1.5 h-1.5 bg-primary rounded-full transition-all duration-300 ease-out"
          style={{
            left: activeIndex !== -1 ? `calc(${activeIndex * (100 / 3)}% + ${(100 / 3) / 2}% - 3px)` : '-100px',
          }}
        />

        <div className="relative h-full flex justify-around items-center">
          {navItems.map((item, index) => <NavLink key={item.href} item={item} isActive={activeIndex === index} />)}
        </div>
      </div>
    </nav>
  );
}

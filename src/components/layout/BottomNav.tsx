'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Heart, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import { useMemo } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();

  const navItems = useMemo(() => [
    { href: '/home', icon: Home, label: 'الرئيسية' },
    { href: '/colors', icon: Search, label: 'الألوان' },
    { href: '/favorites', icon: Heart, label: 'المفضلة' },
    { href: '/notifications', icon: Bell, label: 'الإشعارات' },
    { href: '/login', icon: User, label: 'حسابي' },
  ], []);

  const getActiveIndex = () => {
    if (pathname.startsWith('/categories')) return 0;

    const exactMatchIndex = navItems.findIndex(item => item.href === pathname);
    if (exactMatchIndex !== -1) return exactMatchIndex;

    const parentMatches = navItems
        .map((item, index) => ({...item, index}))
        .filter(item => item.href.length > 1 && pathname.startsWith(item.href));
        
    if (parentMatches.length > 0) {
        return parentMatches.sort((a,b) => b.href.length - a.href.length)[0].index;
    }

    return -1;
  };
  
  const activeIndex = getActiveIndex();

  if (pathname.startsWith('/admin') || pathname === '/') {
      return null;
  }

  const NavLink = ({ item, isActive }: { item: typeof navItems[0]; isActive: boolean; }) => {
    const { href, icon: Icon, label } = item;
    return (
      <Link href={href} className="relative z-10 flex flex-col items-center justify-center text-center group flex-1 gap-1 h-full py-2">
        <Icon className={cn(
          "h-6 w-6 transition-colors",
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary',
          href === '/favorites' && isActive && 'fill-primary'
        )} />
        <span className={cn(
          "text-xs font-medium transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
        )}>
          {label}
        </span>
        {href === '/notifications' && hasNewNotifications && (
          <span className="absolute top-1 right-1/2 translate-x-3 h-2 w-2 rounded-full bg-destructive border border-card"></span>
        )}
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-20 md:hidden px-4" dir="ltr">
      <div className="relative h-16 w-full max-w-sm mx-auto">
        {/* The main bar background */}
        <div className="absolute bottom-0 w-full h-16 bg-card rounded-full shadow-lg"></div>
        
        {/* The notch element using clip-path for the curve */}
        <div 
          className="absolute top-0 w-[70px] h-[35px] bg-card transition-all duration-300 ease-out"
          style={{
            left: activeIndex !== -1 ? `calc(${activeIndex * 20}% + 10% - 35px)` : '-100px',
            clipPath: 'ellipse(50% 100% at 50% 0%)'
          }}
        >
        </div>
        
        {/* Active item indicator dot */}
        <div 
          className="absolute top-[3px] w-1.5 h-1.5 bg-primary rounded-full transition-all duration-300 ease-out"
          style={{
            left: activeIndex !== -1 ? `calc(${activeIndex * 20}% + 10% - 3px)` : '-100px',
          }}
        />

        <div className="relative h-full flex justify-around items-center">
          {navItems.map((item, index) => <NavLink key={item.href} item={item} isActive={activeIndex === index} />)}
        </div>
      </div>
    </nav>
  );
}

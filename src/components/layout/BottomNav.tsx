'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import { useEffect, useState } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const [activeIndex, setActiveIndex] = useState(-1);

  // Order for RTL display
  const navItems = [
    { href: '/home', icon: Home, label: 'الرئيسية' },
    { href: '/favorites', icon: Heart, label: 'المفضلة' },
    { href: '/notifications', icon: Bell, label: 'الإشعارات' },
  ];
  
  useEffect(() => {
    const currentActiveIndex = navItems.findIndex(item => pathname.startsWith(item.href));
    setActiveIndex(currentActiveIndex);
  // The navItems array is stable, so we only depend on pathname.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Hide on admin pages or splash screen
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
  
  const indicatorPositions = ['16.66%', '50%', '83.33%'];
  const indicatorStyle = {
    right: activeIndex > -1 ? indicatorPositions[activeIndex] : '50%', // Default to middle
    transform: 'translateX(50%)',
    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: activeIndex > -1 ? 1 : 0,
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden px-6 pb-4" dir="rtl">
      <div className="relative w-60 mx-auto">
        
        <div className="bg-card rounded-full shadow-lg flex justify-around items-center h-14 w-full p-1 relative">
            {navItems.map(item => <NavLink key={item.href} {...item} />)}
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

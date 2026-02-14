'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Bell, Moon, Sun, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasNewNotifications } from '@/hooks/use-has-new-notifications';
import { useEffect, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useLocale } from '@/hooks/use-locale';

export default function BottomNav() {
  const pathname = usePathname();
  const hasNewNotifications = useHasNewNotifications();
  const [isMounted, setIsMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();

  const navItems = useMemo(() => [
    { href: '/home', icon: Home, label: t('home') },
    { href: '/favorites', icon: Heart, label: t('favorites') },
    { href: '/notifications', icon: Bell, label: t('notifications') },
  ], [t]);
  
  const activeIndex = useMemo(() => {
    return navItems.findIndex(item => pathname.startsWith(item.href));
  }, [pathname, navItems]);


  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({
    opacity: 0,
  });

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted
    // and the locale is hydrated from localStorage. This prevents hydration mismatch.
    const isRTL = locale === 'ar';

    // Positions for Home, Favorites, Notifications
    const indicatorPositionsLTR = ['10%', '30%', '50%'];
    const indicatorPositionsRTL = ['90%', '70%', '50%'];

    const positions = isRTL ? indicatorPositionsRTL : indicatorPositionsLTR;

    if (activeIndex > -1) {
        const positionProp = isRTL ? 'right' : 'left';
        const positionValue = positions[activeIndex];
        const transformValue = 'translateX(-50%)'; // The dot is centered on the position

        setIndicatorStyle({
            [positionProp]: positionValue,
            transform: transformValue,
            opacity: 1,
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        });
    } else {
        // Hide indicator if no item is active
        setIndicatorStyle({ opacity: 0 });
    }
  }, [activeIndex, locale]);


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
        {/* The moving dot indicator */}
        <div 
          style={indicatorStyle}
          className="absolute -top-[6px] h-3 w-3 rounded-full bg-primary"
        />
        {/* Main Nav Container */}
        <div className="bg-card rounded-full shadow-lg flex justify-around items-center h-14 w-full p-1 relative">
            {navItems.map(item => <NavLink key={item.href} {...item} />)}

            <ActionButton onClick={toggleLocale}>
              <Globe className="h-6 w-6" />
            </ActionButton>
            
            <ActionButton onClick={toggleTheme}>
              {isMounted && resolvedTheme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </ActionButton>
        </div>
      </div>
    </div>
  );
}

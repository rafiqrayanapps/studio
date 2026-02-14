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
  
  useEffect(() => {
    setIsMounted(true);
  }, []);


  if (pathname.startsWith('/admin') || pathname === '/') {
      return null;
  }
  
  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string; }) => {
    const isActive = pathname.startsWith(href);
    const isFavorites = href === '/favorites';
    
    return (
      <Link href={href} className="flex flex-col items-center justify-center text-center group flex-1 gap-1 py-1" >
        <div className="relative">
            <Icon className={cn(
                "h-6 w-6 transition-colors", 
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary",
                (isActive && isFavorites) && "fill-primary",
            )} />
            {href === '/notifications' && hasNewNotifications && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-card animate-pulse"></span>
            )}
        </div>
         <span className={cn(
            "text-xs font-medium transition-colors",
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
        )}>
            {label}
        </span>
      </Link>
    );
  };
  
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const ActionButton = ({ onClick, children, label }: { onClick: () => void, children: React.ReactNode, label: string }) => (
      <button onClick={onClick} className="flex flex-col items-center justify-center text-center group flex-1 gap-1 py-1">
          <div className="relative text-muted-foreground group-hover:text-primary transition-colors">
              {children}
          </div>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
            {label}
        </span>
      </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden px-4 pb-4">
      <div className="relative max-w-sm mx-auto bg-card rounded-full shadow-lg flex justify-around items-center h-16 w-full p-1">
            {navItems.map(item => <NavLink key={item.href} {...item} />)}
            
            <ActionButton onClick={toggleTheme} label={isMounted && resolvedTheme === 'dark' ? 'فاتح' : 'داكن'}>
              {isMounted && resolvedTheme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </ActionButton>
      </div>
    </div>
  );
}

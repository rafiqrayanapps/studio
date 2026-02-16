'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import Link from 'next/link';
import { 
  Menu,
  ChevronLeft,
  Share2,
  Star,
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { ShareLinkConfig } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import UserProfileButton from './UserProfileButton';

const HeaderComponent = ({ title, subtitle, children, showMenu = true }: { title?: string; subtitle?: string; children?: React.ReactNode, showMenu?: boolean }) => {
  const firestore = useFirestore();
  const [canShare, setCanShare] = React.useState(false);

  React.useEffect(() => {
    // This check ensures navigator is accessed only on the client side.
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  const shareLinkRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'shareLink') : null, [firestore]);
  const { data: shareLinkConfig } = useDoc<ShareLinkConfig>(shareLinkRef);
  
  const navItems = [
    { href: '/home', label: "الرئيسيه" },
    { href: '/colors', label: "منسق الالوان" },
    { href: '/about', label: "حول التطبيق" },
  ];

  const handleShare = async () => {
    if (canShare && shareLinkConfig?.enabled && shareLinkConfig.url) {
      try {
        await navigator.share({
          title: "رفيق المصمم",
          text: shareLinkConfig.text || "مشاركة التطبيق",
          url: shareLinkConfig.url,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  return (
    <header className={cn(
        "w-full text-primary-foreground pt-4 pb-20 rounded-b-[2.5rem]",
        "bg-primary"
        )}>
      <div className="container mx-auto max-w-4xl px-4">
        <div className="flex h-16 items-center">
          <div className="flex-1 flex items-center justify-start">
             {showMenu ? <Sheet>
              <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 rounded-2xl">
                      <Menu className="h-7 w-7" />
                  </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-[85vw] max-w-sm bg-transparent border-0">
                 <SheetHeader className="sr-only">
                    <SheetTitle>القائمة الرئيسية</SheetTitle>
                    <SheetDescription>
                      روابط التنقل الرئيسية في التطبيق
                    </SheetDescription>
                  </SheetHeader>
                 <div className="flex flex-col h-full bg-primary">
                  {/* Header part */}
                  <div className="flex items-center justify-center h-40">
                    <div className="text-center text-primary-foreground">
                      <h2 className="text-3xl font-bold">رفيق المصمم</h2>
                      <div className="mt-1 bg-primary-foreground text-primary px-4 py-1 rounded-lg inline-block">
                        <h3 className="text-2xl font-bold tracking-widest">المصمم</h3>
                      </div>
                    </div>
                  </div>
                  
                  {/* Main content part */}
                  <div className="flex-1 bg-card text-card-foreground rounded-t-[2.5rem] p-6 flex flex-col">
                    <nav className="flex-1">
                      <ul className="space-y-2">
                        
                        {navItems.map((item) => (
                          <li key={item.label}>
                            <Link href={item.href} className="block group">
                                <SheetClose asChild>
                                    <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                                    <span className={cn("font-semibold text-lg", item.icon && "text-primary")}>{item.label}</span>
                                    {item.icon ? <item.icon className="h-5 w-5 text-primary" /> : <ChevronLeft className="h-5 w-5 text-muted-foreground" />}
                                    </div>
                                </SheetClose>
                            </Link>
                          </li>
                        ))}
                        
                        <UserProfileButton />
                        
                        {shareLinkConfig?.enabled && canShare && (
                           <li>
                              <div className="block group cursor-pointer" onClick={handleShare}>
                                <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                                  <span className="font-semibold text-lg">مشاركة التطبيق</span>
                                  <Share2 className="h-5 w-5 text-muted-foreground" />
                                </div>
                              </div>
                           </li>
                        )}
                      </ul>
                    </nav>
                    
                    {/* Footer part */}
                    <div>
                       <SheetClose asChild>
                          <div className="block group cursor-pointer">
                            <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                              <span className="font-semibold text-lg">رجوع</span>
                              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                        </SheetClose>
                    </div>
                  </div>
                </div>
              </SheetContent>
          </Sheet> : <div className="w-10"/>}
          </div>
          <div className="flex flex-col text-center">
            { title && <h1 className="text-2xl font-bold">{title}</h1> }
            {subtitle && <p className="text-sm opacity-80">{subtitle}</p>}
          </div>
           <div className="flex-1 flex items-center justify-end">
            {children}
          </div>
        </div>
      </div>
    </header>
  );
}

const Header = React.memo(HeaderComponent);
Header.displayName = 'Header';

export default Header;

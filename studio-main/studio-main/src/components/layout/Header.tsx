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
  Brush,
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { ShareLinkConfig, RequestDesignConfig } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import UserProfileButton from './UserProfileButton';
import ReferralDialog from './ReferralDialog';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  showMenu?: boolean;
  showPoints?: boolean;
}

const HeaderComponent = ({ 
  title, 
  subtitle, 
  children, 
  showMenu = true,
  showPoints = false 
}: HeaderProps) => {
  const firestore = useFirestore();
  const [canShare, setCanShare] = React.useState(false);

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  const shareLinkRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'shareLink') : null, [firestore]);
  const { data: shareLinkConfig } = useDoc<ShareLinkConfig>(shareLinkRef);
  
  const requestDesignRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'requestDesign') : null, [firestore]);
  const { data: requestDesignConfig } = useDoc<RequestDesignConfig>(requestDesignRef);
  
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
        "bg-primary relative"
        )}>
      <div className="container mx-auto max-w-4xl px-4">
        <div className="flex h-16 items-center">
          {/* Right Side: Menu (in RTL) */}
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
                    <SheetDescription>روابط التنقل الرئيسية في التطبيق</SheetDescription>
                  </SheetHeader>
                 <div className="flex flex-col h-full bg-primary">
                  <div className="flex items-center justify-center h-40">
                    <div className="text-center">
                        <div className="font-bold text-4xl flex flex-col items-center gap-2 leading-tight">
                            <span className="text-primary-foreground">رفيق</span>
                            <span className="bg-white text-primary rounded-2xl px-4 py-1">المصمم</span>
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-card text-card-foreground rounded-t-[2.5rem] p-6 flex flex-col">
                    <nav className="flex-1">
                      <ul className="space-y-2">
                        {navItems.map((item) => (
                          <li key={item.label}>
                            <Link href={item.href} className="block group">
                                <SheetClose asChild>
                                    <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                                    <span className="font-semibold text-lg">{item.label}</span>
                                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </SheetClose>
                            </Link>
                          </li>
                        ))}
                        
                        {requestDesignConfig?.enabled && (
                           <li>
                             <a href={requestDesignConfig.url} target="_blank" rel="noopener noreferrer" className="block group cursor-pointer">
                               <SheetClose asChild>
                                  <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                                    <span className="font-semibold text-lg">اطلب تصميمك</span>
                                    <Brush className="h-5 w-5 text-muted-foreground" />
                                  </div>
                               </SheetClose>
                             </a>
                           </li>
                        )}

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

          {/* Center: Title */}
          <div className="flex flex-col text-center">
            { title && <h1 className="text-xl font-bold">{title}</h1> }
            {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
          </div>

          {/* Left Side: Points & Referral Dialog Trigger */}
           <div className="flex-1 flex items-center justify-end">
            {showPoints && <ReferralDialog />}
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

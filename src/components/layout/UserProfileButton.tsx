'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import Link from 'next/link';
import { Crown, Loader2, LogOut, Shield, User as UserIcon, Key, ChevronLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/firebase';

export default function UserProfileButton() {
    const { user, isPro, isAdmin, isLoading } = useUserProfile();
    const auth = useAuth();

    if (isLoading) {
        return (
            <li>
                <div className="flex items-center justify-center p-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            </li>
        );
    }

    if (isAdmin) {
        return (
             <li>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between h-auto p-3 hover:bg-secondary">
                            <span className="font-semibold text-lg">حساب المدير</span>
                             <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start">
                        <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                         <Link href="/admin/dashboard">
                            <DropdownMenuItem>
                                لوحة التحكم
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem onClick={() => auth.signOut()}>
                            <LogOut className="ml-2 h-4 w-4" />
                            <span>تسجيل الخروج</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </li>
        )
    }

    if (isPro) {
        return (
            <li>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="w-full justify-between h-auto p-3 hover:bg-secondary">
                            <span className="font-semibold text-lg">حساب برو</span>
                            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start" dir="rtl">
                        <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                        <Link href="/account">
                            <DropdownMenuItem>
                                <UserIcon className="ml-2 h-4 w-4" />
                                <span>حسابي</span>
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => auth.signOut()}>
                            <LogOut className="ml-2 h-4 w-4" />
                            <span>تسجيل الخروج</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </li>
        );
    }
    
    // Free user or visitor
    return (
        <>
            <li>
                <SheetClose asChild>
                    <Link href="/pricing" className="block group">
                        <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                            <span className="font-semibold text-lg">الاشتراك</span>
                            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>
                </SheetClose>
            </li>
            <li>
                <SheetClose asChild>
                    <Link href="/login" className="block group">
                        <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                            <span className="font-semibold text-lg">تسجيل الدخول</span>
                            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>
                </SheetClose>
            </li>
        </>
    );
}

    
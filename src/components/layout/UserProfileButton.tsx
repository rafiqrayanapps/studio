'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import Link from 'next/link';
import { Crown, Loader2, LogOut, Shield, Star, User as UserIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/firebase';

export default function UserProfileButton() {
    const { user, isPro, isAdmin, isLoading } = useUserProfile();
    const auth = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        return (
            <SheetClose asChild>
                 <Link href="/login" className="block group">
                    <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                        <span className="font-semibold text-lg">الدخول</span>
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                </Link>
            </SheetClose>
        );
    }
    
    if (isAdmin) {
        return (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between h-auto p-3 hover:bg-secondary">
                        <div className='flex items-center gap-2'>
                           <Shield className="h-5 w-5 text-green-500" />
                           <span className="font-semibold text-lg">حساب المدير</span>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                    <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
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
        )
    }

    if (isPro) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                     <Button variant="ghost" className="w-full justify-between h-auto p-3 hover:bg-secondary">
                        <div className='flex items-center gap-2'>
                           <Crown className="h-5 w-5 text-yellow-500" />
                           <span className="font-semibold text-lg">حساب برو نشط</span>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                    <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                     <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <span>صلاحية دائمة</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => auth.signOut()}>
                        <LogOut className="ml-2 h-4 w-4" />
                        <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }
    
    // Free user
    return (
        <SheetClose asChild>
            <Link href="/pricing" className="block group">
                <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                    <span className="font-semibold text-lg text-yellow-500">الترقية للبرو</span>
                    <Star className="h-5 w-5 text-yellow-500" />
                </div>
            </Link>
        </SheetClose>
    );
}
